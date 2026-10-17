import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Task, { type TaskOrigin, type TaskPriority } from '#models/task'
import User from '#models/user'
import planningConfig, { type Company } from '#config/planning'
import { parseTask } from '#services/task_parser'
import clientMatcher, { type ClientMatch } from '#services/client_matcher'
import { nextOccurrence } from '#services/recurrence'
import { snoozeTarget, type SnoozePreset } from '#services/dates'

export interface CaptureInput {
  text: string
  origin: TaskOrigin
  notes?: string | null
  /** Expéditeur d'un mail capturé : prioritaire pour reconnaître le client */
  senderEmail?: string | null
  clientId?: number | null
  dueAt?: DateTime | null
  priority?: TaskPriority
}

/**
 * Toutes les entrées (mail, Mac, Siri, app) aboutissent ici
 */
export class TaskService {
  async capture(user: User, input: CaptureInput) {
    const parsed = parseTask(input.text, {
      timezone: user.timezone,
      defaultHour: planningConfig.defaultHour,
    })

    let match: ClientMatch = { client: null, uncertain: false, candidates: [] }
    if (!input.clientId) {
      if (input.senderEmail) match = await clientMatcher.byEmail(input.senderEmail)
      if (!match.client) {
        const byText = await clientMatcher.byText(parsed.title, parsed.company)
        // Plusieurs clients sur le même domaine : le texte peut trancher
        const agrees = !match.uncertain || match.candidates.some((c) => c.id === byText.client?.id)
        if (byText.client && agrees) match = byText
        else if (!match.uncertain) match = byText
      }
    }

    const dueAt = input.dueAt ?? parsed.dueAt
    const task = new Task()
    task.fill({
      userId: user.id,
      title: parsed.title,
      notes: input.notes ?? null,
      clientId: input.clientId ?? match.client?.id ?? null,
      clientUncertain: !input.clientId && !match.client && match.uncertain,
      dueAt,
      allDay: input.dueAt ? false : parsed.allDay,
      priority: input.priority ?? parsed.priority,
      company: match.client ? null : parsed.company,
      recurrenceRule: parsed.recurrenceRule,
      origin: input.origin,
    })
    task.status = this.#statusFor(task)
    await task.save()
    await task.load('client')
    return { task, parsed, match }
  }

  /** Sans date, ou client incertain : la tâche attend d'être triée */
  #statusFor(task: Task) {
    return task.dueAt && !task.clientUncertain ? 'todo' : 'inbox'
  }

  async complete(task: Task) {
    return db.transaction(async (trx) => {
      task.useTransaction(trx)
      task.status = 'done'
      task.doneAt = DateTime.now()
      await task.save()

      if (!task.recurrenceRule || !task.dueAt) return { task, next: null }

      await task.load('user')
      const nextDue = nextOccurrence(task.recurrenceRule, task.dueAt, task.user.timezone)
      if (!nextDue) return { task, next: null }

      // Le rappel garde le même écart avec l'échéance
      const reminderOffset = task.remindAt ? task.dueAt.diff(task.remindAt) : null
      const next = new Task()
      next.useTransaction(trx)
      next.fill({
        userId: task.userId,
        clientId: task.clientId,
        title: task.title,
        notes: task.notes,
        dueAt: nextDue,
        remindAt: reminderOffset ? nextDue.minus(reminderOffset) : null,
        allDay: task.allDay,
        status: 'todo',
        priority: task.priority,
        origin: task.origin,
        company: task.company,
        recurrenceRule: task.recurrenceRule,
      })
      await next.save()
      return { task, next }
    })
  }

  async reopen(task: Task) {
    task.status = task.dueAt && !task.clientUncertain ? 'todo' : 'inbox'
    task.doneAt = null
    task.lastNotifiedAt = null
    await task.save()
    return task
  }

  /**
   * Report rapide (+1 h, demain, lundi…). Une tâche sans date reçoit une
   * échéance ; une tâche datée garde son échéance et sonne plus tard.
   */
  async snooze(task: Task, preset: SnoozePreset | DateTime, timezone: string) {
    const target = preset instanceof DateTime ? preset : snoozeTarget(preset, timezone)
    if (!task.dueAt) {
      task.dueAt = target
      task.allDay = false
      task.snoozedUntil = null
    } else {
      task.snoozedUntil = target
    }
    task.lastNotifiedAt = null
    if (task.status === 'inbox' && !task.clientUncertain) task.status = 'todo'
    await task.save()
    return task
  }

  /** Dater une tâche (depuis « à trier » ou l'édition) */
  async schedule(task: Task, dueAt: DateTime | null, allDay = false) {
    task.dueAt = dueAt
    task.allDay = allDay
    task.snoozedUntil = null
    task.lastNotifiedAt = null
    if (task.isOpen) task.status = this.#statusFor(task)
    await task.save()
    return task
  }

  async attachClient(task: Task, clientId: number | null) {
    task.clientId = clientId
    task.clientUncertain = false
    if (clientId) task.company = null
    if (task.isOpen) task.status = this.#statusFor(task)
    await task.save()
    return task
  }

  async update(
    task: Task,
    data: {
      title?: string
      notes?: string | null
      dueAt?: DateTime | null
      remindAt?: DateTime | null
      allDay?: boolean
      priority?: TaskPriority
      company?: Company | null
      recurrenceRule?: string | null
      clientId?: number | null
    }
  ) {
    const dateChanged =
      ('dueAt' in data && +(data.dueAt ?? 0) !== +(task.dueAt ?? 0)) ||
      ('remindAt' in data && +(data.remindAt ?? 0) !== +(task.remindAt ?? 0))
    task.merge(data)
    if ('clientId' in data) task.clientUncertain = false
    if (dateChanged) {
      task.snoozedUntil = null
      task.lastNotifiedAt = null
    }
    if (task.isOpen) task.status = this.#statusFor(task)
    await task.save()
    return task
  }
}

const taskService = new TaskService()
export default taskService
