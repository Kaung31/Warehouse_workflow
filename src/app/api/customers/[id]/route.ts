import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { updateCustomerSchema } from '@/lib/schemas/customer'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withErrorHandler(async (_req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('customer:view')
  const { id } = await (ctx as Ctx).params

  const customer = await prisma.customer.findFirst({
    where: { id, isDeleted: false },
    include: {
      repairOrders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, orderNumber: true, status: true,
          faultDescription: true, createdAt: true,
          scooter: { select: { serialNumber: true, model: true } },
        },
      },
      scooters: {
        select: { id: true, serialNumber: true, model: true, brand: true, status: true },
      },
    },
  })

  if (!customer) return apiError('Customer not found', 404)

  return apiSuccess(customer)
})

export const PUT = withErrorHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('customer:update')
  const { id } = await (ctx as Ctx).params

  const existing = await prisma.customer.findFirst({ where: { id, isDeleted: false } })
  if (!existing) return apiError('Customer not found', 404)

  const { data, error } = await parseBody(req, updateCustomerSchema)
  if (error) return error

  const updated = await prisma.customer.update({ where: { id }, data })

  await logAudit({
    userId:     user.id,
    action:     'customer.updated',
    entityType: 'Customer',
    entityId:   id,
    oldValue:   { name: existing.name, email: existing.email, postcode: existing.postcode },
    newValue:   { name: updated.name,  email: updated.email,  postcode: updated.postcode },
  })

  return apiSuccess(updated)
})

// GDPR soft delete — data is marked deleted, not physically removed
// Only ADMIN can do this
export const DELETE = withErrorHandler(async (_req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('customer:delete')
  const { id } = await (ctx as Ctx).params

  const existing = await prisma.customer.findFirst({ where: { id, isDeleted: false } })
  if (!existing) return apiError('Customer not found', 404)

  await prisma.customer.update({
    where: { id },
    data:  { isDeleted: true, deletedAt: new Date() },
  })

  await logAudit({
    userId:     user.id,
    action:     'customer.deleted',
    entityType: 'Customer',
    entityId:   id,
    oldValue:   { name: existing.name },
  })

  return apiSuccess({ message: 'Customer deleted' })
})