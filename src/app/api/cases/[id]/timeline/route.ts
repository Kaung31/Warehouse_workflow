import { NextRequest } from 'next/server'
import { requireAuth, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withErrorHandler(async (_req: NextRequest, ctx: unknown) => {
  await requireAuth('case:view')
  const { id } = await (ctx as Ctx).params

  const exists = await prisma.repairOrder.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return apiError('Case not found', 404)

  const history = await prisma.caseStatusHistory.findMany({
    where:   { caseId: id },
    orderBy: { createdAt: 'asc' },
    include: { changedBy: { select: { id: true, name: true, role: true } } },
  })

  return apiSuccess(history)
})
