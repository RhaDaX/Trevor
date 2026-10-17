import vine from '@vinejs/vine'

export const settingsValidator = vine.compile(
  vine.object({
    full_name: vine.string().trim().maxLength(120).nullable().optional(),
    timezone: vine.string().trim().maxLength(64),
    nag_interval_minutes: vine
      .number()
      .min(0)
      .max(24 * 60),
    nag_start_hour: vine.number().min(0).max(23),
    nag_end_hour: vine.number().min(1).max(24),
    recap_hour: vine.number().min(0).max(23),
    recap_minute: vine.number().min(0).max(59),
  })
)

export const tokenValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(60),
  })
)

export const pushSubscriptionValidator = vine.compile(
  vine.object({
    endpoint: vine.string().url().maxLength(700),
    keys: vine.object({
      p256dh: vine.string().maxLength(255),
      auth: vine.string().maxLength(255),
    }),
  })
)
