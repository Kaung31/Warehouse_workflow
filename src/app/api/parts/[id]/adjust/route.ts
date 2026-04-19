import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { adjustStockSchema } from '@/lib/schemas/part'
import { adjustStock } from '@/lib/stock'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { MovementReason } from '@prisma/client'

type Ctx = { params: Promise<{ id: string }> }

export const POST = withErrorHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('stock:adjust')
  const { id } = await (ctx as Ctx).params

  const part = await prisma.part.findUnique({ where: { id } })
  if (!part) return apiError('Part not found', 404)

  const { data, error } = await parseBody(req, adjustStockSchema)
  if (error) return error

  const result = await adjustStock({
    partId:        id,
    delta:         data.delta,
    reason:        MovementReason.MANUAL_ADJUSTMENT,
    notes:         data.notes,
    performedById: user.id,
  })

  if (!result.success) return apiError(result.error!, 400)

  await logAudit({
    userId:     user.id,
    action:     'stock.adjusted',
    entityType: 'Part',
    entityId:   id,
    oldValue:   { stockQty: part.stockQty },
    newValue:   { stockQty: part.stockQty + data.delta, delta: data.delta, notes: data.notes },
  })

  return apiSuccess(result.part)
})