import { NextRequest } from 'next/server'
import { requireAuth, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withErrorHandler(async (_req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('case:view')
  const { id } = await (ctx as Ctx).params

  const caseRecord = await prisma.repairOrder.findUnique({
    where: { id },
    include: {
      customer:    true,
      scooter:     true,
      mechanic:    { select: { id: true, name: true, role: true } },
      repairParts: { include: { part: { select: { id: true, name: true, sku: true, barcode: true, stockQty: true, unitCost: true } } } },
      shipments:   true,
      errorCodes:  { orderBy: { createdAt: 'asc' } },
      invoice:     true,
      repairTimeLog: true,
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: { changedBy: { select: { id: true, name: true, role: true } } },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
      qcSubmissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        include: {
          results: {
            include: { template: true },
            orderBy: { createdAt: 'asc' },
          },
          submittedBy: { select: { name: true } },
        },
      },
    },
  })

  if (!caseRecord) return apiError('Case not found', 404)

  // Mechanics can only see their own cases (or unassigned ones waiting for mechanic)
  if (user.role === 'MECHANIC' &&
      caseRecord.mechanicId !== user.id &&
      caseRecord.status !== 'WAITING_FOR_MECHANIC') {
    return apiError('Not found', 404)
  }

  // CS cannot see mechanic-only notes on non-CS stages — keep it simple, return all
  return apiSuccess(caseRecord)
})
