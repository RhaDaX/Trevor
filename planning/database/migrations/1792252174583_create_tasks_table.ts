import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('client_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('clients')
        .onDelete('SET NULL')

      table.string('title', 500).notNullable()
      table.text('notes').nullable()
      table.datetime('due_at').nullable()
      table.datetime('remind_at').nullable()
      table.boolean('all_day').notNullable().defaultTo(false)
      table.enum('status', ['inbox', 'todo', 'done', 'cancelled']).notNullable().defaultTo('inbox')
      table.enum('priority', ['low', 'normal', 'high']).notNullable().defaultTo('normal')
      table.enum('origin', ['mail', 'mac', 'siri', 'app', 'crm']).notNullable().defaultTo('app')
      // Entreprise forcée (#a / #b) quand la tâche n'a pas de client
      table.enum('company', ['a', 'b']).nullable()
      // Rapprochement client incertain : à vérifier dans « à trier »
      table.boolean('client_uncertain').notNullable().defaultTo(false)

      // Tâches auto CRM : "<source>:<external_id>" pour ne jamais dupliquer
      table.string('source_ref', 128).nullable()
      table.string('recurrence_rule', 255).nullable()
      table.datetime('snoozed_until').nullable()
      table.datetime('last_notified_at').nullable()
      table.datetime('done_at').nullable()

      table.datetime('created_at').notNullable()
      table.datetime('updated_at').nullable()

      table.unique(['user_id', 'source_ref'])
      table.index(['user_id', 'status', 'due_at'])
      table.index(['status', 'remind_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
