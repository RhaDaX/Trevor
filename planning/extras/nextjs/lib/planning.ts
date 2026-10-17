/**
 * Liaison avec l'outil planning, côté CRM Next.js (App Router + Prisma).
 *
 * L'outil ne lit jamais la base du CRM ; il passe par :
 *   1. l'API de lecture  GET /api/planning/clients et /api/planning/dates
 *   2. des webhooks signés envoyés à chaque écriture (voir lib/prisma.ts)
 *
 * Variables d'environnement du CRM :
 *   PLANNING_API_TOKEN       même valeur que CRM_B_API_TOKEN dans l'outil
 *   PLANNING_WEBHOOK_URL     https://planning.example.com/webhooks/crm/crm_b
 *   PLANNING_WEBHOOK_SECRET  même valeur que CRM_B_WEBHOOK_SECRET
 *   APP_URL                  URL publique du CRM (lien vers la fiche client)
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Client, Contract, FollowUp, Invoice } from '@prisma/client'

/* ---------------------------------------------------------------- Format commun */

export interface PlanningClient {
  id: string | number
  name: string
  emails?: string[]
  website?: string | null
  phone?: string | null
  url?: string | null
  deleted?: boolean
}

export interface PlanningDate {
  id: string | number
  /** echeance | renouvellement | relance */
  kind: string
  client_id: string | number | null
  /** "YYYY-MM-DD" pour une date seule, ISO 8601 sinon */
  date: string
  title: string
  done?: boolean
  deleted?: boolean
  remind_days_before?: number | null
}

export type PlanningEvent =
  | { event: 'client.upserted' | 'client.deleted'; data: PlanningClient }
  | { event: 'date.upserted' | 'date.deleted'; data: PlanningDate }

/* ------------------------------------------- À adapter au schéma du CRM */

/** Colonne DATE : Prisma la rend à minuit UTC, on garde le jour seul */
const day = (d: Date) => d.toISOString().slice(0, 10)

export function toPlanningClient(client: Client): PlanningClient {
  return {
    id: client.id,
    name: client.name,
    emails: [client.email, client.billingEmail].filter((e): e is string => Boolean(e)),
    website: client.website,
    phone: client.phone,
    url: process.env.APP_URL ? `${process.env.APP_URL}/clients/${client.id}` : null,
    deleted: Boolean(client.deletedAt),
  }
}

export function contractToPlanning(contract: Contract): PlanningDate {
  return {
    id: contract.id,
    kind: 'renouvellement',
    client_id: contract.clientId,
    date: day(contract.renewalDate),
    title: `Renouvellement ${contract.label}`,
    deleted: Boolean(contract.deletedAt),
  }
}

export function invoiceToPlanning(invoice: Invoice): PlanningDate {
  return {
    id: invoice.id,
    kind: 'echeance',
    client_id: invoice.clientId,
    date: day(invoice.dueDate),
    title: `Échéance facture ${invoice.number}`,
    done: invoice.status === 'paid',
  }
}

export function followUpToPlanning(followUp: FollowUp): PlanningDate {
  return {
    id: followUp.id,
    kind: 'relance',
    client_id: followUp.clientId,
    date: followUp.followUpAt.toISOString(),
    title: `Relance : ${followUp.subject}`,
    done: followUp.done,
  }
}

/* ------------------------------------------------------- API de lecture */

export const PER_PAGE = 200

/** Jeton partagé avec l'outil, comparé en temps constant ; null si valide */
export function rejectUnauthorized(request: Request): Response | null {
  const token = process.env.PLANNING_API_TOKEN
  const expected = Buffer.from(`Bearer ${token ?? ''}`)
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  if (!token || expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return Response.json({ error: 'jeton invalide' }, { status: 401 })
  }
  return null
}

export function readQuery(request: Request) {
  const params = new URL(request.url).searchParams
  const page = Math.max(1, Number(params.get('page')) || 1)
  const raw = params.get('updated_since')
  const since = raw ? new Date(raw) : null
  return { page, since: since && !Number.isNaN(since.getTime()) ? since : null }
}

export function pageOf<T>(all: T[], page: number) {
  const start = (page - 1) * PER_PAGE
  return {
    data: all.slice(start, start + PER_PAGE),
    next_page: start + PER_PAGE < all.length ? page + 1 : null,
  }
}

/* ------------------------------------------------------------- Webhooks */

export async function notifyPlanning(events: PlanningEvent | PlanningEvent[]) {
  const url = process.env.PLANNING_WEBHOOK_URL
  const secret = process.env.PLANNING_WEBHOOK_SECRET
  if (!url || !secret) return

  const body = JSON.stringify(Array.isArray(events) ? { events } : events)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature =
    'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Planning-Timestamp': timestamp,
        'X-Planning-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok)
      console.warn('webhook planning refusé', response.status, await response.text())
  } catch (error) {
    // Pas bloquant : la synchro de nuit par l'API rattrape un webhook perdu
    console.warn('webhook planning en échec', error)
  }
}
