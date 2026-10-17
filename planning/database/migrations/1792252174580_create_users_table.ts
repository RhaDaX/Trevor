import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()

      // Jeton secret du flux iCal (/calendar/:token.ics)
      table.string('calendar_token', 64).notNullable().unique()
      table.string('timezone', 64).notNullable().defaultTo('Europe/Paris')

      // Relance insistante des tâches en retard
      table.integer('nag_interval_minutes').unsigned().notNullable().defaultTo(120)
      table.tinyint('nag_start_hour').unsigned().notNullable().defaultTo(8)
      table.tinyint('nag_end_hour').unsigned().notNullable().defaultTo(19)

      // Récap du matin
      table.tinyint('recap_hour').unsigned().notNullable().defaultTo(8)
      table.tinyint('recap_minute').unsigned().notNullable().defaultTo(0)
      table.date('last_recap_on').nullable()

      table.datetime('created_at').notNullable()
      table.datetime('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
