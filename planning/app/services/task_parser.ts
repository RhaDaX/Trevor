import * as chrono from 'chrono-node'
import { DateTime } from 'luxon'
import type { Company } from '#config/planning'
import type { TaskPriority } from '#models/task'

export interface ParsedTask {
  title: string
  dueAt: DateTime | null
  allDay: boolean
  priority: TaskPriority
  company: Company | null
  recurrenceRule: string | null
  tags: string[]
  /** Morceau de texte reconnu comme date (pour l'aperçu) */
  dateText: string | null
}

export interface ParseOptions {
  timezone: string
  now?: DateTime
  defaultHour?: number
}

const PRIORITY_TAGS: Record<string, TaskPriority> = {
  urgent: 'high',
  important: 'high',
  prio: 'high',
  haute: 'high',
  bas: 'low',
  basse: 'low',
  low: 'low',
  plustard: 'low',
}

const COMPANY_TAGS: Record<string, Company> = { a: 'a', b: 'b' }

/**
 * Récurrence simple exprimée en français : « tous les mois », « chaque année »…
 */
const RECURRENCES: { pattern: RegExp; rule: string }[] = [
  { pattern: /\b(tous les jours|chaque jour|quotidien(ne)?(ment)?)\b/i, rule: 'FREQ=DAILY' },
  { pattern: /\b(toutes les semaines|chaque semaine|hebdo(madaire)?)\b/i, rule: 'FREQ=WEEKLY' },
  { pattern: /\b(tous les mois|chaque mois|mensuel(le)?(lement)?)\b/i, rule: 'FREQ=MONTHLY' },
  {
    pattern: /\b(tous les trimestres|chaque trimestre|trimestriel(le)?(lement)?)\b/i,
    rule: 'FREQ=MONTHLY;INTERVAL=3',
  },
  {
    pattern: /\b(tous les ans|chaque ann[ée]e|annuel(le)?(lement)?)\b/i,
    rule: 'FREQ=YEARLY',
  },
]

function cleanup(text: string) {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/^[\s,.;:–-]+|[\s,;:–-]+$/g, '')
    .trim()
}

/**
 * Saisie en langage naturel :
 * « rappeler Dupont jeudi 14h #urgent » → titre « rappeler Dupont »,
 * échéance jeudi 14h (fuseau de l'utilisateur), priorité haute.
 *
 * Sans date reconnue, dueAt est null et la tâche part dans « à trier ».
 */
export function parseTask(input: string, options: ParseOptions): ParsedTask {
  const now = (options.now ?? DateTime.now()).setZone(options.timezone)
  const defaultHour = options.defaultHour ?? 9
  let text = ` ${input.trim()} `

  // 1. Étiquettes #urgent, #a, #b…
  let priority: TaskPriority = 'normal'
  let company: Company | null = null
  const tags: string[] = []
  text = text.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (_match, lead: string, raw: string) => {
    const tag = raw.toLowerCase()
    tags.push(tag)
    if (PRIORITY_TAGS[tag]) priority = PRIORITY_TAGS[tag]
    else if (COMPANY_TAGS[tag]) company = COMPANY_TAGS[tag]
    return lead
  })
  if (/(^|\s)!{1,3}(\s|$)/.test(text)) {
    priority = 'high'
    text = text.replace(/(^|\s)!{1,3}(?=\s|$)/g, ' ')
  }

  // 2. Récurrence
  let recurrenceRule: string | null = null
  for (const { pattern, rule } of RECURRENCES) {
    if (pattern.test(text)) {
      recurrenceRule = rule
      text = text.replace(pattern, ' ')
      break
    }
  }

  // 3. Date et heure (chrono, français)
  let dueAt: DateTime | null = null
  let allDay = false
  let dateText: string | null = null

  // Chrono raisonne en heure « murale » : on lui donne la date locale de l'utilisateur
  const wallClock = new Date(
    Date.UTC(now.year, now.month - 1, now.day, now.hour, now.minute, now.second)
  )
  const results = chrono.fr.parse(text, { instant: wallClock, timezone: 0 }, { forwardDate: true })
  const result = results[0]

  if (result) {
    const start = result.start
    const hasTime = start.isCertain('hour')
    dueAt = DateTime.fromObject(
      {
        year: start.get('year') ?? now.year,
        month: start.get('month') ?? now.month,
        day: start.get('day') ?? now.day,
        hour: hasTime ? (start.get('hour') ?? defaultHour) : defaultHour,
        minute: hasTime ? (start.get('minute') ?? 0) : 0,
      },
      { zone: options.timezone }
    )
    // « matin », « ce soir » donnent une heure implicite utile
    if (
      !hasTime &&
      start.get('hour') !== null &&
      /matin|midi|soir|après-midi|aprem/i.test(result.text)
    ) {
      dueAt = dueAt.set({ hour: start.get('hour') ?? defaultHour })
    } else if (!hasTime) {
      allDay = true
    }
    dateText = result.text
    text = text.slice(0, result.index) + ' ' + text.slice(result.index + result.text.length)
    // Mots de liaison laissés orphelins : « le », « à », « pour »…
    text = text.replace(/\s(le|à|a|pour|avant|d'ici|vers|dès)\s*$/i, ' ')
  }

  // « tous les mois le 5 » : jour du mois que chrono ne reconnaît pas seul
  const dayOfMonth = text.match(/\s(?:le\s+)?(\d{1,2})(?:er)?(?=\s|$)/i)
  if (recurrenceRule?.startsWith('FREQ=MONTHLY') && !dueAt && dayOfMonth) {
    const day = Number(dayOfMonth[1])
    if (day >= 1 && day <= 31) {
      let first = now.set({
        day: Math.min(day, now.daysInMonth!),
        hour: defaultHour,
        minute: 0,
        second: 0,
        millisecond: 0,
      })
      if (first <= now) {
        const nextMonth = now.plus({ months: 1 })
        first = nextMonth.set({
          day: Math.min(day, nextMonth.daysInMonth!),
          hour: defaultHour,
          minute: 0,
          second: 0,
          millisecond: 0,
        })
      }
      dueAt = first
      allDay = true
      dateText = dayOfMonth[0].trim()
      text = text.replace(dayOfMonth[0], ' ')
    }
  }

  // Récurrence sans date : première occurrence aujourd'hui (ou demain si l'heure est passée)
  if (recurrenceRule && !dueAt) {
    let first = now.set({ hour: defaultHour, minute: 0, second: 0, millisecond: 0 })
    if (first <= now) first = first.plus({ days: 1 })
    dueAt = first
    allDay = true
  }

  const title = cleanup(text) || cleanup(input) || 'Sans titre'

  return {
    title,
    dueAt: dueAt ? dueAt.set({ second: 0, millisecond: 0 }).toUTC() : null,
    allDay,
    priority,
    company,
    recurrenceRule,
    tags,
    dateText,
  }
}
