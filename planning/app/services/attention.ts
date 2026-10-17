import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

/**
 * Ce qui réclame l'attention : tâches en retard et boîte « à trier ».
 * Sert à la pastille de l'icône (Badging API) et à la navigation.
 */
export async function attentionCounts(userId: number, now: DateTime = DateTime.now()) {
  const nowSql = now.toUTC().toSQL({ includeOffset: false })!
  const row = await db
    .from('tasks')
    .where('user_id', userId)
    .select(
      db.raw(
        `SUM(CASE WHEN status IN ('inbox', 'todo') AND COALESCE(snoozed_until, remind_at, due_at) < ? THEN 1 ELSE 0 END) AS overdue`,
        [nowSql]
      ),
      db.raw(`SUM(CASE WHEN status = 'inbox' THEN 1 ELSE 0 END) AS inbox`)
    )
    .first()
  const overdue = Number(row?.overdue ?? 0)
  const inbox = Number(row?.inbox ?? 0)
  return { overdue, inbox, badge: overdue + inbox }
}
