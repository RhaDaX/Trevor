import { DateTime } from 'luxon'
import type Task from '#models/task'
import type Client from '#models/client'
import planningConfig from '#config/planning'
import { describeRule } from '#services/recurrence'

export function presentClient(client: Client | null | undefined) {
  if (!client) return null
  const crm = planningConfig.crms.find((c) => c.source === client.source)
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    companyName: crm?.name ?? client.company.toUpperCase(),
    emails: client.emails,
    domains: client.domains,
    phone: client.phone,
    crmUrl: client.crmUrl,
    archived: client.archived,
  }
}

export function presentTask(task: Task, now: DateTime = DateTime.now()) {
  const alarmAt = task.alarmAt
  const client = task.$preloaded.client as unknown as Client | null | undefined
  const attachments = (task.$preloaded.attachments as unknown as any[] | undefined) ?? []
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    origin: task.origin,
    company: client?.company ?? task.company,
    allDay: task.allDay,
    dueAt: task.dueAt?.toISO() ?? null,
    remindAt: task.remindAt?.toISO() ?? null,
    snoozedUntil: task.snoozedUntil?.toISO() ?? null,
    alarmAt: alarmAt?.toISO() ?? null,
    doneAt: task.doneAt?.toISO() ?? null,
    createdAt: task.createdAt.toISO(),
    overdue: Boolean(task.isOpen && task.dueAt && alarmAt && alarmAt < now),
    recurrenceRule: task.recurrenceRule,
    recurrenceLabel: describeRule(task.recurrenceRule),
    clientUncertain: task.clientUncertain,
    fromCrm: Boolean(task.sourceRef),
    client: presentClient(client),
    attachments: attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      mime: a.mime,
      size: a.size,
    })),
  }
}

export type PresentedTask = ReturnType<typeof presentTask>
