import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class SendRecap extends BaseCommand {
  static commandName = 'recap:send'
  static description = 'Envoie tout de suite le récap du matin (test)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Email du compte' })
  declare email: string

  async run() {
    const { default: User } = await import('#models/user')
    const { default: reminders } = await import('#services/reminders')
    const { DateTime } = await import('luxon')
    const user = await User.findByOrFail('email', this.email)
    await reminders.morningRecap(user, DateTime.now(), true)
    this.logger.success('récap envoyé')
  }
}
