import vine from '@vinejs/vine'
import { SNOOZE_PRESETS } from '#services/dates'
import { TASK_ORIGINS } from '#models/task'

export const captureValidator = vine.compile(
  vine.object({
    text: vine.string().trim().minLength(1).maxLength(2000),
    notes: vine.string().trim().maxLength(20000).optional(),
    origin: vine.enum(TASK_ORIGINS.filter((o) => o !== 'crm')).optional(),
    client_id: vine.number().positive().optional(),
  })
)

export const updateTaskValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(500),
    notes: vine.string().trim().maxLength(20000).nullable().optional(),
    due_at: vine.string().trim().nullable().optional(),
    remind_at: vine.string().trim().nullable().optional(),
    all_day: vine.boolean().optional(),
    priority: vine.enum(['low', 'normal', 'high'] as const),
    company: vine
      .enum(['a', 'b'] as const)
      .nullable()
      .optional(),
    recurrence_rule: vine.string().trim().maxLength(255).nullable().optional(),
    client_id: vine.number().positive().nullable().optional(),
  })
)

export const snoozeValidator = vine.compile(
  vine.object({
    preset: vine.enum(SNOOZE_PRESETS).optional(),
    until: vine.string().trim().optional(),
  })
)

export const scheduleValidator = vine.compile(
  vine.object({
    due_at: vine.string().trim().nullable(),
    all_day: vine.boolean().optional(),
  })
)

export const attachClientValidator = vine.compile(
  vine.object({
    client_id: vine.number().positive().nullable(),
  })
)
