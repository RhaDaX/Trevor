import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import vine from '@vinejs/vine'
import { crmConfig } from '#services/crm/sql_crm_adapter'
import { verifySignature } from '#services/crm/signature'
import { dispatch } from '#services/queue'

const eventValidator = vine.compile(
  vine.object({
    event: vine.enum(['client.upserted', 'client.deleted', 'date.upserted', 'date.deleted']),
    kind: vine.string().trim().maxLength(64).optional(),
    data: vine.record(vine.any()),
  })
)

/**
 * /webhooks/crm/:source — vérifie la signature HMAC, met l'événement en file,
 * un job applique le changement.
 */
export default class WebhooksController {
  async crm({ params, request, response }: HttpContext) {
    const config = crmConfig(params.source)
    if (!config?.webhookSecret) return response.notFound({ error: 'source inconnue' })

    const raw = request.raw() ?? ''
    const valid = verifySignature(
      config.webhookSecret,
      request.header('x-planning-timestamp'),
      raw,
      request.header('x-planning-signature')
    )
    if (!valid) {
      logger.warn({ source: params.source }, 'webhook CRM : signature invalide')
      return response.unauthorized({ error: 'signature invalide' })
    }

    // Un lot d'événements ou un seul
    const body = request.body()
    const events = Array.isArray(body.events) ? body.events : [body]
    for (const item of events) {
      const event = await eventValidator.validate(item)
      if (event.event.startsWith('date.') && !event.kind) {
        return response.unprocessableEntity({ error: 'kind requis pour un événement date' })
      }
      await dispatch('crm-event', { source: config.source, ...event })
    }
    return response.accepted({ queued: events.length })
  }
}
