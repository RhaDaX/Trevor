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

export function todayLabel(timezone: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`
}

/** Retard exprimé simplement : « il y a 25 min », « il y a 3 h », « depuis hier » */
export function formatLateness(iso: string | null, timezone: string, now: Date = new Date()) {
  if (!iso) return null
  const date = new Date(iso)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return null
  if (minutes < 60) return `il y a ${minutes} min`
  const today = dayKey(now, timezone)
  if (dayKey(date, timezone) === today) return `il y a ${Math.floor(minutes / 60)} h`
  if (dayKey(date, timezone) === dayKey(new Date(now.getTime() - 86_400_000), timezone))
    return 'depuis hier'
  return `depuis ${Math.max(2, Math.round(minutes / 1440))} j`
}

/** Jour calendaire local (fuseau de l'utilisateur) décalé de n jours */
export function shiftDayKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

export function todayKey(timezone: string) {
  return dayKey(new Date(), timezone)
}

/** Jour de la semaine (1 = lundi … 7 = dimanche) d'une clé de jour */
export function weekdayOf(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1
}

/** Valeur datetime-local pour un raccourci de date (« demain 9 h »…) */
export function presetInput(
  preset: 'tonight' | 'tomorrow' | 'monday' | 'nextweek',
  timezone: string
) {
  const today = todayKey(timezone)
  const pad = (n: number) => String(n).padStart(2, '0')
  switch (preset) {
    case 'tonight':
      return `${today}T18:00`
    case 'tomorrow':
      return `${shiftDayKey(today, 1)}T09:00`
    case 'monday': {
      const offset = (8 - weekdayOf(today)) % 7 || 7
      return `${shiftDayKey(today, offset)}T09:00`
    }
    case 'nextweek':
      return `${shiftDayKey(today, 7)}T${pad(9)}:00`
  }
}

export function shortWeekday(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' })
    .format(new Date(Date.UTC(y, m - 1, d, 12)))
    .replace('.', '')
}
