import { DateTime } from 'luxon'
import planningConfig from '#config/planning'

export type SnoozePreset = '1h' | '3h' | 'tonight' | 'tomorrow' | 'monday' | 'nextweek'

export const SNOOZE_PRESETS: SnoozePreset[] = [
  '1h',
  '3h',
  'tonight',
  'tomorrow',
  'monday',
  'nextweek',
]

/**
 * Date de report calculée dans le fuseau de l'utilisateur
 */
export function snoozeTarget(
  preset: SnoozePreset,
  timezone: string,
  now: DateTime = DateTime.now()
): DateTime {
  const local = now.setZone(timezone)
  const morning = { hour: planningConfig.defaultHour, minute: 0, second: 0, millisecond: 0 }

  switch (preset) {
    case '1h':
      return local.plus({ hours: 1 }).set({ second: 0, millisecond: 0 }).toUTC()
    case '3h':
      return local.plus({ hours: 3 }).set({ second: 0, millisecond: 0 }).toUTC()
    case 'tonight': {
      const evening = local.set({ hour: 18, minute: 0, second: 0, millisecond: 0 })
      return (evening > local ? evening : local.plus({ hours: 1 })).toUTC()
    }
    case 'tomorrow':
      return local.plus({ days: 1 }).set(morning).toUTC()
    case 'monday':
    case 'nextweek': {
      // Prochain lundi strictement après aujourd'hui
      const daysUntilMonday = (8 - local.weekday) % 7 || 7
      return local.plus({ days: daysUntilMonday }).set(morning).toUTC()
    }
  }
}

export function startOfLocalDay(timezone: string, now: DateTime = DateTime.now()) {
  return now.setZone(timezone).startOf('day')
}

export function endOfLocalDay(timezone: string, now: DateTime = DateTime.now()) {
  return now.setZone(timezone).endOf('day')
}
