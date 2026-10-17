import env from '#start/env'

export type Company = 'a' | 'b'

export interface CrmSourceConfig {
  /** Identifiant utilisé dans les routes et en base (clients.source) */
  source: string
  company: Company
  name: string
  webhookSecret?: string
  /** Racine de l'API de lecture du CRM (…/api/planning) */
  apiUrl?: string
  /** Jeton envoyé en « Authorization: Bearer » à l'API du CRM */
  apiToken?: string
  /** Lien vers la fiche client, {id} est remplacé par l'identifiant externe */
  urlTemplate?: string
}

/**
 * Paramètres métier de l'outil planning
 */
export default {
  timezone: env.get('APP_TIMEZONE', 'Europe/Paris'),
  appUrl: env.get('APP_URL'),

  redis: {
    host: env.get('REDIS_HOST'),
    port: env.get('REDIS_PORT'),
    password: env.get('REDIS_PASSWORD') || undefined,
  },

  imap: {
    host: env.get('IMAP_HOST'),
    port: env.get('IMAP_PORT', 993),
    user: env.get('IMAP_USER'),
    password: env.get('IMAP_PASSWORD'),
    mailbox: env.get('IMAP_MAILBOX', 'INBOX'),
  },

  vapid: {
    publicKey: env.get('VAPID_PUBLIC_KEY'),
    privateKey: env.get('VAPID_PRIVATE_KEY'),
    subject: env.get('VAPID_SUBJECT', 'mailto:planning@example.com'),
  },

  /** Heure par défaut quand la saisie donne un jour sans heure */
  defaultHour: 9,

  /** Les CRM maison, un par entreprise */
  crms: [
    {
      source: 'crm_a',
      company: 'a',
      name: env.get('CRM_A_NAME', 'Entreprise A'),
      webhookSecret: env.get('CRM_A_WEBHOOK_SECRET'),
      apiUrl: env.get('CRM_A_API_URL'),
      apiToken: env.get('CRM_A_API_TOKEN'),
      urlTemplate: env.get('CRM_A_URL_TEMPLATE'),
    },
    {
      source: 'crm_b',
      company: 'b',
      name: env.get('CRM_B_NAME', 'Entreprise B'),
      webhookSecret: env.get('CRM_B_WEBHOOK_SECRET'),
      apiUrl: env.get('CRM_B_API_URL'),
      apiToken: env.get('CRM_B_API_TOKEN'),
      urlTemplate: env.get('CRM_B_URL_TEMPLATE'),
    },
  ] satisfies CrmSourceConfig[] as CrmSourceConfig[],
}
