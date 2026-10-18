import { Exception } from '@adonisjs/core/exceptions'

/**
 * Erreur métier volontaire : code stable, statut HTTP, message destiné à
 * l'utilisateur (en français, sans détail technique).
 *
 *   throw new AppError('CLIENT_NOT_FOUND', 'Ce client n’existe plus.', { status: 404 })
 */
export class AppError extends Exception {
  constructor(
    code: string,
    message: string,
    options: { status?: number; details?: Record<string, unknown>; cause?: unknown } = {}
  ) {
    super(message, { code, status: options.status ?? 400, cause: options.cause })
    this.details = options.details
  }

  declare details?: Record<string, unknown>
}

export interface ErrorDescriptor {
  status: number
  /** Code stable, utile pour chercher dans les logs ou documenter */
  code: string
  /** Message montré à l'utilisateur */
  message: string
  /** 4xx attendus : log en warn ; 5xx : log en error avec la pile */
  expected: boolean
  /** Erreurs de champ (validation) */
  fields?: Record<string, string[]>
  details?: Record<string, unknown>
}

const NETWORK_DB_CODES = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_CON_COUNT_ERROR',
])

/**
 * Traduit n'importe quelle erreur en réponse claire. Les erreurs connues
 * (framework, base, file Redis) ont un message dédié ; le reste devient
 * une erreur interne sans détail exposé.
 */
export function describeError(error: unknown): ErrorDescriptor {
  const e = error as any
  const code: string | undefined = e?.code

  if (error instanceof AppError) {
    const status = error.status
    return {
      status,
      code: code ?? 'APP_ERROR',
      message: error.message,
      expected: status < 500,
      details: error.details,
    }
  }

  switch (code) {
    case 'E_VALIDATION_ERROR': {
      const fields: Record<string, string[]> = {}
      for (const m of e.messages ?? []) (fields[m.field] ??= []).push(m.message)
      const first = (e.messages ?? [])[0]
      return {
        status: 422,
        code: 'VALIDATION_FAILED',
        message: first
          ? `Champ « ${first.field} » : ${first.message}`
          : 'Certains champs sont invalides.',
        expected: true,
        fields,
      }
    }
    case 'E_ROW_NOT_FOUND':
      return {
        status: 404,
        code: 'NOT_FOUND',
        message: 'Cet élément n’existe pas ou a été supprimé.',
        expected: true,
      }
    case 'E_ROUTE_NOT_FOUND':
      return {
        status: 404,
        code: 'ROUTE_NOT_FOUND',
        message: 'Cette page n’existe pas.',
        expected: true,
      }
    case 'E_UNAUTHORIZED_ACCESS':
      return {
        status: 401,
        code: 'UNAUTHENTICATED',
        message: 'Votre session a expiré : reconnectez-vous.',
        expected: true,
      }
    case 'E_INVALID_CREDENTIALS':
      return {
        status: 400,
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect.',
        expected: true,
      }
    case 'E_AUTHORIZATION_FAILURE':
      return {
        status: 403,
        code: 'FORBIDDEN',
        message: 'Vous n’avez pas accès à cet élément.',
        expected: true,
      }
    case 'E_BAD_CSRF_TOKEN':
      return {
        status: 419,
        code: 'PAGE_EXPIRED',
        message: 'La page a expiré. Rechargez-la puis réessayez.',
        expected: true,
      }
    case 'E_TOO_MANY_REQUESTS':
      return {
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        message: 'Trop de requêtes : patientez quelques secondes.',
        expected: true,
      }
    case 'E_REQUEST_ENTITY_TOO_LARGE':
      return {
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Le contenu envoyé est trop volumineux.',
        expected: true,
      }
  }

  if (code && NETWORK_DB_CODES.has(code)) {
    const redis =
      String(e?.message ?? '').includes('6379') || (e?.syscall === 'connect' && e?.port === 6379)
    return redis
      ? {
          status: 503,
          code: 'QUEUE_UNAVAILABLE',
          message: 'La file de traitement (Redis) ne répond pas. Réessayez dans un instant.',
          expected: false,
        }
      : {
          status: 503,
          code: 'DATABASE_UNAVAILABLE',
          message: 'La base de données ne répond pas. Réessayez dans un instant.',
          expected: false,
        }
  }

  const status = typeof e?.status === 'number' && e.status >= 400 && e.status < 600 ? e.status : 500
  if (status < 500) {
    return {
      status,
      code: code ?? `HTTP_${status}`,
      message: e?.message || 'Requête invalide.',
      expected: true,
    }
  }
  return {
    status,
    code: 'INTERNAL_ERROR',
    message: 'Une erreur inattendue s’est produite. Nous avons gardé sa trace.',
    expected: false,
  }
}
