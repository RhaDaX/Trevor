/**
 * Erreurs côté navigateur : messages clairs, référence de trace, et
 * remontée dans les logs du serveur.
 */

export const TOAST_EVENT = 'planning:toast'

export interface ToastDetail {
  text: string
  tone?: 'ok' | 'error'
  /** Référence à communiquer (PLN-XXXX-XXXX) */
  traceId?: string | null
}

export function showToast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail }))
}

/** Erreur renvoyée par le serveur au format { error: { code, message, traceId } } */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly traceId: string | null
  ) {
    super(message)
  }
}

export function xsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/** fetch JSON : en cas d'échec, une ApiError avec le message du serveur et sa trace */
export async function requestJson<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      credentials: 'same-origin',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfToken() } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new ApiError('Connexion impossible : vérifiez votre réseau.', 'NETWORK_ERROR', 0, null)
  }
  const traceId = response.headers.get('x-trace-id')
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      body?.error?.message ?? `Le serveur a répondu ${response.status}.`,
      body?.error?.code ?? `HTTP_${response.status}`,
      response.status,
      body?.error?.traceId ?? traceId
    )
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const recent = new Map<string, number>()

/**
 * Envoie une erreur JavaScript au serveur, qui la journalise avec une trace ;
 * renvoie cette trace pour l'afficher. Une même erreur n'est envoyée qu'une
 * fois par minute.
 */
export async function reportClientError(
  error: unknown,
  context: { source?: string; relatedTraceId?: string | null } = {}
): Promise<string | null> {
  const err = error instanceof Error ? error : new Error(String(error))
  const key = `${err.message}|${context.source ?? ''}`
  const last = recent.get(key)
  if (last && Date.now() - last < 60_000) return null
  recent.set(key, Date.now())
  try {
    const result = await requestJson<{ traceId: string }>('/client-errors', {
      method: 'POST',
      keepalive: true,
      body: JSON.stringify({
        message: err.message.slice(0, 1000),
        stack: err.stack?.slice(0, 8000),
        url: window.location.href.slice(0, 1000),
        source: context.source,
        relatedTraceId: context.relatedTraceId ?? undefined,
      }),
    })
    return result?.traceId ?? null
  } catch {
    return null
  }
}

/** Capture les erreurs JavaScript non gérées de la page */
export function installGlobalErrorHandlers() {
  const handle = async (error: unknown, source: string) => {
    const traceId = await reportClientError(error, { source })
    if (traceId)
      showToast({ tone: 'error', text: 'Un problème est survenu dans la page.', traceId })
  }
  window.addEventListener('error', (event) => {
    // Erreurs d'extensions ou de scripts tiers : ignorées
    if (event.filename && !event.filename.startsWith(window.location.origin)) return
    handle(event.error ?? event.message, 'window.error')
  })
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof ApiError) {
      showToast({ tone: 'error', text: event.reason.message, traceId: event.reason.traceId })
      return
    }
    if ((event.reason as Error)?.name === 'AbortError') return
    handle(event.reason, 'unhandledrejection')
  })
}
