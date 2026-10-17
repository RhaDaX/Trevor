/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  APP_URL: Env.schema.string(),
  APP_TIMEZONE: Env.schema.string.optional(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  // Socket local (dev sur Mac) : évite les conflits sur le port 3306
  DB_SOCKET: Env.schema.string.optional(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  SMTP_HOST: Env.schema.string(),
  SMTP_PORT: Env.schema.number(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string(),

  IMAP_HOST: Env.schema.string.optional(),
  IMAP_PORT: Env.schema.number.optional(),
  IMAP_USER: Env.schema.string.optional(),
  IMAP_PASSWORD: Env.schema.string.optional(),
  IMAP_MAILBOX: Env.schema.string.optional(),

  VAPID_PUBLIC_KEY: Env.schema.string.optional(),
  VAPID_PRIVATE_KEY: Env.schema.string.optional(),
  VAPID_SUBJECT: Env.schema.string.optional(),

  CRM_A_NAME: Env.schema.string.optional(),
  CRM_A_WEBHOOK_SECRET: Env.schema.string.optional(),
  CRM_A_API_URL: Env.schema.string.optional(),
  CRM_A_API_TOKEN: Env.schema.string.optional(),
  CRM_A_URL_TEMPLATE: Env.schema.string.optional(),
  CRM_B_NAME: Env.schema.string.optional(),
  CRM_B_WEBHOOK_SECRET: Env.schema.string.optional(),
  CRM_B_API_URL: Env.schema.string.optional(),
  CRM_B_API_TOKEN: Env.schema.string.optional(),
  CRM_B_URL_TEMPLATE: Env.schema.string.optional(),
})
