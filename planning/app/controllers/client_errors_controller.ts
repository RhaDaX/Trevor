import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { currentTraceId } from '#services/trace'

const reportValidator = vine.compile(
  vine.object({
    message: vine.string().trim().maxLength(1000),
    stack: vine.string().maxLength(8000).optional(),
    url: vine.string().maxLength(1000).optional(),
    source: vine.string().maxLength(40).optional(),
    /** Trace de la requête qui a échoué côté navigateur, s'il y en a une */
    relatedTraceId: vine.string().maxLength(40).optional(),
  })
)

/** Au plus 20 signalements par minute et par utilisateur : une boucle d'erreurs ne noie pas les logs */
const WINDOW_MS = 60_000
const LIMIT = 20
const buckets = new Map<string, { start: number; count: number }>()

/**
 * Erreurs JavaScript du navigateur, enregistrées dans les mêmes logs que le
 * serveur ; la référence renvoyée est affichée à l'utilisateur.
 */
export default class ClientErrorsController {
  async store({ request, response, auth, logger }: HttpContext) {
    const key = String(auth.user?.id ?? request.ip())
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || now - bucket.start > WINDOW_MS) buckets.set(key, { start: now, count: 1 })
    else if (++bucket.count > LIMIT) return response.status(429).json({ traceId: currentTraceId() })

    const report = await request.validateUsing(reportValidator)
    logger.warn(
      {
        client: true,
        source: report.source ?? 'window',
        pageUrl: report.url,
        relatedTraceId: report.relatedTraceId,
        userAgent: request.header('user-agent'),
        stack: report.stack,
      },
      `Erreur navigateur : ${report.message}`
    )
    return response.status(201).json({ traceId: currentTraceId() })
  }
}
