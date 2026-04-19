import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { sellScooterSchema } from '@/lib/schemas/secondhand'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { ScooterStatus } from '@prisma/client'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = withErrorHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('scooter:update')
  const { id } = await (ctx as Ctx).params

  const scooter = await prisma.scooter.findUnique({ where: { id } })
  if (!scooter) return apiError('Scooter not found', 404)

  if (scooter.status !== 'SECOND_HAND_AVAILABLE') {
    return apiError('Only available second-hand scooters can be marked as sold', 400)
  }

  const { data, error } = await parseBody(req, sellScooterSchema)
  if (error) return error

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, isDeleted: false },
  })
  if (!customer) return apiError('Customer not found', 404)

  const updated = await prisma.scooter.update({
    where: { id },
    data: {
      status:     ScooterStatus.SOLD,
      customerId: data.customerId,
      salePrice:  data.salePrice,
      notes:      data.notes,
    },
    include: { customer: { select: { id: true, name: true } } },
  })

  await logAudit({
    userId:     user.id,
    action:     'scooter.sold',
    entityType: 'Scooter',
    entityId:   id,
    oldValue:   { status: 'SECOND_HAND_AVAILABLE', salePrice: Number(scooter.salePrice) },
    newValue:   {
      status:       'SOLD',
      customerId:   data.customerId,
      customerName: customer.name,
      salePrice:    data.salePrice,
    },
  })

  return apiSuccess(updated)
})