import logger from '@adonisjs/core/services/logger'
import type { JobName } from '#services/queue'
import { newTraceId, runWithTrace, TRACE_ID_PATTERN } from '#services/trace'

/**
 * Point d'entrée unique des jobs, utilisé par le worker et en test
 */
export async function handleJob(name: JobName, data: any) {
  switch (name) {
    case 'crm-event': {
      const { default: crmSync } = await import('#services/crm/crm_sync')
      return crmSync.handleEvent(data)
    }
    case 'crm-sync': {
      const { default: crmSync } = await import('#services/crm/crm_sync')
      return crmSync.syncAll({ full: Boolean(data?.full) })
    }
    case 'imap-poll': {
      const { pollMailbox } = await import('#services/mail_capture')
      return pollMailbox()
    }
    case 'reminders-tick': {
      const { default: reminders } = await import('#services/reminders')
      return reminders.tick()
    }
  }
}

/** Jobs planifiés chaque minute : pas de ligne de log quand tout va bien */
const ROUTINE: JobName[] = ['imap-poll', 'reminders-tick']

/**
 * Exécute un job dans sa trace : celle de la requête d'origine si elle a été
 * transmise (_traceId), sinon une nouvelle (préfixe JOB).
 */
export function runJob(name: JobName, data: any, jobId?: string) {
  const inherited = typeof data?._traceId === 'string' && TRACE_ID_PATTERN.test(data._traceId)
  const traceId = inherited ? data._traceId : newTraceId('JOB')
  return runWithTrace({ traceId, origin: `job:${name}` }, async () => {
    const started = Date.now()
    const quiet = ROUTINE.includes(name)
    if (!quiet) logger.info({ job: name, jobId }, `job ${name} démarré`)
    try {
      const result = await handleJob(name, data)
      if (!quiet)
        logger.info({ job: name, jobId, durationMs: Date.now() - started }, `job ${name} terminé`)
      return result
    } catch (error: any) {
      logger.error(
        { job: name, jobId, err: error, durationMs: Date.now() - started },
        `job ${name} en échec : ${error?.message ?? error}`
      )
      throw error
    }
  })
}
