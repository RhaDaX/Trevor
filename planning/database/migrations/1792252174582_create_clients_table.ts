import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.enum('company', ['a', 'b']).notNullable()
      table.string('source', 32).notNullable()
      table.string('external_id', 64).notNullable()
      table.string('name').notNullable()
      // Listes JSON (MariaDB : LONGTEXT avec contrôle JSON)
      table.json('emails').notNullable()
      table.json('domains').notNullable()
      table.string('phone', 64).nullable()
      table.string('crm_url', 512).nullable()
      // Fiche supprimée côté CRM : on garde le miroir pour l'historique des tâches
      table.boolean('archived').notNullable().defaultTo(false)
      table.datetime('synced_at').nullable()
      table.datetime('created_at').notNullable()
      table.datetime('updated_at').nullable()

      table.unique(['source', 'external_id'])
      table.index(['company'])
      table.index(['name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
