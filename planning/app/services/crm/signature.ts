import { createHmac, timingSafeEqual } from 'node:crypto'

/** Tolérance sur l'horodatage pour refuser les rejeux */
export const MAX_SKEW_SECONDS = 300

/**
 * Signature HMAC-SHA256 de « <timestamp>.<corps brut> », envoyée par les CRM dans
 * X-Planning-Signature: sha256=<hex> et X-Planning-Timestamp: <secondes unix>
 */
export function sign(secret: string, timestamp: string | number, body: string) {
  return 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

export function verifySignature(
  secret: string,
  timestamp: string | undefined,
  body: string,
  signature: string | undefined,
  now: number = Math.floor(Date.now() / 1000)
) {
  if (!secret || !timestamp || !signature) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_SECONDS) return false

  const expected = Buffer.from(sign(secret, timestamp, body))
  const given = Buffer.from(signature.trim())
  return expected.length === given.length && timingSafeEqual(expected, given)
}
