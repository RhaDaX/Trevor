import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { Worker } from 'bullmq'
import { QUEUE_NAME, closeQueue, getQueue, redisConnection, type JobName } from '#services/queue'

/**
 * Worker séparé (son propre conteneur) : webhooks CRM, relève IMAP,
 * rappels et récap, synchro CRM de nuit.
 */
export default class WorkerCommand extends BaseCommand {
  static commandName = 'planning:worker'
  static description = 'Lance le worker de jobs et les tâches planifiées'
  static options: CommandOptions = { startApp: true, staysAlive: true }

  @flags.string({ description: 'Heure (cron) de la synchro CRM de nuit', default: '0 3 * * *' })
  declare nightlyCron: string

  async run() {
    const { runJob } = await import('#jobs/handlers')
    const { default: planningConfig } = await import('#config/planning')
    const queue = getQueue()

    // Hors serveur HTTP, les routes ne sont pas figées : nécessaire pour les URL signées des notifications
    const router = await this.app.container.make('router')
    router.commit()

    // Planification idempotente : relancer le worker ne duplique rien
    await queue.upsertJobScheduler('imap-poll', { every: 60_000 }, { name: 'imap-poll' })
    await queue.upsertJobScheduler('reminders-tick', { every: 60_000 }, { name: 'reminders-tick' })
    await queue.upsertJobScheduler(
      'crm-nightly-sync',
      { pattern: this.nightlyCron, tz: planningConfig.timezone },
      { name: 'crm-sync', data: { full: false } }
    )

    const worker = new Worker(
      QUEUE_NAME,
      async (job) => runJob(job.name as JobName, job.data, job.id),
      {
        connection: redisConnection(),
        concurrency: 1,
      }
    )
    worker.on('failed', (job, error) => {
      this.logger.error(
        `job ${job?.name} #${job?.id} en échec [${job?.data?._traceId ?? '—'}] : ${error.message}`
      )
    })
    worker.on('error', (error) => this.logger.error(error.message))

    this.logger.success('worker démarré')

    this.app.terminating(async () => {
      await worker.close()
      await closeQueue()
    })
  }
}
