import { DateTime } from 'luxon'
import { utc } from '#models/utc'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { Company } from '#config/planning'
import Task from '#models/task'

/**
 * Colonne JSON : MariaDB stocke le JSON en LONGTEXT, on (dé)sérialise à la main
 */
export const jsonList = {
  prepare: (value: string[] | null) => JSON.stringify(value ?? []),
  consume: (value: unknown): string[] => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value.length) {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  },
}

/**
 * Miroir en lecture seule d'une fiche client d'un des CRM
 */
export default class Client extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare company: Company

  @column()
  declare source: string

  @column()
  declare externalId: string

  @column()
  declare name: string

  @column(jsonList)
  declare emails: string[]

  @column(jsonList)
  declare domains: string[]

  @column()
  declare phone: string | null

  @column()
  declare crmUrl: string | null

  @column({ consume: (v) => Boolean(v) })
  declare archived: boolean

  @column.dateTime(utc)
  declare syncedAt: DateTime | null

  @column.dateTime({ ...utc, autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ ...utc, autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Task)
  declare tasks: HasMany<typeof Task>
}
