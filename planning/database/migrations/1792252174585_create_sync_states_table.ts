import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sync_states'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('source', 32).primary()
      table.datetime('last_full_sync').nullable()
      table.datetime('last_event_at').nullable()
      table.text('last_error').nullable()
      table.datetime('created_at').notNullable()
      table.datetime('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
