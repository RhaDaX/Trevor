import { DateTime } from 'luxon'
import rrulePkg from 'rrule'

const { RRule } = rrulePkg

/**
 * Prochaine occurrence d'une règle RRULE après `previous`.
 *
 * Le calcul se fait en heure locale « flottante » pour que 9h reste 9h
 * de part et d'autre d'un changement d'heure.
 */
export function nextOccurrence(
  rule: string,
  previous: DateTime,
  timezone: string
): DateTime | null {
  const local = previous.setZone(timezone)
  const floating = new Date(
    Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0)
  )
  const options = RRule.parseString(rule.replace(/^RRULE:/i, ''))
  const rrule = new RRule({ ...options, dtstart: floating })
  const next = rrule.after(floating, false)
  if (!next) return null

  return DateTime.fromObject(
    {
      year: next.getUTCFullYear(),
      month: next.getUTCMonth() + 1,
      day: next.getUTCDate(),
      hour: next.getUTCHours(),
      minute: next.getUTCMinutes(),
    },
    { zone: timezone }
  ).toUTC()
}

export function isValidRule(rule: string) {
  try {
    const options = RRule.parseString(rule.replace(/^RRULE:/i, ''))
    return options.freq !== undefined
  } catch {
    return false
  }
}

const LABELS: Record<string, string> = {
  'FREQ=DAILY': 'Tous les jours',
  'FREQ=WEEKLY': 'Toutes les semaines',
  'FREQ=MONTHLY': 'Tous les mois',
  'FREQ=MONTHLY;INTERVAL=3': 'Tous les trimestres',
  'FREQ=YEARLY': 'Tous les ans',
}

export function describeRule(rule: string | null) {
  if (!rule) return null
  return LABELS[rule.toUpperCase()] ?? rule
}
