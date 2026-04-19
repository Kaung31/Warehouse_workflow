import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { updateRepairSchema } from '@/lib/schemas/repair'
import { getViewUrl } from '@/lib/r2'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withErrorHandler(async (_req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('repair:view')
  const { id } = await (ctx as Ctx).params

  const [repair, rawPhotos] = await Promise.all([
    prisma.repairOrder.findUnique({
      where: { id },
      include: {
        customer:    true,
        scooter:     true,
        mechanic:    { select: { id: true, name: true, role: true } },
        repairParts: { include: { part: true } },
        shipments:   true,
      },
    }),
    prisma.photo.findMany({
      where: { entityType: 'RepairOrder', entityId: id },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!repair) return apiError('Repair order not found', 404)

  // Mechanics can only see their own repairs
  if (user.role === 'MECHANIC' && repair.mechanicId !== user.id) {
    return apiError('You do not have permission to view this repair', 403)
  }

  const photosWithUrls = await Promise.all(
    rawPhotos.map(async (p: typeof rawPhotos[number]) => ({
      ...p,
      viewUrl: await getViewUrl(p.s3Key),
    }))
  )

  // Hide cost from non-managers
  const canViewCost = ['ADMIN', 'MANAGER'].includes(user.role)

  return apiSuccess({
    ...repair,
    photos:        photosWithUrls,
    estimatedCost: canViewCost ? repair.estimatedCost : undefined,
    finalCost:     canViewCost ? repair.finalCost     : undefined,
  })
})

export const PUT = withErrorHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('repair:update')
  const { id } = await (ctx as Ctx).params

  const existing = await prisma.repairOrder.findUnique({ where: { id } })
  if (!existing) return apiError('Repair order not found', 404)

  // Mechanics can only update repairs assigned to them
  if (user.role === 'MECHANIC' && existing.mechanicId !== user.id) {
    throw new Error('FORBIDDEN')
  }

  const { data, error } = await parseBody(req, updateRepairSchema)
  if (error) return error

  // Only managers can reassign mechanics
  if (data.mechanicId && user.role === 'MECHANIC') throw new Error('FORBIDDEN')

  const updated = await prisma.repairOrder.update({ where: { id }, data })

  await logAudit({
    userId:     user.id,
    action:     'repair_order.updated',
    entityType: 'RepairOrder',
    entityId:   id,
    oldValue:   { mechanicId: existing.mechanicId, priority: existing.priority },
    newValue:   { mechanicId: updated.mechanicId,  priority: updated.priority  },
  })

  return apiSuccess(updated)
})