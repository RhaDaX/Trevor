import { AsyncLocalStorage } from 'node:async_hooks'
import { randomInt } from 'node:crypto'

/**
 * Identifiant de trace : suit une requête, ou un job, de bout en bout
 * (logs, en-tête X-Trace-Id, messages d'erreur, jobs du worker).
 *
 * Format : PLN-7K4M-Q2XD, en base 32 de Crockford (sans I, L, O ni U) :
 * lisible et facile à dicter au téléphone.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const TRACE_ID_PATTERN = /^[A-Z]{2,4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/

export interface TraceContext {
  traceId: string
  /** web, job, cli… */
  origin: string
  userId?: number
}

const storage = new AsyncLocalStorage<TraceContext>()

function block() {
  let out = ''
  for (let i = 0; i < 4; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

export function newTraceId(prefix = 'PLN') {
  return `${prefix}-${block()}-${block()}`
}

/** Normalise un identifiant saisi à la main : « pln 7k4m q2xd » → « PLN-7K4M-Q2XD » */
export function normalizeTraceId(value: string) {
  const compact = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (compact.length < 8) return value.trim().toUpperCase()
  const body = compact.slice(-8)
  const prefix = compact.slice(0, -8) || 'PLN'
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`
}

export function runWithTrace<T>(context: TraceContext, fn: () => T): T {
  return storage.run(context, fn)
}

export function currentTrace(): TraceContext | undefined {
  return storage.getStore()
}

export function currentTraceId(): string | undefined {
  return storage.getStore()?.traceId
}

/** Rattache l'utilisateur à la trace en cours (après authentification) */
export function setTraceUser(userId: number | undefined) {
  const store = storage.getStore()
  if (store && userId) store.userId = userId
}

/**
 * Champs ajoutés à chaque ligne de log (mixin pino) : tous les logs écrits
 * pendant une requête ou un job portent son identifiant, sans rien passer.
 */
export function traceFields() {
  const store = storage.getStore()
  if (!store) return {}
  return store.userId
    ? { traceId: store.traceId, origin: store.origin, userId: store.userId }
    : { traceId: store.traceId, origin: store.origin }
}
