import { DateTime } from 'luxon'
import { utc } from '#models/utc'
import { randomBytes } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import Task from '#models/task'
import PushSubscription from '#models/push_subscription'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static accessTokens = DbAccessTokensProvider.forModel(User, {
    prefix: 'plt_',
    table: 'auth_access_tokens',
  })

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column({ serializeAs: null })
  declare calendarToken: string

  @column()
  declare timezone: string

  @column()
  declare nagIntervalMinutes: number

  @column()
  declare nagStartHour: number

  @column()
  declare nagEndHour: number

  @column()
  declare recapHour: number

  @column()
  declare recapMinute: number

  @column.date()
  declare lastRecapOn: DateTime | null

  @column.dateTime({ ...utc, autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ ...utc, autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Task)
  declare tasks: HasMany<typeof Task>

  @hasMany(() => PushSubscription)
  declare pushSubscriptions: HasMany<typeof PushSubscription>

  @beforeCreate()
  static assignCalendarToken(user: User) {
    if (!user.calendarToken) user.calendarToken = User.newCalendarToken()
  }

  static newCalendarToken() {
    return randomBytes(24).toString('hex')
  }
}
