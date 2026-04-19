import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { reserveScooterSchema } from '@/lib/schemas/secondhand'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = withErrorHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('scooter:update')
  const { id } = await (ctx as Ctx).params

  const scooter = await prisma.scooter.findUnique({ where: { id } })
  if (!scooter) return apiError('Scooter not found', 404)

  if (scooter.status !== 'SECOND_HAND_AVAILABLE') {
    return apiError('Only available second-hand scooters can be reserved', 400)
  }

  const { data, error } = await parseBody(req, reserveScooterSchema)
  if (error) return error

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, isDeleted: false },
  })
  if (!customer) return apiError('Customer not found', 404)

  const updated = await prisma.scooter.update({
    where: { id },
    data: {
      // Keep status as SECOND_HAND_AVAILABLE but link to customer
      // so CS can see who it's reserved for
      customerId: data.customerId,
      notes:      data.notes
        ? `Reserved for ${customer.name}: ${data.notes}`
        : `Reserved for ${customer.name}`,
    },
    include: { customer: { select: { id: true, name: true } } },
  })

  await logAudit({
    userId:     user.id,
    action:     'scooter.reserved',
    entityType: 'Scooter',
    entityId:   id,
    newValue:   { customerId: data.customerId, customerName: customer.name },
  })

  return apiSuccess(updated)
})