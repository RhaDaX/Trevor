import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { newTraceId, runWithTrace, TRACE_ID_PATTERN } from '#services/trace'

/** Fichiers statiques et sondes : pas de ligne de log pour eux */
const QUIET =
  /^\/(assets|icons|inertia|node_modules|@vite|@id|@fs|@react-refresh|sw\.js|manifest\.webmanifest|favicon|health)/

/**
 * Premier middleware : ouvre la trace de la requête. Un appelant peut
 * transmettre la sienne (X-Trace-Id), sinon une nouvelle est créée.
 */
export default class TraceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const incoming = (ctx.request.header('x-trace-id') ?? '').trim().toUpperCase()
    const traceId = TRACE_ID_PATTERN.test(incoming) ? incoming : newTraceId()
    ctx.response.header('X-Trace-Id', traceId)

    return runWithTrace({ traceId, origin: 'web' }, async () => {
      const started = process.hrtime.bigint()
      try {
        await next()
      } finally {
        const url = ctx.request.url()
        if (!QUIET.test(url)) {
          const status = ctx.response.getStatus()
          const durationMs = Number((process.hrtime.bigint() - started) / 1_000_000n)
          ctx.logger[status >= 500 ? 'error' : 'info'](
            { method: ctx.request.method(), url, status, durationMs, route: ctx.route?.pattern },
            `${ctx.request.method()} ${url} → ${status} (${durationMs} ms)`
          )
        }
      }
    })
  }
}
