import { DateTime } from 'luxon'
import { utc } from '#models/utc'
import { BaseModel, belongsTo, column, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { Company } from '#config/planning'
import User from '#models/user'
import Client from '#models/client'
import Attachment from '#models/attachment'

export type TaskStatus = 'inbox' | 'todo' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high'
export type TaskOrigin = 'mail' | 'mac' | 'siri' | 'app' | 'crm'

export const TASK_ORIGINS: TaskOrigin[] = ['mail', 'mac', 'siri', 'app', 'crm']

export default class Task extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare clientId: number | null

  @column()
  declare title: string

  @column()
  declare notes: string | null

  @column.dateTime(utc)
  declare dueAt: DateTime | null

  @column.dateTime(utc)
  declare remindAt: DateTime | null

  @column({ consume: (v) => Boolean(v) })
  declare allDay: boolean

  @column()
  declare status: TaskStatus

  @column()
  declare priority: TaskPriority

  @column()
  declare origin: TaskOrigin

  @column()
  declare company: Company | null

  @column({ consume: (v) => Boolean(v) })
  declare clientUncertain: boolean

  @column()
  declare sourceRef: string | null

  @column()
  declare recurrenceRule: string | null

  @column.dateTime(utc)
  declare snoozedUntil: DateTime | null

  @column.dateTime({ ...utc, serializeAs: null })
  declare lastNotifiedAt: DateTime | null

  @column.dateTime(utc)
  declare doneAt: DateTime | null

  @column.dateTime({ ...utc, autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ ...utc, autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @hasMany(() => Attachment)
  declare attachments: HasMany<typeof Attachment>

  /** Tâches encore à faire (à trier ou planifiées) */
  static open = scope((query) => {
    query.whereIn('status', ['inbox', 'todo'])
  })

  /** Filtre A / B / Tout : par le client, ou par l'entreprise forcée sans client */
  static forCompany = scope((query, company?: Company | null) => {
    if (!company) return
    query.where((q) => {
      q.whereIn('client_id', (c) =>
        c.from('clients').select('id').where('company', company)
      ).orWhere((sub) => sub.whereNull('client_id').where('company', company))
    })
  })

  /** Moment où la tâche doit sonner : report > rappel > échéance */
  get alarmAt(): DateTime | null {
    return this.snoozedUntil ?? this.remindAt ?? this.dueAt
  }

  get isOpen() {
    return this.status === 'inbox' || this.status === 'todo'
  }
}
