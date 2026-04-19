import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { createRepairSchema } from '@/lib/schemas/repair'
import { generateOrderNumber } from '@/lib/order-number'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { ScooterStatus } from '@prisma/client'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth('repair:view')

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const mechanicId = searchParams.get('mechanicId')
  const search     = searchParams.get('search') ?? ''
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize   = 25

  const where: Record<string, unknown> = {}
  if (status)     where.status     = status
  if (mechanicId) where.mechanicId = mechanicId

  // Mechanics only see their own orders
  if (user.role === 'MECHANIC') where.mechanicId = user.id

  if (search) {
    where.OR = [
      { orderNumber:      { contains: search, mode: 'insensitive' } },
      { faultDescription: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { scooter:  { serialNumber: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [repairs, total] = await Promise.all([
    prisma.repairOrder.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true, postcode: true } },
        scooter:  { select: { id: true, serialNumber: true, model: true, brand: true } },
        mechanic: { select: { id: true, name: true } },
      },
    }),
    prisma.repairOrder.count({ where }),
  ])

  return apiSuccess({ repairs, total, page, pageSize })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth('repair:create')

  const { data, error } = await parseBody(req, createRepairSchema)
  if (error) return error

  // Verify scooter and customer exist
  const [scooter, customer] = await Promise.all([
    prisma.scooter.findUnique({ where: { id: data.scooterId } }),
    prisma.customer.findFirst({ where: { id: data.customerId, isDeleted: false } }),
  ])

  if (!scooter)  return apiError('Scooter not found', 404)
  if (!customer) return apiError('Customer not found', 404)

  const orderNumber = await generateOrderNumber()

  // Use a transaction — repair order creation + scooter status update are atomic
  const repair = await prisma.$transaction(async (tx) => {
    const newRepair = await tx.repairOrder.create({
      data: {
        orderNumber,
        scooterId:        data.scooterId,
        customerId:       data.customerId,
        mechanicId:       data.mechanicId,
        faultDescription: data.faultDescription,
        priority:         data.priority,
        estimatedCost:    data.estimatedCost,
        internalNotes:    data.internalNotes,
      },
      include: {
        customer: { select: { id: true, name: true } },
        scooter:  { select: { id: true, serialNumber: true, model: true } },
        mechanic: { select: { id: true, name: true } },
      },
    })

    // Update scooter status to IN_REPAIR
    await tx.scooter.update({
      where: { id: data.scooterId },
      data:  { status: ScooterStatus.IN_REPAIR },
    })

    return newRepair
  })

  await logAudit({
    userId:     user.id,
    action:     'repair_order.created',
    entityType: 'RepairOrder',
    entityId:   repair.id,
    newValue:   { orderNumber, status: 'RECEIVED', priority: data.priority },
  })

  return apiSuccess(repair, 201)
})