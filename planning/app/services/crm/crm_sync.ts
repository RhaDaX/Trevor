import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import planningConfig from '#config/planning'
import Client from '#models/client'
import SyncState from '#models/sync_state'
import Task from '#models/task'
import User from '#models/user'
import clientMatcher from '#services/client_matcher'
import { adapterFor, allSources, crmConfig } from '#services/crm/registry'
import type { ClientData, DateData, RawRow } from '#services/crm/types'

export interface CrmEvent {
  source: string
  /** client.upserted | client.deleted | date.upserted | date.deleted */
  event: string
  /** Ancien format : type de date hors de `data` (accepté, `data.kind` prime) */
  kind?: string
  data: RawRow
}

/**
 * Applique au miroir local les changements venant des CRM (webhook ou synchro)
 */
export class CrmSync {
  async applyClient(source: string, data: ClientData) {
    const config = crmConfig(source)
    if (!config) throw new Error(`CRM inconnu : ${source}`)
    const client = await Client.updateOrCreate(
      { source, externalId: data.externalId },
      {
        company: config.company,
        name: data.name,
        emails: data.emails,
        domains: data.domains,
        phone: data.phone,
        crmUrl: data.crmUrl,
        archived: data.deleted,
        syncedAt: DateTime.now(),
      }
    )
    clientMatcher.invalidate()
    return client
  }

  /**
   * Tâche automatique depuis une date utile du CRM, identifiée par
   * source + external_id : jamais de doublon, mise à jour si la date bouge.
   */
  async applyDate(source: string, data: DateData) {
    const owner = await User.query().orderBy('id', 'asc').first()
    if (!owner) return null

    const sourceRef = `${source}:${data.externalId}`
    const existing = await Task.query()
      .where('user_id', owner.id)
      .where('source_ref', sourceRef)
      .first()

    if (data.deleted || !data.date) {
      if (existing?.isOpen) {
        existing.status = 'cancelled'
        await existing.save()
      }
      return existing
    }

    const client = data.clientExternalId
      ? await Client.query()
          .where('source', source)
          .where('external_id', data.clientExternalId)
          .first()
      : null

    const dueAt = data.dateOnly
      ? DateTime.fromObject(
          {
            year: data.date.year,
            month: data.date.month,
            day: data.date.day,
            hour: planningConfig.defaultHour,
          },
          { zone: owner.timezone }
        ).toUTC()
      : data.date.toUTC()
    const remindAt = data.remindDaysBefore ? dueAt.minus({ days: data.remindDaysBefore }) : null

    const task = existing ?? new Task()
    const dateMoved = !existing || +(existing.dueAt ?? 0) !== +dueAt

    task.merge({
      userId: owner.id,
      sourceRef,
      origin: 'crm',
      title: data.title,
      clientId: client?.id ?? null,
      company: client ? null : (crmConfig(source)?.company ?? null),
      dueAt,
      remindAt,
      allDay: data.dateOnly,
    })

    if (data.done) {
      if (task.isOpen || !existing) {
        task.status = 'done'
        task.doneAt = DateTime.now()
      }
    } else if (!existing) {
      task.status = 'todo'
    } else if (dateMoved) {
      // Nouvelle date (renouvellement reconduit…) : la tâche revit
      task.status = 'todo'
      task.doneAt = null
      task.snoozedUntil = null
      task.lastNotifiedAt = null
    }

    await task.save()
    return task
  }

  async handleEvent(event: CrmEvent) {
    const adapter = adapterFor(event.source)
    if (!adapter) throw new Error(`CRM inconnu : ${event.source}`)
    const [type, action] = event.event.split('.')

    if (type === 'client') {
      const data = adapter.mapClient(event.data)
      if (action === 'deleted') data.deleted = true
      await this.applyClient(event.source, data)
    } else if (type === 'date') {
      const data = adapter.mapDate({ ...event.data, kind: event.data.kind ?? event.kind })
      if (action === 'deleted') data.deleted = true
      await this.applyDate(event.source, data)
    } else {
      throw new Error(`événement inconnu : ${event.event}`)
    }

    const state = await SyncState.for(event.source)
    state.lastEventAt = DateTime.now()
    await state.save()
  }

  /**
   * Filet de sécurité de nuit, par l'API du CRM : delta depuis la dernière synchro.
   * En mode complet, archive aussi les clients disparus du CRM.
   */
  async syncSource(source: string, options: { full?: boolean } = {}) {
    const adapter = adapterFor(source)
    if (!adapter) throw new Error(`CRM inconnu : ${source}`)
    const state = await SyncState.for(source)
    const startedAt = DateTime.now()
    const since = options.full ? null : state.lastFullSync

    try {
      const clients = await adapter.fetchClients(since)
      const seen = new Set<string>()
      for (const raw of clients) {
        const data = adapter.mapClient(raw)
        seen.add(data.externalId)
        await this.applyClient(source, data)
      }
      if (options.full) {
        const query = Client.query().where('source', source).where('archived', false)
        if (seen.size) query.whereNotIn('external_id', [...seen])
        await query.update({ archived: true })
        clientMatcher.invalidate()
      }

      const dates = await adapter.fetchDates(since)
      for (const row of dates) {
        await this.applyDate(source, adapter.mapDate(row))
      }

      state.lastFullSync = startedAt
      state.lastError = null
      await state.save()
      logger.info({ source, clients: clients.length, dates: dates.length }, 'synchro CRM terminée')
      return { clients: clients.length, dates: dates.length }
    } catch (error: any) {
      state.lastError = `${DateTime.now().toISO()} — ${error?.message ?? error}`
      await state.save()
      throw error
    }
  }

  async syncAll(options: { full?: boolean } = {}) {
    const results: Record<string, unknown> = {}
    for (const source of allSources()) {
      const config = crmConfig(source)
      if (!config?.apiUrl || !config.apiToken) {
        results[source] = 'API du CRM non configurée'
        continue
      }
      try {
        results[source] = await this.syncSource(source, options)
      } catch (error: any) {
        logger.error({ err: error, source }, 'échec de la synchro CRM')
        results[source] = `erreur : ${error?.message ?? error}`
      }
    }
    return results
  }
}

const crmSync = new CrmSync()
export default crmSync
