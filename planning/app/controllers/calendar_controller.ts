import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { buildCalendar } from '#services/calendar_service'

export default class CalendarController {
  async show({ params, response }: HttpContext) {
    const user = await User.findBy('calendar_token', String(params.token))
    if (!user) return response.notFound('Calendrier introuvable')
    const body = await buildCalendar(user)
    response.header('Content-Type', 'text/calendar; charset=utf-8')
    response.header('Cache-Control', 'no-cache')
    return response.send(body)
  }
}
