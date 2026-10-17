import type { JobName } from '#services/queue'

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
