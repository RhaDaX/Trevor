/**
 * À ajouter dans chaque CRM maison (Adonis ou Next) : un événement sortant
 * signé à chaque création ou modification de client et de date utile.
 *
 * Variables côté CRM : PLANNING_WEBHOOK_URL=https://planning.example.com/webhooks/crm/crm_a
 *                      PLANNING_WEBHOOK_SECRET=<même valeur que CRM_A_WEBHOOK_SECRET>
 */
import { createHmac } from 'node:crypto'

type PlanningEvent =
  | { event: 'client.upserted' | 'client.deleted'; data: Record<string, unknown> }
  | {
      event: 'date.upserted' | 'date.deleted'
      /** Doit correspondre à un « kind » de config/crm.ts : echeance, renouvellement, relance */
      kind: string
      data: Record<string, unknown>
    }

export async function notifyPlanning(events: PlanningEvent | PlanningEvent[]) {
  const url = process.env.PLANNING_WEBHOOK_URL
  const secret = process.env.PLANNING_WEBHOOK_SECRET
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
    // Pas bloquant : la synchro de nuit rattrape un webhook perdu
    console.warn('webhook planning en échec', error)
  }
}

/*
 * Exemple dans un modèle Lucid du CRM (AdonisJS) :
 *
 *   @afterSave()
 *   static async notify(client: Client) {
 *     await notifyPlanning({ event: 'client.upserted', data: client.$attributes })
 *   }
 *
 *   // Contrat : date de renouvellement
 *   @afterSave()
 *   static async notify(contract: Contract) {
 *     await notifyPlanning({ event: 'date.upserted', kind: 'renouvellement', data: contract.$attributes })
 *   }
 *
 *   @afterDelete()
 *   static async notifyDelete(contract: Contract) {
 *     await notifyPlanning({ event: 'date.deleted', kind: 'renouvellement', data: contract.$attributes })
 *   }
 *
 * Les clés de `data` sont les colonnes de la table, telles que déclarées dans
 * config/crm.ts de l'outil planning (id, name, email, client_id, renewal_date…).
 */
