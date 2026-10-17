import ical, { ICalAlarmType, ICalCalendarMethod } from 'ical-generator'
import { DateTime } from 'luxon'
import Task from '#models/task'
import type User from '#models/user'
import planningConfig from '#config/planning'
import { absoluteUrl } from '#services/notifier'

/**
 * Flux iCal abonné dans Calendrier (Mac et iPhone) :
 * chaque tâche datée devient un événement avec alerte native.
 */
export async function buildCalendar(user: User) {
  const since = DateTime.now().minus({ days: 60 }).toSQL({ includeOffset: false })!
  const tasks = await Task.query()
    .where('user_id', user.id)
    .whereNotNull('due_at')
    .where((q) =>
      q
        .whereIn('status', ['inbox', 'todo'])
        .orWhere((d) => d.where('status', 'done').where('done_at', '>=', since))
    )
    .preload('client')
    .orderBy('due_at', 'asc')

  const calendar = ical({
    name: 'Planning',
    prodId: { company: 'planning', product: 'planning-crm', language: 'FR' },
    method: ICalCalendarMethod.PUBLISH,
    timezone: user.timezone,
    ttl: 60 * 15,
  })

  for (const task of tasks) {
    const start = task.dueAt!.setZone(user.timezone)
    const company = task.client?.company ?? task.company
    const crm = planningConfig.crms.find((c) => c.company === company)
    const done = task.status === 'done'

    const event = calendar.createEvent({
      id: `task-${task.id}@planning`,
      start: start.toJSDate(),
      end: task.allDay
        ? start.plus({ days: 1 }).toJSDate()
        : start.plus({ minutes: 30 }).toJSDate(),
      allDay: task.allDay,
      timezone: user.timezone,
      summary: `${done ? '✓ ' : ''}${company ? `[${company.toUpperCase()}] ` : ''}${task.title}`,
      description: [
        task.client ? `Client : ${task.client.name}${crm ? ` (${crm.name})` : ''}` : null,
        task.notes,
        absoluteUrl(`/tasks/${task.id}`),
      ]
        .filter(Boolean)
        .join('\n\n'),
      url: absoluteUrl(`/tasks/${task.id}`),
      lastModified: (task.updatedAt ?? task.createdAt).toJSDate(),
    })

    if (!done) {
      // L'alerte suit le rappel ou le report ; sinon elle sonne à l'heure de l'échéance
      const alarmAt = task.alarmAt!.setZone(user.timezone)
      const alarmTime =
        task.allDay && !task.remindAt && !task.snoozedUntil
          ? start.set({ hour: planningConfig.defaultHour, minute: 0 })
          : alarmAt
      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: alarmTime.toJSDate(),
        description: task.title,
      })
    }
  }

  return calendar.toString()
}
