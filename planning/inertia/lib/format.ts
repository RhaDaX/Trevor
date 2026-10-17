import { usePage } from '@inertiajs/react'
import type { SharedProps } from '~/lib/types'

export function useTimezone() {
  const { user } = usePage<SharedProps & Record<string, unknown>>().props
  return user?.timezone ?? 'Europe/Paris'
}

function parts(date: Date, timezone: string) {
  const f = new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]))
  return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute }
}

function dayKey(date: Date, timezone: string) {
  const p = parts(date, timezone)
  return `${p.y}-${p.m}-${p.d}`
}

export function localDayKey(iso: string, timezone: string) {
  return dayKey(new Date(iso), timezone)
}

/** Libellé court : « 14:00 », « demain 9:00 », « jeu. 22 oct. » */
export function formatDue(iso: string | null, allDay: boolean, timezone: string) {
  if (!iso) return null
  const date = new Date(iso)
  const now = new Date()
  const key = dayKey(date, timezone)
  const today = dayKey(now, timezone)
  const tomorrow = dayKey(new Date(now.getTime() + 86_400_000), timezone)
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000), timezone)
  const p = parts(date, timezone)
  const time = allDay ? '' : `${p.h}:${p.min}`

  let day: string
  if (key === today) day = allDay ? "aujourd'hui" : ''
  else if (key === tomorrow) day = 'demain'
  else if (key === yesterday) day = 'hier'
  else {
    const sameYear = p.y === parts(now, timezone).y
    day = new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(date)
  }
  return [day, time].filter(Boolean).join(' ')
}

export function formatDayHeading(key: string, timezone: string) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  const now = new Date()
  if (key === dayKey(now, timezone)) return "Aujourd'hui"
  if (key === dayKey(new Date(now.getTime() + 86_400_000), timezone)) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatDateTime(iso: string | null, timezone: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

/** Valeur pour <input type="datetime-local"> dans le fuseau de l'utilisateur */
export function toLocalInput(iso: string | null, timezone: string) {
  if (!iso) return ''
  const p = parts(new Date(iso), timezone)
  return `${p.y}-${p.m}-${p.d}T${p.h}:${p.min}`
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export const ORIGIN_LABELS: Record<string, string> = {
  mail: 'Mail',
  mac: 'Mac',
  siri: 'Siri',
  app: 'App',
  crm: 'CRM',
}
