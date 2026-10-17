/**
 * GET /api/planning/dates?updated_since=<ISO>&page=<n>
 * → { data: PlanningDate[], next_page: number | null }
 *
 * Toutes les dates utiles, tous types confondus.
 */
import { prismaRead } from '@/lib/prisma'
import {
  contractToPlanning,
  followUpToPlanning,
  invoiceToPlanning,
  pageOf,
  readQuery,
  rejectUnauthorized,
} from '@/lib/planning'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = rejectUnauthorized(request)
  if (denied) return denied

  const { page, since } = readQuery(request)
  // Delta : ce qui a changé ; première synchro : les dates des 30 derniers jours et à venir
  const recent = new Date(Date.now() - 30 * 86_400_000)
  const changed = since ? { updatedAt: { gt: since } } : null

  const [contracts, invoices, followUps] = await Promise.all([
    prismaRead.contract.findMany({
      where: changed ?? { renewalDate: { gte: recent } },
      orderBy: { id: 'asc' },
    }),
    prismaRead.invoice.findMany({
      where: changed ?? { dueDate: { gte: recent } },
      orderBy: { id: 'asc' },
    }),
    prismaRead.followUp.findMany({
      where: changed ?? { followUpAt: { gte: recent } },
      orderBy: { id: 'asc' },
    }),
  ])

  return Response.json(
    pageOf(
      [
        ...contracts.map(contractToPlanning),
        ...invoices.map(invoiceToPlanning),
        ...followUps.map(followUpToPlanning),
      ],
      page
    )
  )
}
