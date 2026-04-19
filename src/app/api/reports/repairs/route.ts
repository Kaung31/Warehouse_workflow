import { NextRequest } from 'next/server'
import { requireAuth, apiSuccess, withErrorHandler } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay } from 'date-fns'

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAuth('reports:view')

  const { searchParams } = new URL(req.url)
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '30')))
  const from = subDays(startOfDay(new Date()), days)

  const [
    summary,
    avgResolutionTime,
    byMechanic,
    cancelledReasons,
  ] = await Promise.all([
    // Overall summary
    prisma.repairOrder.groupBy({
      by:     ['status'],
      where:  { createdAt: { gte: from } },
      _count: true,
    }),

    // Average hours from RECEIVED to READY_TO_SHIP
    prisma.$queryRaw<{ avg_hours: number }[]>`
      SELECT AVG(
        EXTRACT(EPOCH FROM ("closedAt" - "createdAt")) / 3600
      ) as avg_hours
      FROM "RepairOrder"
      WHERE status = 'DISPATCHED'
      AND "createdAt" >= ${from}
      AND "closedAt" IS NOT NULL
    `,

    // Repairs completed per mechanic
    prisma.repairOrder.groupBy({
      by:     ['mechanicId'],
      where:  {
        status:    'READY_TO_SHIP',
        updatedAt: { gte: from },
      },
      _count: { _all: true },
    }),

    // Cancelled count
    prisma.repairOrder.count({
      where: { status: 'CANCELLED', updatedAt: { gte: from } },
    }),
  ])

  // Resolve mechanic names
  const mechanicIds = byMechanic
    .map((m) => m.mechanicId)
    .filter(Boolean) as string[]

  const mechanics = await prisma.user.findMany({
    where:  { id: { in: mechanicIds } },
    select: { id: true, name: true },
  })
  const mechanicMap = Object.fromEntries(mechanics.map((m) => [m.id, m.name]))

  return apiSuccess({
    periodDays: days,
    summary:    summary.map((s) => ({ status: s.status, count: s._count })),
    avgResolutionHours: Math.round(avgResolutionTime[0]?.avg_hours ?? 0),
    byMechanic: byMechanic.map((m) => ({
      mechanicId:   m.mechanicId,
      mechanicName: m.mechanicId ? mechanicMap[m.mechanicId] : 'Unassigned',
      completed:    m._count._all,
    })),
    cancelledCount: cancelledReasons,
  })
})