import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const username = env.get('SMTP_USERNAME')

const mailConfig = defineConfig({
  default: 'smtp',
  from: env.get('MAIL_FROM'),
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
      ...(username
        ? { auth: { type: 'login' as const, user: username, pass: env.get('SMTP_PASSWORD', '') } }
        : {}),
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
