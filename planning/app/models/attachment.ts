import { DateTime } from 'luxon'
import { utc } from '#models/utc'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Task from '#models/task'

export default class Attachment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare taskId: number

  @column()
  declare filename: string

  /** Chemin relatif au dossier de stockage (storage/attachments) */
  @column({ serializeAs: null })
  declare path: string

  @column()
  declare mime: string

  @column()
  declare size: number

  @column.dateTime({ ...utc, autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ ...utc, autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Task)
  declare task: BelongsTo<typeof Task>
}
