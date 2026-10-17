import type { DateTime } from 'luxon'

export type RawRow = Record<string, any>

/**
 * Format commun exposé par chaque CRM, identique dans l'API de lecture
 * (GET /clients, GET /dates) et dans les webhooks.
 *
 *   Client : { id, name, emails?: string[], website?, phone?, url?, deleted? }
 *   Date   : { id, kind, client_id, date: "YYYY-MM-DD" | ISO 8601, title,
 *              done?, deleted?, remind_days_before? }
 */
export interface ClientData {
  externalId: string
  name: string
  emails: string[]
  domains: string[]
  phone: string | null
  crmUrl: string | null
  deleted: boolean
}

export interface DateData {
  /** "<kind>:<id>" — unique dans un CRM */
  externalId: string
  kind: string
  clientExternalId: string | null
  title: string
  date: DateTime | null
  /** Date seule ou date et heure */
  dateOnly: boolean
  remindDaysBefore: number | null
  done: boolean
  deleted: boolean
}

/**
 * Un adaptateur par CRM. Un troisième CRM demain = un adaptateur de plus.
 */
export interface CrmAdapter {
  readonly source: string
  fetchClients(since: DateTime | null): Promise<RawRow[]>
  fetchDates(since: DateTime | null): Promise<RawRow[]>
  mapClient(raw: RawRow): ClientData
  mapDate(raw: RawRow): DateData
}

export class CrmPayloadError extends Error {}
