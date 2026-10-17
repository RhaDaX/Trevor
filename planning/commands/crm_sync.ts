import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class CrmSyncCommand extends BaseCommand {
  static commandName = 'crm:sync'
  static description = 'Synchronise les CRM (delta depuis la dernière synchro, ou complet)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Source (crm_a, crm_b) ; toutes si absent', required: false })
  declare source?: string

  @flags.boolean({ description: 'Synchro complète (archive les clients disparus)' })
  declare full: boolean

  async run() {
    const { default: crmSync } = await import('#services/crm/crm_sync')
    const result = this.source
      ? await crmSync.syncSource(this.source, { full: this.full })
      : await crmSync.syncAll({ full: this.full })
    this.logger.info(JSON.stringify(result, null, 2))
  }
}
