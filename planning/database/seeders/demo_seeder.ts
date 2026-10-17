import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import planningConfig from '#config/planning'
import User from '#models/user'
import Client from '#models/client'
import Task from '#models/task'
import Attachment from '#models/attachment'
import SyncState from '#models/sync_state'
import {
  DEMO_CLIENTS,
  DEMO_EXTRA_RANDOM_TASKS,
  DEMO_TASKS,
  type DemoTask,
  type When,
} from '#database/demo_data'

/** Générateur pseudo-aléatoire déterministe : la démo est identique à chaque seed */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Données de démonstration (développement uniquement), relançable :
 *   node ace db:seed
 * Remet à zéro les tâches du compte de démo et les clients des deux CRM.
 */
export default class DemoSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    if (app.inProduction) return
    const user =
      (await User.findBy('email', 'nathan@example.com')) ??
      (await User.create({
        email: 'nathan@example.com',
        password: 'secret123',
        fullName: 'Nathan',
      }))
    const tz = user.timezone
    const now = DateTime.now().setZone(tz)

    const at = (when: When): { date: DateTime; allDay: boolean } => {
      if ('minutes' in when) return { date: now.plus({ minutes: when.minutes }), allDay: false }
      const day = now.plus({ days: when.days })
      if ('allDay' in when)
        return {
          date: day.set({ hour: planningConfig.defaultHour, minute: 0, second: 0, millisecond: 0 }),
          allDay: true,
        }
      const [hour, minute] = when.at.split(':').map(Number)
      return { date: day.set({ hour, minute, second: 0, millisecond: 0 }), allDay: false }
    }

    // « Fait il y a N minutes » reste dans la journée, même juste après minuit
    const doneAt = (ago: { days: number } | { minutes: number }) => {
      const date = now.minus(ago)
      return 'minutes' in ago && date < now.startOf('day')
        ? now.startOf('day').plus({ minutes: 1 })
        : date
    }

    // --- Remise à zéro ------------------------------------------------------
    const existing = await Task.query().where('user_id', user.id).select('id')
    for (const { id } of existing) {
      await rm(join(app.makePath('storage/attachments'), String(id)), {
        recursive: true,
        force: true,
      })
    }
    await Task.query().where('user_id', user.id).delete()

    // --- Clients des deux CRM -------------------------------------------------
    const keys = DEMO_CLIENTS.map((c) => c.key)
    await Client.query()
      .whereIn('source', ['crm_a', 'crm_b'])
      .whereNotIn('external_id', keys)
      .delete()
    const clients = new Map<string, Client>()
    for (const c of DEMO_CLIENTS) {
      const source = c.company === 'a' ? 'crm_a' : 'crm_b'
      const template = planningConfig.crms.find((crm) => crm.source === source)?.urlTemplate
      const client = await Client.updateOrCreate(
        { source, externalId: c.key },
        {
          company: c.company,
          name: c.name,
          emails: [c.email],
          domains: c.domain ? [c.domain] : [],
          phone: c.phone ?? null,
          crmUrl: template?.replace('{id}', c.key) ?? null,
          archived: false,
          syncedAt: now.minus({ hours: 6 }),
        }
      )
      clients.set(c.key, client)
    }

    // --- Tâches ---------------------------------------------------------------
    const create = async (t: DemoTask) => {
      const due = t.due ? at(t.due) : null
      const status = t.status ?? (due && !t.uncertain ? 'todo' : 'inbox')
      const overdue = due && due.date < now && (status === 'todo' || status === 'inbox')
      const task = await Task.create({
        userId: user.id,
        clientId: t.client ? clients.get(t.client)!.id : null,
        company: t.client ? null : (t.company ?? null),
        title: t.title,
        notes: t.notes ?? null,
        dueAt: due?.date ?? null,
        allDay: due?.allDay ?? false,
        remindAt: t.remind ? at(t.remind).date : null,
        snoozedUntil: t.snooze ? at(t.snooze).date : null,
        status,
        priority: t.priority ?? 'normal',
        origin: t.origin ?? 'app',
        recurrenceRule: t.recurrence ?? null,
        clientUncertain: Boolean(t.uncertain),
        sourceRef: t.crmRef ?? null,
        doneAt:
          status === 'done' || status === 'cancelled'
            ? t.doneAgo
              ? doneAt(t.doneAgo)
              : (due?.date ?? now)
            : null,
        // Les retards ont déjà sonné : pas de rafale de notifications au premier passage du worker
        lastNotifiedAt: overdue ? due!.date : null,
      })
      if (t.attachment) {
        const dir = join(app.makePath('storage/attachments'), String(task.id))
        await mkdir(dir, { recursive: true })
        const relative = join(String(task.id), `1-${t.attachment.filename}`)
        await writeFile(join(app.makePath('storage/attachments'), relative), t.attachment.content)
        await Attachment.create({
          taskId: task.id,
          filename: t.attachment.filename,
          path: relative,
          mime: t.attachment.mime,
          size: Buffer.byteLength(t.attachment.content),
        })
      }
    }

    for (const t of DEMO_TASKS) await create(t)

    // Petites tâches réparties sur les deux mois à venir, pour remplir le calendrier
    const random = prng(42)
    const pool = DEMO_CLIENTS.filter((c) => !DEMO_TASKS.some((t) => t.client === c.key))
    for (let i = 0; i < 18; i++) {
      const client = pool[Math.floor(random() * pool.length)]
      await create({
        title: DEMO_EXTRA_RANDOM_TASKS[Math.floor(random() * DEMO_EXTRA_RANDOM_TASKS.length)],
        client: client.key,
        due: {
          days: 2 + Math.floor(random() * 58),
          at: `${9 + Math.floor(random() * 9)}:${random() < 0.5 ? '00' : '30'}`,
        },
        priority: random() < 0.12 ? 'high' : 'normal',
        origin: (['app', 'siri', 'mac', 'mail'] as const)[Math.floor(random() * 4)],
      })
    }

    // --- État de la synchro des CRM -------------------------------------------
    for (const [source, eventAgo] of [
      ['crm_a', 12],
      ['crm_b', 47],
    ] as const) {
      const state = await SyncState.for(source)
      state.lastFullSync = now.startOf('day').plus({ hours: 3 }).toUTC()
      state.lastEventAt = now.minus({ minutes: eventAgo }).toUTC()
      state.lastError = null
      await state.save()
    }
  }
}
