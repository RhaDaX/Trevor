/**
 * Client Prisma du CRM, étendu pour prévenir l'outil planning à chaque
 * écriture sur les clients et les dates utiles.
 *
 * Remplace l'export habituel de `lib/prisma.ts` : le reste du code continue
 * d'importer `prisma` sans changement.
 *
 * ⚠️ createMany / updateMany / deleteMany ne renvoient pas les lignes : elles
 * ne déclenchent pas de webhook. La synchro de nuit les rattrape.
 */
import { PrismaClient } from '@prisma/client'
import {
  contractToPlanning,
  followUpToPlanning,
  invoiceToPlanning,
  notifyPlanning,
  toPlanningClient,
  type PlanningEvent,
} from './planning'

/** Client sans webhooks : API de lecture et relecture des lignes complètes */
export const prismaRead = new PrismaClient()

type Model = 'client' | 'contract' | 'invoice' | 'followUp'

const TO_EVENT: Record<Model, (row: any, deleted: boolean) => PlanningEvent> = {
  client: (row, deleted) => ({
    event: deleted ? 'client.deleted' : 'client.upserted',
    data: toPlanningClient(row),
  }),
  contract: (row, deleted) => ({
    event: deleted ? 'date.deleted' : 'date.upserted',
    data: contractToPlanning(row),
  }),
  invoice: (row, deleted) => ({
    event: deleted ? 'date.deleted' : 'date.upserted',
    data: invoiceToPlanning(row),
  }),
  followUp: (row, deleted) => ({
    event: deleted ? 'date.deleted' : 'date.upserted',
    data: followUpToPlanning(row),
  }),
}

type Hook = (params: { args: any; query: (args: any) => Promise<any> }) => Promise<any>

/**
 * Le webhook part toujours avec la ligne complète, même si l'appelant a
 * demandé un `select` partiel : on relit la ligne par son id.
 */
function hooks(model: Model): Record<'create' | 'update' | 'upsert' | 'delete', Hook> {
  const table = () => (prismaRead as any)[model]
  const write: Hook = async ({ args, query }) => {
    const result = await query(
      args.select ? { ...args, select: { ...args.select, id: true } } : args
    )
    void table()
      .findUnique({ where: { id: result.id } })
      .then((row: unknown) => row && notifyPlanning(TO_EVENT[model](row, false)))
      .catch((error: unknown) => console.warn('webhook planning : relecture impossible', error))
    return result
  }
  const remove: Hook = async ({ args, query }) => {
    // Lue avant suppression : après, il n'y a plus rien à envoyer
    const before = await table().findUnique({ where: args.where })
    const result = await query(args)
    if (before) void notifyPlanning(TO_EVENT[model](before, true))
    return result
  }
  return { create: write, update: write, upsert: write, delete: remove }
}

function createClient() {
  return new PrismaClient().$extends({
    query: {
      client: hooks('client'),
      contract: hooks('contract'),
      invoice: hooks('invoice'),
      followUp: hooks('followUp'),
    },
  })
}

// Une seule instance en développement (rechargement à chaud de Next)
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> }
export const prisma = globalForPrisma.prisma ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
