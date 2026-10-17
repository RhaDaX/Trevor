import { DateTime } from 'luxon'

/**
 * Valeur d'un <input type="datetime-local"> (ou ISO) interprétée dans le
 * fuseau de l'utilisateur, renvoyée en UTC
 */
export function parseUserDate(value: string | null | undefined, timezone: string) {
  if (!value) return null
  const hasOffset = /([+-]\d{2}:?\d{2}|Z)$/.test(value)
  const date = hasOffset ? DateTime.fromISO(value) : DateTime.fromISO(value, { zone: timezone })
  return date.isValid ? date.toUTC() : null
}
