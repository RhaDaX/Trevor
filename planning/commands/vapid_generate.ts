import { BaseCommand } from '@adonisjs/core/ace'
import webpush from 'web-push'

export default class VapidGenerate extends BaseCommand {
  static commandName = 'vapid:generate'
  static description = 'Génère les clés VAPID des notifications Web Push'

  async run() {
    const keys = webpush.generateVAPIDKeys()
    this.logger.info('À copier dans .env :')
    console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
    console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
  }
}
