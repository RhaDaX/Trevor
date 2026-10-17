import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import taskService from '#services/task_service'

/**
 * Actions depuis une notification push (URL signée, sans session) :
 * snooze-1h, snooze-tomorrow, snooze-monday, done
 */
export default class QuickActionsController {
  async handle({ request, params, response }: HttpContext) {
    if (!request.hasValidSignature()) return response.forbidden({ error: 'lien expiré' })
    const task = await Task.query().where('id', params.id).preload('user').firstOrFail()
    const action = String(params.action)

    if (action === 'done') {
      if (task.isOpen) await taskService.complete(task)
    } else if (action.startsWith('snooze-')) {
      const preset = action.slice('snooze-'.length)
      if (!['1h', '3h', 'tonight', 'tomorrow', 'monday', 'nextweek'].includes(preset)) {
        return response.badRequest({ error: 'report inconnu' })
      }
      await taskService.snooze(task, preset as any, task.user.timezone)
    } else {
      return response.badRequest({ error: 'action inconnue' })
    }
    return response.json({ ok: true, status: task.status })
  }
}
