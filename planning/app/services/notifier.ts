import { createHash } from 'node:crypto'
import webpush from 'web-push'
import logger from '@adonisjs/core/services/logger'
import router from '@adonisjs/core/services/router'
import planningConfig from '#config/planning'
import PushSubscription from '#models/push_subscription'
import { attentionCounts } from '#services/attention'
import type Task from '#models/task'
import type User from '#models/user'

export interface PushPayload {
  title: string
  body: string
  url: string
  tag?: string
  /** Actions rapides affichées sous la notification (report, fait) */
  actions?: { action: string; title: string; url: string }[]
  /** Pastille sur l'icône de la PWA (retards + à trier) */
  badge?: number
}

let configured = false
function ensureConfigured() {
  if (configured) return true
  const { publicKey, privateKey, subject } = planningConfig.vapid
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export function hashEndpoint(endpoint: string) {
  return createHash('sha256').update(endpoint).digest('hex')
}

export function absoluteUrl(path: string) {
  return new URL(path, planningConfig.appUrl).toString()
}

/** URL signée pour agir sur une tâche depuis la notification, sans session */
export function quickActionUrl(task: Task, action: string) {
  return router
    .builder()
    .params({ id: task.id, action })
    .prefixUrl(planningConfig.appUrl)
    .makeSigned('quick.action', { expiresIn: '7 days' })
}

export function taskActions(task: Task) {
  return [
    { action: 'snooze-1h', title: '+1 h', url: quickActionUrl(task, 'snooze-1h') },
    { action: 'snooze-tomorrow', title: 'Demain', url: quickActionUrl(task, 'snooze-tomorrow') },
    { action: 'done', title: 'Fait', url: quickActionUrl(task, 'done') },
  ]
}

/**
 * Notifications Web Push vers la PWA installée sur l'iPhone (iOS ≥ 16.4) et le Mac
 */
export class Notifier {
  get enabled() {
    return ensureConfigured()
  }

  async push(user: User, payload: PushPayload) {
    if (!ensureConfigured()) {
      logger.debug({ userId: user.id, title: payload.title }, 'web push non configuré')
      return 0
    }
    const subscriptions = await PushSubscription.query().where('user_id', user.id)
    let sent = 0
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 12, urgency: 'high' }
          )
          sent += 1
        } catch (error: any) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            // Abonnement expiré (app supprimée, permissions retirées)
            await sub.delete()
          } else {
            logger.warn({ err: error, endpoint: sub.endpoint }, 'échec web push')
          }
        }
      })
    )
    return sent
  }

  async pushTask(user: User, task: Task, prefix: string) {
    const client = task.$preloaded.client as unknown as { name: string } | undefined
    const { badge } = await attentionCounts(user.id)
    return this.push(user, {
      badge,
      title: `${prefix} ${task.title}`,
      body: [client?.name, task.notes?.slice(0, 120)].filter(Boolean).join(' — ') || 'Planning',
      url: absoluteUrl(`/tasks/${task.id}`),
      tag: `task-${task.id}`,
      actions: taskActions(task),
    })
  }
}

const notifier = new Notifier()
export default notifier
