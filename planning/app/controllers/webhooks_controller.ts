import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import vine, { errors as vineErrors } from '@vinejs/vine'
import { adapterFor, crmConfig } from '#services/crm/registry'
import { CrmPayloadError } from '#services/crm/types'
import { verifySignature } from '#services/crm/signature'
import { dispatch } from '#services/queue'

const eventValidator = vine.compile(
  vine.object({
    event: vine.enum(['client.upserted', 'client.deleted', 'date.upserted', 'date.deleted']),
    kind: vine.string().trim().maxLength(64).optional(),
    // Le contenu est contrôlé par l'adaptateur ; les champs à null sont permis
    data: vine.object({}).allowUnknownProperties(),
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

    // Un lot d'événements ou un seul ; tout le lot est contrôlé avant d'être mis en file
    const body = request.body()
    const items = Array.isArray(body.events) ? body.events : [body]
    const adapter = adapterFor(config.source)!
    const events = []
    for (const [index, item] of items.entries()) {
      let event
      try {
        event = await eventValidator.validate(item)
      } catch (error) {
        // Réponse JSON même sans « Accept: application/json » (pas de redirection)
        if (!(error instanceof vineErrors.E_VALIDATION_ERROR)) throw error
        return response.unprocessableEntity({
          error: `événement ${index} invalide`,
          details: error.messages,
        })
      }
      try {
        if (event.event.startsWith('client.')) adapter.mapClient(event.data)
        else adapter.mapDate({ ...event.data, kind: (event.data as any).kind ?? event.kind })
      } catch (error) {
        if (!(error instanceof CrmPayloadError)) throw error
        return response.unprocessableEntity({ error: `événement ${index} : ${error.message}` })
      }
      events.push(event)
    }
    for (const event of events) {
      await dispatch('crm-event', { source: config.source, ...event })
    }
    return response.accepted({ queued: events.length })
  }
}
