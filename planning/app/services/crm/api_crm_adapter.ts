import { DateTime } from 'luxon'
import type { CrmSourceConfig } from '#config/planning'
import dateKinds from '#config/crm'
import {
  CrmPayloadError,
  type ClientData,
  type CrmAdapter,
  type DateData,
  type RawRow,
} from '#services/crm/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PAGES = 500
const TIMEOUT_MS = 20_000

function id(value: unknown, field: string) {
  if (typeof value === 'number' || (typeof value === 'string' && value.trim()))
    return String(value).trim()
  throw new CrmPayloadError(`champ « ${field} » manquant ou invalide`)
}

function bool(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function domainFromWebsite(website: unknown) {
  if (typeof website !== 'string' || !website.trim()) return null
  try {
    const raw = website.trim()
    return new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).hostname
      .replace(/^www\./, '')
      .toLowerCase()
  } catch {
    return null
  }
}

/**
 * Valeur de date du CRM → DateTime : « 2027-01-15 » est une date seule,
 * une chaîne ISO avec heure garde son heure.
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
  if (!date.isValid) throw new CrmPayloadError(`date invalide : ${String(value)}`)
  return { date, dateOnly: false }
}

/**
 * Lecture des CRM par leur API HTTP (jamais par leur base) :
 *   GET <api_url>/clients?updated_since=<ISO>&page=<n>
 *   GET <api_url>/dates?updated_since=<ISO>&page=<n>
 * Réponse : { data: [...], next_page: number | null }, jeton en Bearer.
 */
export class ApiCrmAdapter implements CrmAdapter {
  constructor(
    protected config: CrmSourceConfig,
    protected fetcher: typeof fetch = fetch
  ) {}

  get source() {
    return this.config.source
  }

  protected async fetchAll(resource: 'clients' | 'dates', since: DateTime | null) {
    const { apiUrl, apiToken } = this.config
    if (!apiUrl || !apiToken) {
      throw new Error(`${this.source} : API non configurée (CRM_*_API_URL et CRM_*_API_TOKEN)`)
    }

    const rows: RawRow[] = []
    let page: number | null = 1
    for (let i = 0; page && i < MAX_PAGES; i++) {
      const url = new URL(`${apiUrl.replace(/\/+$/, '')}/${resource}`)
      url.searchParams.set('page', String(page))
      if (since) url.searchParams.set('updated_since', since.toUTC().toISO()!)

      const response = await this.fetcher(url, {
        headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) {
        throw new Error(`${this.source} : GET /${resource} → HTTP ${response.status}`)
      }
      const body = (await response.json()) as { data?: unknown; next_page?: unknown }
      if (!Array.isArray(body.data)) {
        throw new CrmPayloadError(`${this.source} : réponse /${resource} sans tableau « data »`)
      }
      rows.push(...(body.data as RawRow[]))
      page = typeof body.next_page === 'number' && body.next_page > page ? body.next_page : null
    }
    return rows
  }

  fetchClients(since: DateTime | null) {
    return this.fetchAll('clients', since)
  }

  fetchDates(since: DateTime | null) {
    return this.fetchAll('dates', since)
  }

  mapClient(raw: RawRow): ClientData {
    const externalId = id(raw.id, 'id')
    const emails = Array.isArray(raw.emails)
      ? raw.emails
      : typeof raw.email === 'string'
        ? [raw.email]
        : []
    const website = domainFromWebsite(raw.website)
    return {
      externalId,
      name:
        typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Client ${externalId}`,
      emails: [
        ...new Set(
          emails
            .filter((e: unknown): e is string => typeof e === 'string')
            .map((e) => e.trim().toLowerCase())
            .filter((e) => EMAIL_RE.test(e))
        ),
      ],
      domains: website ? [website] : [],
      phone: typeof raw.phone === 'string' && raw.phone.trim() ? raw.phone.trim() : null,
      crmUrl:
        typeof raw.url === 'string' && raw.url
          ? raw.url
          : (this.config.urlTemplate?.replace('{id}', encodeURIComponent(externalId)) ?? null),
      deleted: bool(raw.deleted),
    }
  }

  mapDate(raw: RawRow): DateData {
    const kind = id(raw.kind, 'kind')
    const { date, dateOnly } = readDate(raw.date)
    const remind =
      typeof raw.remind_days_before === 'number'
        ? raw.remind_days_before
        : (dateKinds[kind]?.remindDaysBefore ?? null)
    return {
      externalId: `${kind}:${id(raw.id, 'id')}`,
      kind,
      clientExternalId:
        raw.client_id === null || raw.client_id === undefined || raw.client_id === ''
          ? null
          : String(raw.client_id),
      title:
        typeof raw.title === 'string' && raw.title.trim()
          ? raw.title.trim()
          : (dateKinds[kind]?.label ?? kind),
      date,
      dateOnly,
      remindDaysBefore: remind,
      done: bool(raw.done),
      deleted: bool(raw.deleted),
    }
  }
}
