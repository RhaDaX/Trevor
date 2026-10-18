import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, targets } from '@adonisjs/core/logger'
import { traceFields } from '#services/trace'

/**
 * Un fichier par rôle (web, worker, cli) : deux processus n'écrivent jamais
 * dans le même fichier. Rotation quotidienne, 14 jours conservés.
 * Rechercher une trace : node ace trace PLN-XXXX-XXXX
 */
const role = process.argv.includes('planning:worker')
  ? 'worker'
  : process.argv.some((arg) => arg.endsWith('server.js') || arg === 'serve')
    ? 'web'
    : 'cli'

const fileTarget = {
  target: 'pino-roll',
  level: env.get('LOG_LEVEL'),
  options: {
    file: app.makePath('storage/logs', role),
    extension: '.log',
    frequency: 'daily',
    dateFormat: 'yyyy-MM-dd',
    limit: { count: 14 },
    mkdir: true,
  },
}

const loggerConfig = defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: 'planning',
      level: env.get('LOG_LEVEL'),
      // traceId, origin et userId sur chaque ligne
      mixin: traceFields,
      // Jamais de secrets dans les logs
      redact: {
        paths: [
          'password',
          '*.password',
          'token',
          '*.token',
          'authorization',
          '*.authorization',
          'headers.cookie',
        ],
        censor: '[masqué]',
      },
      transport: {
        targets: targets()
          .pushIf(!app.inProduction, targets.pretty())
          .pushIf(app.inProduction, targets.file({ destination: 1 }))
          .pushIf(!app.inTest, fileTarget)
          .toArray(),
      },
    },
  },
})

export default loggerConfig

declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}
