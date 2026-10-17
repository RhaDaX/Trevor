import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import Task from '#models/task'
import planningConfig from '#config/planning'
import { parseTask } from '#services/task_parser'
import clientMatcher from '#services/client_matcher'
import { presentClient, presentTask } from '#presenters/task_presenter'

/**
 * Cmd+K : recherche et aperçu de la tâche qui serait créée, au même endroit
 */
export default class SearchController {
  async handle({ request, auth, response }: HttpContext) {
    const user = auth.user!
    const q = String(request.input('q', '')).trim().slice(0, 500)
    if (!q) return response.json({ clients: [], tasks: [], preview: null })

    const parsed = parseTask(q, {
      timezone: user.timezone,
      defaultHour: planningConfig.defaultHour,
    })
    const terms = parsed.title || q

    const [clients, tasks, match] = await Promise.all([
      Client.query()
        .where('archived', false)
        .where((sub) =>
          sub
            .where('name', 'like', `%${terms}%`)
            .orWhere('emails', 'like', `%${terms}%`)
            .orWhere('domains', 'like', `%${terms}%`)
        )
        .orderBy('name')
        .limit(6),
      Task.query()
        .where('user_id', user.id)
        .where((sub) =>
          sub.where('title', 'like', `%${terms}%`).orWhere('notes', 'like', `%${terms}%`)
        )
        .preload('client')
        .orderByRaw("FIELD(status, 'inbox', 'todo', 'done', 'cancelled')")
        .orderBy('updated_at', 'desc')
        .limit(8),
      clientMatcher.byText(parsed.title, parsed.company),
    ])

    return response.json({
      clients: clients.map(presentClient),
      tasks: tasks.map((t) => presentTask(t)),
      preview: {
        title: parsed.title,
        dueAt: parsed.dueAt?.toISO() ?? null,
        allDay: parsed.allDay,
        priority: parsed.priority,
        company: parsed.company,
        recurrenceRule: parsed.recurrenceRule,
        dateText: parsed.dateText,
        client: presentClient(match.client),
        clientUncertain: match.uncertain,
        goesToInbox: !parsed.dueAt || (!match.client && match.uncertain),
      },
    })
  }
}
