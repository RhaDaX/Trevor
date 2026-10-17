import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class CreateUser extends BaseCommand {
  static commandName = 'user:create'
  static description = 'Crée un compte (Nathan en V1)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Adresse email' })
  declare email: string

  @flags.string({ description: 'Nom affiché' })
  declare name?: string

  @flags.string({ description: 'Mot de passe (demandé si absent)' })
  declare password?: string

  async run() {
    const { default: User } = await import('#models/user')
    const password: string = this.password || (await this.prompt.secure('Mot de passe'))
    const existing = await User.findBy('email', this.email)
    if (existing) {
      existing.password = password
      if (this.name) existing.fullName = this.name
      await existing.save()
      this.logger.success(`Compte ${this.email} mis à jour`)
      return
    }
    await User.create({ email: this.email, fullName: this.name ?? null, password })
    this.logger.success(`Compte ${this.email} créé`)
  }
}
