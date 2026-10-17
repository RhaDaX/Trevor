import type { HttpContext } from '@adonisjs/core/http'
import PushSubscription from '#models/push_subscription'
import { hashEndpoint } from '#services/notifier'
import { pushSubscriptionValidator } from '#validators/settings'

export default class PushController {
  async subscribe({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(pushSubscriptionValidator)
    await PushSubscription.updateOrCreate(
      { endpointHash: hashEndpoint(data.endpoint) },
      {
        userId: auth.user!.id,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: request.header('user-agent')?.slice(0, 250) ?? null,
      }
    )
    return response.noContent()
  }

  async unsubscribe({ auth, request, response }: HttpContext) {
    const endpoint = String(request.input('endpoint', ''))
    await PushSubscription.query()
      .where('user_id', auth.user!.id)
      .where('endpoint_hash', hashEndpoint(endpoint))
      .delete()
    return response.noContent()
  }

  async destroy({ auth, params, response }: HttpContext) {
    await PushSubscription.query().where('user_id', auth.user!.id).where('id', params.id).delete()
    return response.redirect().back()
  }
}
