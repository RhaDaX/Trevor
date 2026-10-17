import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import PushSubscription from '#models/push_subscription'
import planningConfig from '#config/planning'
import notifier, { absoluteUrl } from '#services/notifier'
import { settingsValidator, tokenValidator } from '#validators/settings'

export default class SettingsController {
  async show({ auth, inertia, request }: HttpContext) {
    const user = auth.user!
    const tokens = await User.accessTokens.all(user)
    const devices = await PushSubscription.query()
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
    return inertia.render('settings/index', {
      settings: {
        fullName: user.fullName,
        email: user.email,
        timezone: user.timezone,
        nagIntervalMinutes: user.nagIntervalMinutes,
        nagStartHour: user.nagStartHour,
        nagEndHour: user.nagEndHour,
        recapHour: user.recapHour,
        recapMinute: user.recapMinute,
      },
      calendarUrl: absoluteUrl(`/calendar/${user.calendarToken}.ics`),
      apiUrl: absoluteUrl('/api/tasks'),
      tokens: tokens.map((t) => ({
        id: t.identifier,
        name: t.name,
        createdAt: t.createdAt.toISOString(),
        lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
      })),
      push: {
        enabled: notifier.enabled,
        publicKey: planningConfig.vapid.publicKey ?? null,
        devices: devices.map((s) => ({
          id: s.id,
          userAgent: s.userAgent,
          createdAt: s.createdAt.toISO(),
        })),
      },
      host: request.host(),
    })
  }

  async update({ auth, request, session, response }: HttpContext) {
    const data = await request.validateUsing(settingsValidator)
    if (!DateTime.local().setZone(data.timezone).isValid) {
      session.flashErrors({ timezone: 'Fuseau horaire inconnu' })
      return response.redirect().back()
    }
    const user = auth.user!
    user.merge({
      fullName: data.full_name ?? null,
      timezone: data.timezone,
      nagIntervalMinutes: data.nag_interval_minutes,
      nagStartHour: data.nag_start_hour,
      nagEndHour: data.nag_end_hour,
      recapHour: data.recap_hour,
      recapMinute: data.recap_minute,
    })
    await user.save()
    session.flash('success', 'Réglages enregistrés')
    return response.redirect().back()
  }

  /** Jeton personnel par appareil (Siri, Raycast…) — affiché une seule fois */
  async createToken({ auth, request, session, response }: HttpContext) {
    const { name } = await request.validateUsing(tokenValidator)
    const token = await User.accessTokens.create(auth.user!, ['tasks:create'], { name })
    session.flash('newToken', { name, value: token.value!.release() })
    return response.redirect().back()
  }

  async revokeToken({ auth, params, session, response }: HttpContext) {
    await User.accessTokens.delete(auth.user!, params.id)
    session.flash('success', 'Jeton révoqué')
    return response.redirect().back()
  }

  async regenerateCalendar({ auth, session, response }: HttpContext) {
    const user = auth.user!
    user.calendarToken = User.newCalendarToken()
    await user.save()
    session.flash('success', 'Nouvelle adresse iCal : pensez à vous réabonner')
    return response.redirect().back()
  }

  async testPush({ auth, session, response }: HttpContext) {
    const sent = await notifier.push(auth.user!, {
      title: '🔔 Test de notification',
      body: 'Les rappels arriveront ici.',
      url: absoluteUrl('/today'),
      tag: 'test',
    })
    session.flash(
      sent ? 'success' : 'error',
      sent ? `Envoyée à ${sent} appareil(s)` : 'Aucun appareil abonné'
    )
    return response.redirect().back()
  }
}
