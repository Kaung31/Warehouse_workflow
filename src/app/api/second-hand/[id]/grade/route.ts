import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { gradeScooterSchema } from '@/lib/schemas/secondhand'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { ScooterStatus } from '@prisma/client'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = withErrorHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('scooter:update')
  const { id } = await (ctx as Ctx).params

  const scooter = await prisma.scooter.findUnique({ where: { id } })
  if (!scooter) return apiError('Scooter not found', 404)

  // Only scooters that have been through repair or are in stock can be graded
  const gradeable: ScooterStatus[] = [
    'IN_STOCK',
    'DISPATCHED',
    'WITH_CUSTOMER',
  ]
  if (!gradeable.includes(scooter.status)) {
    return apiError(
      `Cannot grade a scooter that is currently ${scooter.status.toLowerCase().replace(/_/g, ' ')}`,
      400
    )
  }

  const { data, error } = await parseBody(req, gradeScooterSchema)
  if (error) return error

  const updated = await prisma.scooter.update({
    where: { id },
    data: {
      grade:        data.grade,
      salePrice:    data.salePrice,
      purchaseCost: data.purchaseCost,
      notes:        data.notes,
      status:       ScooterStatus.SECOND_HAND_AVAILABLE,
      // Unlink from previous customer — it's now warehouse stock
      customerId:   null,
    },
  })

  await logAudit({
    userId:     user.id,
    action:     'scooter.graded_second_hand',
    entityType: 'Scooter',
    entityId:   id,
    oldValue:   { status: scooter.status, grade: scooter.grade },
    newValue:   { status: 'SECOND_HAND_AVAILABLE', grade: data.grade, salePrice: data.salePrice },
  })

  return apiSuccess(updated)
})