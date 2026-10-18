import { Queue, type JobsOptions } from 'bullmq'
import app from '@adonisjs/core/services/app'
import planningConfig from '#config/planning'
import { currentTraceId } from '#services/trace'

export const QUEUE_NAME = 'planning'

export type JobName = 'crm-event' | 'crm-sync' | 'imap-poll' | 'reminders-tick'

type InlineHandler = (name: JobName, data: any) => Promise<unknown>

let queue: Queue | null = null
let inlineHandler: InlineHandler | null = null

export function redisConnection() {
  return {
    host: planningConfig.redis.host,
    port: planningConfig.redis.port,
    password: planningConfig.redis.password,
    maxRetriesPerRequest: null,
  }
}

export function getQueue() {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: redisConnection() })
  return queue
}

/**
 * En test, les jobs s'exécutent tout de suite au lieu de passer par Redis
 */
export function runJobsInline(handler: InlineHandler | null) {
  inlineHandler = handler
}

/** Le job emporte la trace de la requête qui l'a créé (webhook → job → synchro) */
export async function dispatch(
  name: JobName,
  data: Record<string, unknown>,
  options: JobsOptions = {}
) {
  const payload = { ...data, _traceId: data._traceId ?? currentTraceId() }
  if (inlineHandler || app.inTest) {
    if (inlineHandler) return inlineHandler(name, payload)
    const { runJob } = await import('#jobs/handlers')
    return runJob(name, payload)
  }
  return getQueue().add(name, payload, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
    ...options,
  })
}

export async function closeQueue() {
  await queue?.close()
  queue = null
}
