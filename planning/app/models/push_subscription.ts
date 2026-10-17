import { DateTime } from 'luxon'
import { utc } from '#models/utc'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class PushSubscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare endpoint: string

  @column({ serializeAs: null })
  declare endpointHash: string

  @column({ serializeAs: null })
  declare p256dh: string

  @column({ serializeAs: null })
  declare auth: string

  @column()
  declare userAgent: string | null

  @column.dateTime({ ...utc, autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ ...utc, autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
