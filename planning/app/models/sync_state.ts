import { DateTime } from 'luxon'
import { utc } from '#models/utc'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class SyncState extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare source: string

  @column.dateTime(utc)
  declare lastFullSync: DateTime | null

  @column.dateTime(utc)
  declare lastEventAt: DateTime | null

  @column()
  declare lastError: string | null

  @column.dateTime({ ...utc, autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ ...utc, autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static async for(source: string) {
    return SyncState.firstOrCreate({ source }, { source })
  }
}
