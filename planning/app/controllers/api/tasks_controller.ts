import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Task from '#models/task'
import taskService from '#services/task_service'
import { presentTask } from '#presenters/task_presenter'
import { captureValidator } from '#validators/task'

/**
 * API commune à tous les canaux : POST /api/tasks
 * Siri, Raycast/Raccourci Mac : Authorization: Bearer <jeton personnel>
 */
export default class ApiTasksController {
  async store({ request, auth, response }: HttpContext) {
    // Raccourcis Apple : accepte aussi un corps texte brut
    const body = request.is(['text/plain']) ? { text: request.raw() ?? '' } : request.all()
    const data = await captureValidator.validate({
      ...body,
      origin: body.origin ?? request.header('x-planning-origin'),
    })
    const { task } = await taskService.capture(auth.user!, {
      text: data.text,
      notes: data.notes,
      origin: data.origin ?? 'app',
      clientId: data.client_id,
    })

    const tz = auth.user!.timezone
    const when = task.dueAt
      ? task.dueAt
          .setZone(tz)
          .setLocale('fr')
          .toFormat(task.allDay ? 'cccc d LLLL' : "cccc d LLLL 'à' HH'h'mm")
      : null
    return response.created({
      task: presentTask(task),
      // Phrase lue par Siri en retour
      message: [
        task.status === 'inbox' ? `« ${task.title} » ajoutée à trier` : `« ${task.title} » ajoutée`,
        when ? `pour ${when}` : null,
        task.client ? `client ${task.client.name}` : null,
      ]
        .filter(Boolean)
        .join(', '),
    })
  }

  async index({ request, auth, response }: HttpContext) {
    const view = request.input('view', 'today')
    const user = auth.user!
    const query = Task.query()
      .where('user_id', user.id)
      .withScopes((s) => s.open())
      .preload('client')
      .orderByRaw('COALESCE(snoozed_until, remind_at, due_at) asc')
      .limit(100)
    if (view === 'inbox') query.where('status', 'inbox')
    else {
      const end = DateTime.now()
        .setZone(user.timezone)
        .endOf('day')
        .toUTC()
        .toSQL({ includeOffset: false })!
      query
        .whereNotNull('due_at')
        .whereRaw('COALESCE(snoozed_until, remind_at, due_at) <= ?', [end])
    }
    const tasks = await query
    return response.json({ tasks: tasks.map((t) => presentTask(t)) })
  }
}
