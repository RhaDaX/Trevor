/**
 * À ajouter dans chaque CRM maison (exemple AdonisJS 6) : l'outil planning
 * ne lit jamais la base du CRM, il passe uniquement par ces deux canaux.
 *
 *  1. API de lecture (synchro de nuit, rattrapage d'un webhook perdu)
 *       GET /api/planning/clients?updated_since=<ISO>&page=<n>
 *       GET /api/planning/dates?updated_since=<ISO>&page=<n>
 *     → { data: [...], next_page: number | null }
 *     Protégée par un jeton : Authorization: Bearer <PLANNING_API_TOKEN>
 *
 *  2. Webhooks sortants signés à chaque création / modification / suppression
 *       POST <outil>/webhooks/crm/crm_a   (crm_b pour l'autre CRM)
 *
 * Variables côté CRM :
 *   PLANNING_API_TOKEN       = même valeur que CRM_A_API_TOKEN dans l'outil
 *   PLANNING_WEBHOOK_URL     = https://planning.example.com/webhooks/crm/crm_a
 *   PLANNING_WEBHOOK_SECRET  = même valeur que CRM_A_WEBHOOK_SECRET
 *
 * Les noms de modèles et de colonnes ci-dessous (Client, Contract, Invoice,
 * FollowUp, renewalDate…) sont à adapter aux tables réelles du CRM :
 * seules les fonctions `toPlanning*` connaissent le schéma.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import { DateTime } from 'luxon'
// import Client from '#models/client'
// import Contract from '#models/contract'
// import Invoice from '#models/invoice'
// import FollowUp from '#models/follow_up'

/* -------------------------------------------------------------------------- */
/* Format commun attendu par l'outil planning                                  */
/* -------------------------------------------------------------------------- */

export interface PlanningClient {
  id: string | number
  name: string
  emails?: string[]
  website?: string | null
  phone?: string | null
  /** Lien direct vers la fiche dans ce CRM */
  url?: string | null
  deleted?: boolean
}

export interface PlanningDate {
  id: string | number
  /** echeance | renouvellement | relance (ou un autre type) */
  kind: string
  client_id: string | number | null
  /** "YYYY-MM-DD" pour une date seule, ISO 8601 avec fuseau sinon */
  date: string
  title: string
  done?: boolean
  deleted?: boolean
  /** Facultatif : sinon la valeur par défaut du type côté outil (30 j pour un renouvellement) */
  remind_days_before?: number | null
}

/* À adapter au schéma du CRM ------------------------------------------------ */

export function toPlanningClient(client: any): PlanningClient {
  return {
    id: client.id,
    name: client.name,
    emails: [client.email, client.billingEmail].filter(Boolean),
    website: client.website ?? null,
    phone: client.phone ?? null,
    url: `${env.get('APP_URL')}/clients/${client.id}`,
    deleted: Boolean(client.deletedAt),
  }
}

const day = (d: DateTime | null) => d?.toISODate() ?? ''

export function contractToPlanning(contract: any): PlanningDate {
  return {
    id: contract.id,
    kind: 'renouvellement',
    client_id: contract.clientId,
    date: day(contract.renewalDate),
    title: `Renouvellement ${contract.label}`,
    deleted: Boolean(contract.deletedAt),
  }
}

export function invoiceToPlanning(invoice: any): PlanningDate {
  return {
    id: invoice.id,
    kind: 'echeance',
    client_id: invoice.clientId,
    date: day(invoice.dueDate),
    title: `Échéance facture ${invoice.number}`,
    done: invoice.status === 'paid',
  }
}

export function followUpToPlanning(followUp: any): PlanningDate {
  return {
    id: followUp.id,
    kind: 'relance',
    client_id: followUp.clientId,
    date: followUp.followUpAt.toISO(),
    title: `Relance : ${followUp.subject}`,
    done: Boolean(followUp.done),
  }
}

/* -------------------------------------------------------------------------- */
/* 1. API de lecture                                                           */
/* -------------------------------------------------------------------------- */

const PER_PAGE = 200

/** Jeton partagé avec l'outil planning, comparé en temps constant */
export class PlanningTokenMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const expected = Buffer.from(`Bearer ${env.get('PLANNING_API_TOKEN', '')}`)
    const given = Buffer.from(request.header('authorization') ?? '')
    if (
      !env.get('PLANNING_API_TOKEN') ||
      expected.length !== given.length ||
      !timingSafeEqual(expected, given)
    ) {
      return response.unauthorized({ error: 'jeton invalide' })
    }
    return next()
  }
}

function since(request: HttpContext['request']) {
  const value = request.input('updated_since')
  const date = value ? DateTime.fromISO(String(value)) : null
  return date?.isValid ? date : null
}

export class PlanningApiController {
  /** GET /api/planning/clients */
  async clients({ request }: HttpContext) {
    const page = Number(request.input('page', 1)) || 1
    const updatedSince = since(request)
    const { default: Client } = await import('#models/client' as any)
    const query = Client.query().orderBy('id')
    if (updatedSince) query.where('updated_at', '>', updatedSince.toSQL())
    const result = await query.paginate(page, PER_PAGE)
    return {
      data: result.all().map(toPlanningClient),
      next_page: result.hasMorePages ? page + 1 : null,
    }
  }

  /**
   * GET /api/planning/dates — toutes les dates utiles, tous types confondus.
   * Simple ici : chaque type est lu puis concaténé ; la pagination porte sur l'ensemble.
   */
  async dates({ request }: HttpContext) {
    const page = Number(request.input('page', 1)) || 1
    const updatedSince = since(request)
    const fromDate = DateTime.now().minus({ days: 30 })

    const load = async (model: string, map: (row: any) => PlanningDate, dateColumn: string) => {
      const { default: Model } = await import(model as any)
      const query = Model.query().orderBy('id')
      if (updatedSince) query.where('updated_at', '>', updatedSince.toSQL())
      // Première synchro : inutile de remonter les dates très anciennes
      else query.where(dateColumn, '>=', fromDate.toSQLDate())
      const rows = await query
      return rows.map(map)
    }

    const all = [
      ...(await load('#models/contract', contractToPlanning, 'renewal_date')),
      ...(await load('#models/invoice', invoiceToPlanning, 'due_date')),
      ...(await load('#models/follow_up', followUpToPlanning, 'follow_up_at')),
    ]
    const start = (page - 1) * PER_PAGE
    return {
      data: all.slice(start, start + PER_PAGE),
      next_page: start + PER_PAGE < all.length ? page + 1 : null,
    }
  }
}

// start/routes.ts du CRM :
export function registerPlanningRoutes() {
  router
    .group(() => {
      router.get('/clients', [PlanningApiController, 'clients'])
      router.get('/dates', [PlanningApiController, 'dates'])
    })
    .prefix('/api/planning')
    .use(async (ctx, next) => new PlanningTokenMiddleware().handle(ctx, next))
}

/* -------------------------------------------------------------------------- */
/* 2. Webhooks sortants                                                        */
/* -------------------------------------------------------------------------- */

type PlanningEvent =
  | { event: 'client.upserted' | 'client.deleted'; data: PlanningClient }
  | { event: 'date.upserted' | 'date.deleted'; data: PlanningDate }

export async function notifyPlanning(events: PlanningEvent | PlanningEvent[]) {
  const url = env.get('PLANNING_WEBHOOK_URL')
  const secret = env.get('PLANNING_WEBHOOK_SECRET')
  if (!url || !secret) return

  const body = JSON.stringify(Array.isArray(events) ? { events } : events)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature =
    'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Planning-Timestamp': timestamp,
        'X-Planning-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(5000),
    })
  } catch (error) {
    // Pas bloquant : la synchro de nuit par l'API rattrape un webhook perdu
    console.warn('webhook planning en échec', error)
  }
}

/*
 * Branchement dans les modèles Lucid du CRM :
 *
 *   // app/models/client.ts
 *   @afterSave()
 *   static async notifyPlanning(client: Client) {
 *     await notifyPlanning({ event: 'client.upserted', data: toPlanningClient(client) })
 *   }
 *   @afterDelete()
 *   static async notifyPlanningDelete(client: Client) {
 *     await notifyPlanning({ event: 'client.deleted', data: toPlanningClient(client) })
 *   }
 *
 *   // app/models/contract.ts (idem pour Invoice et FollowUp)
 *   @afterSave()
 *   static async notifyPlanning(contract: Contract) {
 *     await notifyPlanning({ event: 'date.upserted', data: contractToPlanning(contract) })
 *   }
 *   @afterDelete()
 *   static async notifyPlanningDelete(contract: Contract) {
 *     await notifyPlanning({ event: 'date.deleted', data: contractToPlanning(contract) })
 *   }
 */
