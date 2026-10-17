import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import Task from '#models/task'
import User from '#models/user'
import notifier, { absoluteUrl } from '#services/notifier'
import { endOfLocalDay } from '#services/dates'

/** Moment où une tâche sonne : report > rappel > échéance */
const ALARM_SQL = 'COALESCE(snoozed_until, remind_at, due_at)'

/**
 * Passe chaque minute (worker) :
 * 1. sonne les tâches arrivées à échéance ;
 * 2. relance les tâches en retard à intervalle réglable, en journée ;
 * 3. envoie le récap du matin à l'heure choisie.
 */
export class Reminders {
  async tick(now: DateTime = DateTime.now()) {
    const users = await User.all()
    let notified = 0
    for (const user of users) {
      notified += await this.ringDue(user, now)
      notified += await this.nagOverdue(user, now)
      await this.morningRecap(user, now)
    }
    return notified
  }

  /** Première alerte : la date est passée et rien n'a encore été envoyé depuis */
  async ringDue(user: User, now: DateTime) {
    const nowSql = now.toUTC().toSQL({ includeOffset: false })!
    const tasks = await Task.query()
      .withScopes((s) => s.open())
      .where('user_id', user.id)
      .whereRaw(`${ALARM_SQL} <= ?`, [nowSql])
      .where((q) => q.whereNull('last_notified_at').orWhereRaw(`last_notified_at < ${ALARM_SQL}`))
      .preload('client')

    for (const task of tasks) {
      await notifier.pushTask(user, task, '⏰')
      task.lastNotifiedAt = now
      await task.save()
    }
    return tasks.length
  }

  /** Relance insistante jusqu'à ce que la tâche soit cochée ou reportée */
  async nagOverdue(user: User, now: DateTime) {
    if (!user.nagIntervalMinutes) return 0
    const local = now.setZone(user.timezone)
    if (local.hour < user.nagStartHour || local.hour >= user.nagEndHour) return 0
    if (local.weekday > 5) return 0

    const threshold = now.minus({ minutes: user.nagIntervalMinutes }).toUTC()
    const tasks = await Task.query()
      .withScopes((s) => s.open())
      .where('user_id', user.id)
      .whereRaw(`${ALARM_SQL} <= ?`, [now.toUTC().toSQL({ includeOffset: false })!])
      .whereNotNull('last_notified_at')
      .where('last_notified_at', '<=', threshold.toSQL({ includeOffset: false })!)
      .preload('client')

    for (const task of tasks) {
      await notifier.pushTask(user, task, '🔁 En retard :')
      task.lastNotifiedAt = now
      await task.save()
    }
    return tasks.length
  }

  async recapData(user: User, now: DateTime = DateTime.now()) {
    const startOfDay = now.setZone(user.timezone).startOf('day').toUTC()
    const endOfDay = endOfLocalDay(user.timezone, now).toUTC()
    const sql = (d: DateTime) => d.toSQL({ includeOffset: false })!

    const base = () =>
      Task.query()
        .withScopes((s) => s.open())
        .where('user_id', user.id)
        .preload('client')
        .orderByRaw(`${ALARM_SQL} asc`)

    const [overdue, today, inbox] = await Promise.all([
      base()
        .whereNotNull('due_at')
        .whereRaw(`${ALARM_SQL} < ?`, [sql(startOfDay)]),
      base().whereRaw(`${ALARM_SQL} between ? and ?`, [sql(startOfDay), sql(endOfDay)]),
      Task.query()
        .where('user_id', user.id)
        .where('status', 'inbox')
        .preload('client')
        .orderBy('created_at', 'asc'),
    ])
    return { overdue, today, inbox }
  }

  async morningRecap(user: User, now: DateTime, force = false) {
    const local = now.setZone(user.timezone)
    const todayIso = local.toISODate()
    if (!force) {
      if (user.lastRecapOn?.toISODate() === todayIso) return false
      const recapTime = local.set({ hour: user.recapHour, minute: user.recapMinute, second: 0 })
      if (local < recapTime) return false
    }

    const { overdue, today, inbox } = await this.recapData(user, now)
    const lines = (tasks: Task[]) =>
      tasks.map((t) => ({
        title: t.title,
        client: t.client?.name ?? null,
        time: t.dueAt && !t.allDay ? t.dueAt.setZone(user.timezone).toFormat('HH:mm') : null,
        date: t.dueAt ? t.dueAt.setZone(user.timezone).toFormat('dd/MM') : null,
        url: absoluteUrl(`/tasks/${t.id}`),
      }))

    try {
      await mail.send((message) => {
        message
          .to(user.email)
          .subject(
            `Planning du ${local.setLocale('fr').toFormat('cccc d LLLL')} — ` +
              `${today.length} aujourd'hui, ${overdue.length} en retard, ${inbox.length} à trier`
          )
          .htmlView('emails/morning_recap', {
            user,
            dateLabel: local.setLocale('fr').toFormat('cccc d LLLL'),
            overdue: lines(overdue),
            today: lines(today),
            inbox: lines(inbox),
            appUrl: absoluteUrl('/today'),
            inboxUrl: absoluteUrl('/inbox'),
          })
      })
    } catch (error) {
      logger.error({ err: error, userId: user.id }, 'échec du mail de récap')
    }

    await notifier.push(user, {
      title: `☀️ ${today.length} aujourd'hui · ${overdue.length} en retard · ${inbox.length} à trier`,
      body:
        [...overdue, ...today]
          .slice(0, 4)
          .map((t) => `• ${t.title}`)
          .join('\n') || 'Rien de prévu',
      url: absoluteUrl(inbox.length ? '/inbox' : '/today'),
      tag: 'morning-recap',
      badge: overdue.length + inbox.length,
    })

    user.lastRecapOn = local.startOf('day')
    await user.save()
    return true
  }
}

const reminders = new Reminders()
export default reminders
