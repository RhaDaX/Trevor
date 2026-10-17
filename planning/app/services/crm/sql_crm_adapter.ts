import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import planningConfig, { type CrmSourceConfig } from '#config/planning'
import type { CrmMapping } from '#config/crm'
import type { ClientData, CrmAdapter, DateData, RawRow } from '#services/crm/types'

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g

function toList(value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) return value.flatMap(toList)
  return String(value).match(EMAIL_RE) ?? []
}

function domainFromWebsite(website: unknown) {
  if (!website) return null
  try {
    const url = new URL(
      /^https?:\/\//.test(String(website)) ? String(website) : `https://${website}`
    )
    return url.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

function truthy(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

export function fillTemplate(template: string, row: RawRow) {
  return template
    .replace(/\{(\w+)\}/g, (_m, key: string) => (row[key] ?? '').toString())
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s:–-]+$/, '')
    .trim()
}

/**
 * Valeur de date d'une ligne CRM → DateTime, en distinguant les dates seules
 * (colonne DATE, minuit) des dates avec heure.
 */
export function readDate(value: unknown): { date: DateTime | null; dateOnly: boolean } {
  if (value === null || value === undefined || value === '') return { date: null, dateOnly: false }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { date: DateTime.fromISO(value, { zone: 'utc' }), dateOnly: true }
  }
  const date =
    value instanceof Date
      ? DateTime.fromJSDate(value, { zone: 'utc' })
      : DateTime.fromISO(String(value).replace(' ', 'T'), { zone: 'utc' })
  if (!date.isValid) return { date: null, dateOnly: false }
  const midnight = date.hour === 0 && date.minute === 0 && date.second === 0
  return { date, dateOnly: midnight }
}

/**
 * Adaptateur générique piloté par config/crm.ts. Les webhooks envoient les lignes
 * telles qu'en base ; la synchro de nuit les lit via un utilisateur SQL en lecture seule.
 */
export class SqlCrmAdapter implements CrmAdapter {
  constructor(
    protected config: CrmSourceConfig,
    protected mapping: CrmMapping
  ) {}

  get source() {
    return this.config.source
  }

  protected connection(): QueryClientContract {
    if (!this.config.dbUrl) {
      throw new Error(`${this.source} : pas d'accès SQL configuré (CRM_*_DB_URL)`)
    }
    const name = `crm_${this.source}`
    if (!db.manager.has(name)) {
      const url = new URL(this.config.dbUrl)
      const isPg = url.protocol.startsWith('postgres')
      db.manager.add(name, {
        client: isPg ? 'pg' : 'mysql2',
        connection: {
          host: url.hostname,
          port: Number(url.port || (isPg ? 5432 : 3306)),
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.replace(/^\//, ''),
          ...(isPg ? {} : { timezone: 'Z', dateStrings: ['DATE'] as any }),
        },
        pool: { min: 0, max: 2 },
      } as any)
    }
    return db.connection(name)
  }

  async fetchClients(since: DateTime | null) {
    const { table, columns } = this.mapping.clients
    const query = this.connection().from(table).select('*')
    if (since && columns.updatedAt) query.where(columns.updatedAt, '>', since.toJSDate())
    return query
  }

  async fetchDates(since: DateTime | null) {
    const out: { kind: string; row: RawRow }[] = []
    for (const mapping of this.mapping.dates) {
      const query = this.connection().from(mapping.table).select('*')
      if (since && mapping.columns.updatedAt) {
        query.where(mapping.columns.updatedAt, '>', since.toJSDate())
      } else {
        // Première synchro : inutile de remonter les dates très anciennes
        query.where(mapping.columns.date, '>=', DateTime.now().minus({ days: 30 }).toJSDate())
      }
      const rows = await query
      out.push(...rows.map((row: RawRow) => ({ kind: mapping.kind, row })))
    }
    return out
  }

  mapClient(raw: RawRow): ClientData {
    const { columns } = this.mapping.clients
    const externalId = String(raw[columns.id])
    const emails = [
      ...new Set(columns.emails.flatMap((c) => toList(raw[c])).map((e) => e.toLowerCase())),
    ]
    const website = columns.website ? domainFromWebsite(raw[columns.website]) : null
    return {
      externalId,
      name: String(raw[columns.name] ?? `Client ${externalId}`).trim(),
      emails,
      domains: website ? [website] : [],
      phone: columns.phone ? (raw[columns.phone] ?? null) : null,
      crmUrl: this.config.urlTemplate?.replace('{id}', encodeURIComponent(externalId)) ?? null,
      deleted: Boolean(columns.deletedAt && raw[columns.deletedAt]),
    }
  }

  mapDate(raw: RawRow, kind: string): DateData {
    const mapping = this.mapping.dates.find((d) => d.kind === kind)
    if (!mapping) throw new Error(`${this.source} : type de date inconnu « ${kind} »`)
    const { columns } = mapping
    const { date, dateOnly } = readDate(raw[columns.date])
    return {
      externalId: `${kind}:${raw[columns.id]}`,
      kind,
      clientExternalId:
        raw[columns.clientId] !== null && raw[columns.clientId] !== undefined
          ? String(raw[columns.clientId])
          : null,
      title: fillTemplate(mapping.title, raw) || kind,
      date,
      dateOnly,
      remindDaysBefore: mapping.remindDaysBefore ?? null,
      done: Boolean(columns.done && truthy(raw[columns.done])),
      deleted: Boolean(columns.deletedAt && raw[columns.deletedAt]),
    }
  }
}

export function crmConfig(source: string) {
  return planningConfig.crms.find((c) => c.source === source) ?? null
}
