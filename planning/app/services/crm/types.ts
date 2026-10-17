import type { DateTime } from 'luxon'

export type RawRow = Record<string, any>

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
  /** Date seule (colonne DATE) ou date et heure */
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
  fetchDates(since: DateTime | null): Promise<{ kind: string; row: RawRow }[]>
  mapClient(raw: RawRow): ClientData
  mapDate(raw: RawRow, kind: string): DateData
}
