import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'mysql',
  connections: {
    mysql: {
      client: 'mysql2',
      connection: {
        // Socket local s'il est fourni (dev sur Mac), sinon TCP
        ...(env.get('DB_SOCKET')
          ? { socketPath: env.get('DB_SOCKET') }
          : { host: env.get('DB_HOST'), port: env.get('DB_PORT') }),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
        // Toutes les dates sont stockées en UTC
        timezone: 'Z',
        charset: 'utf8mb4',
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
