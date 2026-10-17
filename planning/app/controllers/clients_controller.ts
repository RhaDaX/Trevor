import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import Task from '#models/task'
import SyncState from '#models/sync_state'
import planningConfig from '#config/planning'
import { presentClient, presentTask } from '#presenters/task_presenter'
import { currentCompany } from '#controllers/tasks_controller'

export default class ClientsController {
  async index(ctx: HttpContext) {
    const q = String(ctx.request.input('q', '')).trim()
    const page = Number(ctx.request.input('page', 1)) || 1
    const company = currentCompany(ctx)

    const query = Client.query().where('archived', false).orderBy('name', 'asc')
    if (company) query.where('company', company)
    if (q) {
      query.where((sub) =>
        sub
          .where('name', 'like', `%${q}%`)
          .orWhere('emails', 'like', `%${q}%`)
          .orWhere('domains', 'like', `%${q}%`)
      )
    }
    const clients = await query
      .withCount('tasks', (t) => t.whereIn('status', ['inbox', 'todo']).as('openTasks'))
      .paginate(page, 50)

    const syncStates = await SyncState.all()
    return ctx.inertia.render('clients/index', {
      q,
      clients: clients.all().map((c) => ({
        ...presentClient(c)!,
        openTasks: Number(c.$extras.openTasks ?? 0),
      })),
      meta: clients.getMeta(),
      sync: planningConfig.crms.map((crm) => {
        const state = syncStates.find((s) => s.source === crm.source)
        return {
          source: crm.source,
          name: crm.name,
          company: crm.company,
          lastFullSync: state?.lastFullSync?.toISO() ?? null,
          lastEventAt: state?.lastEventAt?.toISO() ?? null,
          lastError: state?.lastError ?? null,
        }
      }),
    })
  }

  async show(ctx: HttpContext) {
    const client = await Client.findOrFail(ctx.params.id)
    const tasks = await Task.query()
      .where('user_id', ctx.auth.user!.id)
      .where('client_id', client.id)
      .preload('client')
      .orderByRaw("FIELD(status, 'inbox', 'todo', 'done', 'cancelled')")
      .orderBy('due_at', 'asc')
      .limit(200)
    return ctx.inertia.render('clients/show', {
      client: presentClient(client),
      tasks: tasks.map((t) => presentTask(t)),
    })
  }
}
