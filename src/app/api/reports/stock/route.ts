import { NextRequest } from 'next/server'
import { requireAuth, apiSuccess, withErrorHandler } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const GET = withErrorHandler(async (_req: NextRequest) => {
  await requireAuth('reports:view')

  const [
    totalValue,
    lowStock,
    topConsumed,
    recentAdjustments,
  ] = await Promise.all([
    // Total stock value
    prisma.$queryRaw<{ total_value: number }[]>`
      SELECT SUM("stockQty" * "unitCost") as total_value
      FROM "Part"
      WHERE "isActive" = true AND "unitCost" IS NOT NULL
    `,

    // All low stock parts
    prisma.part.findMany({
      where:   { isActive: true, stockQty: { lte: prisma.part.fields.reorderLevel } },
      orderBy: { stockQty: 'asc' },
    }),

    // Most consumed parts in last 30 days
    prisma.$queryRaw<{ partId: string; name: string; total_consumed: bigint }[]>`
      SELECT
        sm."partId",
        p.name,
        ABS(SUM(sm.delta)) as total_consumed
      FROM "StockMovement" sm
      JOIN "Part" p ON p.id = sm."partId"
      WHERE sm.reason = 'REPAIR_CONSUMED'
        AND sm."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY sm."partId", p.name
      ORDER BY total_consumed DESC
      LIMIT 10
    `,

    // Manual adjustments in last 30 days — any unexpected ones?
    prisma.stockMovement.findMany({
      where:   {
        reason:    'MANUAL_ADJUSTMENT',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        part:        { select: { name: true, sku: true } },
        performedBy: { select: { name: true } },
      },
    }),
  ])

  return apiSuccess({
    totalStockValue:    Number(totalValue[0]?.total_value ?? 0),
    lowStockCount:      lowStock.length,
    lowStockParts:      lowStock,
    topConsumedParts:   topConsumed.map((p) => ({
      partId:   p.partId,
      name:     p.name,
      consumed: Number(p.total_consumed),
    })),
    recentAdjustments,
  })
})