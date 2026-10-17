import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { join, normalize } from 'node:path'
import Task from '#models/task'
import Client from '#models/client'
import type { Company } from '#config/planning'
import taskService from '#services/task_service'
import clientMatcher from '#services/client_matcher'
import { parseUserDate } from '#services/user_dates'
import { isValidRule } from '#services/recurrence'
import { presentClient, presentTask } from '#presenters/task_presenter'
import {
  attachClientValidator,
  captureValidator,
  scheduleValidator,
  snoozeValidator,
  updateTaskValidator,
} from '#validators/task'

const ALARM_SQL = 'COALESCE(snoozed_until, remind_at, due_at)'
const sql = (d: DateTime) => d.toUTC().toSQL({ includeOffset: false })!

export function currentCompany({ session }: HttpContext): Company | null {
  const value = session.get('company')
  return value === 'a' || value === 'b' ? value : null
}

export default class TasksController {
  #base(ctx: HttpContext) {
    return Task.query()
      .where('user_id', ctx.auth.user!.id)
      .withScopes((s) => s.forCompany(currentCompany(ctx)))
      .preload('client')
  }

  async #findOwn(ctx: HttpContext) {
    return Task.query()
      .where('user_id', ctx.auth.user!.id)
      .where('id', ctx.params.id)
      .preload('client')
      .preload('attachments')
      .firstOrFail()
  }

  /** Aujourd'hui : en retard, la journée, les 7 prochains jours */
  async today(ctx: HttpContext) {
    const user = ctx.auth.user!
    const now = DateTime.now()
    const endOfDay = now.setZone(user.timezone).endOf('day')
    const inAWeek = endOfDay.plus({ days: 7 })

    const open = () =>
      this.#base(ctx)
        .withScopes((s) => s.open())
        .whereNotNull('due_at')
        .orderByRaw(`${ALARM_SQL} asc`)

    const [overdue, today, soon] = await Promise.all([
      open().whereRaw(`${ALARM_SQL} < ?`, [sql(now)]),
      open().whereRaw(`${ALARM_SQL} between ? and ?`, [sql(now), sql(endOfDay)]),
      open().whereRaw(`${ALARM_SQL} > ? and ${ALARM_SQL} <= ?`, [sql(endOfDay), sql(inAWeek)]),
    ])

    return ctx.inertia.render('tasks/today', {
      overdue: overdue.map((t) => presentTask(t, now)),
      today: today.map((t) => presentTask(t, now)),
      soon: soon.map((t) => presentTask(t, now)),
    })
  }

  async upcoming(ctx: HttpContext) {
    const now = DateTime.now()
    const tasks = await this.#base(ctx)
      .withScopes((s) => s.open())
      .whereNotNull('due_at')
      .whereRaw(`${ALARM_SQL} >= ?`, [sql(now)])
      .orderByRaw(`${ALARM_SQL} asc`)
      .limit(500)
    return ctx.inertia.render('tasks/upcoming', { tasks: tasks.map((t) => presentTask(t, now)) })
  }

  async done(ctx: HttpContext) {
    const tasks = await this.#base(ctx)
      .whereIn('status', ['done', 'cancelled'])
      .orderByRaw('COALESCE(done_at, updated_at) desc')
      .limit(150)
    return ctx.inertia.render('tasks/done', { tasks: tasks.map((t) => presentTask(t)) })
  }

  /** Boîte « à trier » : chaque tâche se traite en un geste */
  async inbox(ctx: HttpContext) {
    const tasks = await this.#base(ctx).where('status', 'inbox').orderBy('created_at', 'asc')

    // Suggestions de clients pour les rapprochements incertains
    const suggestions: Record<number, ReturnType<typeof presentClient>[]> = {}
    for (const task of tasks) {
      if (task.clientId) continue
      const match = await clientMatcher.byText(task.title, task.company)
      if (match.candidates.length) suggestions[task.id] = match.candidates.map(presentClient)
    }

    return ctx.inertia.render('tasks/inbox', {
      tasks: tasks.map((t) => presentTask(t)),
      suggestions,
    })
  }

  async show(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    return ctx.inertia.render('tasks/show', { task: presentTask(task) })
  }

  /** Saisie rapide (Cmd+K) */
  async store(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(captureValidator)
    const { task } = await taskService.capture(ctx.auth.user!, {
      text: data.text,
      notes: data.notes,
      origin: data.origin ?? 'app',
      clientId: data.client_id,
    })
    ctx.session.flash(
      'success',
      task.status === 'inbox' ? 'Ajoutée à « à trier »' : 'Tâche ajoutée'
    )
    ctx.session.flash('createdTaskId', task.id)
    return ctx.response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    const tz = ctx.auth.user!.timezone
    const data = await ctx.request.validateUsing(updateTaskValidator)

    if (data.recurrence_rule && !isValidRule(data.recurrence_rule)) {
      ctx.session.flashErrors({ recurrence_rule: 'Règle de récurrence invalide' })
      return ctx.response.redirect().back()
    }
    if (data.client_id && !(await Client.find(data.client_id))) {
      ctx.session.flashErrors({ client_id: 'Client introuvable' })
      return ctx.response.redirect().back()
    }

    await taskService.update(task, {
      title: data.title,
      notes: data.notes ?? null,
      dueAt: parseUserDate(data.due_at, tz),
      remindAt: parseUserDate(data.remind_at, tz),
      allDay: data.all_day ?? false,
      priority: data.priority,
      company: data.company ?? null,
      recurrenceRule: data.recurrence_rule || null,
      ...(data.client_id !== undefined ? { clientId: data.client_id } : {}),
    })
    ctx.session.flash('success', 'Enregistré')
    return ctx.response.redirect().back()
  }

  async complete(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    const { next } = await taskService.complete(task)
    ctx.session.flash(
      'success',
      next
        ? `Fait ✓ — prochaine le ${next.dueAt!.setZone(ctx.auth.user!.timezone).toFormat('dd/MM')}`
        : 'Fait ✓'
    )
    ctx.session.flash('undoTaskId', task.id)
    return ctx.response.redirect().back()
  }

  async reopen(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    await taskService.reopen(task)
    return ctx.response.redirect().back()
  }

  async snooze(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    const tz = ctx.auth.user!.timezone
    const { preset, until } = await ctx.request.validateUsing(snoozeValidator)
    const target = until ? parseUserDate(until, tz) : null
    if (!preset && !target) {
      ctx.session.flashErrors({ preset: 'Choisir un report' })
      return ctx.response.redirect().back()
    }
    await taskService.snooze(task, target ?? preset!, tz)
    ctx.session.flash(
      'success',
      `Reporté au ${(task.snoozedUntil ?? task.dueAt)!.setZone(tz).setLocale('fr').toFormat("ccc d LLL 'à' HH'h'mm")}`
    )
    return ctx.response.redirect().back()
  }

  async schedule(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    const { due_at: dueAt, all_day: allDay } = await ctx.request.validateUsing(scheduleValidator)
    await taskService.schedule(task, parseUserDate(dueAt, ctx.auth.user!.timezone), allDay ?? false)
    return ctx.response.redirect().back()
  }

  async attachClient(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    const { client_id: clientId } = await ctx.request.validateUsing(attachClientValidator)
    if (clientId) await Client.findOrFail(clientId)
    await taskService.attachClient(task, clientId)
    return ctx.response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    if (task.sourceRef) {
      // Une tâche CRM supprimée reviendrait à la prochaine synchro : on l'annule
      task.status = 'cancelled'
      await task.save()
    } else {
      await task.delete()
    }
    ctx.session.flash('success', 'Tâche supprimée')
    const referer = ctx.request.header('referer') ?? ''
    return referer.includes(`/tasks/${task.id}`)
      ? ctx.response.redirect().toPath('/today')
      : ctx.response.redirect().back()
  }

  async attachment(ctx: HttpContext) {
    const task = await this.#findOwn(ctx)
    const attachment = task.attachments.find((a) => a.id === Number(ctx.params.attachmentId))
    if (!attachment) return ctx.response.notFound()
    const root = app.makePath('storage/attachments')
    const file = normalize(join(root, attachment.path))
    if (!file.startsWith(root)) return ctx.response.forbidden()
    ctx.response.header('Content-Type', attachment.mime)
    return ctx.response.attachment(file, attachment.filename)
  }
}
