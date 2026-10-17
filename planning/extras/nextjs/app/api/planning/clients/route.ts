/**
 * GET /api/planning/clients?updated_since=<ISO>&page=<n>
 * → { data: PlanningClient[], next_page: number | null }
 */
import { prismaRead } from '@/lib/prisma'
import { PER_PAGE, readQuery, rejectUnauthorized, toPlanningClient } from '@/lib/planning'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = rejectUnauthorized(request)
  if (denied) return denied

  const { page, since } = readQuery(request)
  const where = since ? { updatedAt: { gt: since } } : {}
  // Une ligne de plus que la page pour savoir s'il en reste
  const rows = await prismaRead.client.findMany({
    where,
    orderBy: { id: 'asc' },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE + 1,
  })

  return Response.json({
    data: rows.slice(0, PER_PAGE).map(toPlanningClient),
    next_page: rows.length > PER_PAGE ? page + 1 : null,
  })
}
