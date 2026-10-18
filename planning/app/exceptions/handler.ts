import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { describeError } from '#exceptions/app_error'
import { currentTraceId } from '#services/trace'

/** Requêtes qui attendent du JSON : API, webhooks, actions de notification, appels fetch */
function wantsJson(ctx: HttpContext) {
  const url = ctx.request.url()
  if (/^\/(api|webhooks|q|search|push|client-errors)(\/|$)/.test(url)) return true
  if (ctx.request.header('x-inertia')) return false
  return ctx.request.accepts(['html', 'json']) === 'json'
}

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction
  protected renderStatusPages = false

  async handle(error: unknown, ctx: HttpContext) {
    const described = describeError(error)
    const traceId = currentTraceId() ?? 'PLN-INCONNU'
    ctx.response.header('X-Trace-Id', traceId)

    if (wantsJson(ctx)) {
      return ctx.response.status(described.status).json({
        error: {
          code: described.code,
          message: described.message,
          traceId,
          ...(described.fields ? { fields: described.fields } : {}),
        },
      })
    }

    // Validation et session : comportement Inertia standard (erreurs de champ, retour à la page)
    if (described.code === 'VALIDATION_FAILED' || described.code === 'UNAUTHENTICATED') {
      return super.handle(error, ctx)
    }

    // Action (POST, PUT, DELETE) depuis l'app : message clair et retour à la page
    if (ctx.request.method() !== 'GET' && ctx.session) {
      ctx.session.flash('error', described.message)
      ctx.session.flash('errorRef', traceId)
      return ctx.response.redirect().back()
    }

    // Page demandée en développement : page de debug détaillée pour les 5xx
    if (this.debug && described.status >= 500) return super.handle(error, ctx)

    const page = described.status === 404 ? 'errors/not_found' : 'errors/server_error'
    // La valeur renvoyée par handle n'est pas envoyée : on écrit la réponse nous-mêmes
    const rendered = await ctx.inertia.render(page, {
      error: {
        code: described.code,
        message: described.message,
        status: described.status,
        traceId,
      },
    })
    return ctx.response.status(described.status).send(rendered)
  }

  async report(error: unknown, ctx: HttpContext) {
    const described = describeError(error)
    const e = error as any
    const fields = {
      code: described.code,
      status: described.status,
      method: ctx.request.method(),
      url: ctx.request.url(),
      route: ctx.route?.pattern,
    }
    // 404 et validation : simple information ; autres 4xx : warn ; 5xx : error avec la pile
    if (described.expected) {
      const level = described.status === 404 || described.status === 422 ? 'info' : 'warn'
      ctx.logger[level](
        { ...fields, reason: e?.message },
        `${described.code} : ${described.message}`
      )
    } else {
      ctx.logger.error({ ...fields, err: error }, `${described.code} : ${e?.message ?? error}`)
    }
  }
}
