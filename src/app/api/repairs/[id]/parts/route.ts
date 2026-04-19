import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { addRepairPartSchema } from '@/lib/schemas/repair'
import { consumePartForRepair } from '@/lib/stock'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withErrorHandler(async (_req: NextRequest, ctx: unknown) => {
  await requireAuth('repair:view')
  const { id } = await (ctx as Ctx).params

  const parts = await prisma.repairPart.findMany({
    where: { repairOrderId: id },
    include: { part: true },
  })

  return apiSuccess(parts)
})

export const POST = withErrorHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('parts:consume_in_repair')
  const { id } = await (ctx as Ctx).params

  const repair = await prisma.repairOrder.findUnique({ where: { id } })
  if (!repair) return apiError('Repair order not found', 404)

  // Can only add parts to active repairs
  const activeStatuses = ['RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'QUALITY_CHECK']
  if (!activeStatuses.includes(repair.status)) {
    return apiError('Cannot add parts to a repair that is not in progress', 400)
  }

  const { data, error } = await parseBody(req, addRepairPartSchema)
  if (error) return error

  // consumePartForRepair handles the stock deduction atomically
  const result = await consumePartForRepair({
    repairOrderId: id,
    partId:        data.partId,
    quantity:      data.quantity,
    performedById: user.id,
  })

  if (!result.success) return apiError(result.error!, 400)

  return apiSuccess(result.repairPart, 201)
})