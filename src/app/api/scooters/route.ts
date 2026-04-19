import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { createScooterSchema } from '@/lib/schemas/scooter'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAuth('scooter:view')

  const { searchParams } = new URL(req.url)
  const search   = searchParams.get('search') ?? ''
  const status   = searchParams.get('status')
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 20

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { model:        { contains: search, mode: 'insensitive' } },
      { brand:        { contains: search, mode: 'insensitive' } },
    ]
  }

  const [scooters, total] = await Promise.all([
    prisma.scooter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true, postcode: true } },
        _count:   { select: { repairOrders: true } },
      },
    }),
    prisma.scooter.count({ where }),
  ])

  return apiSuccess({ scooters, total, page, pageSize })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth('scooter:create')

  const { data, error } = await parseBody(req, createScooterSchema)
  if (error) return error

  // Serial number must be unique — critical for tracking
  const existing = await prisma.scooter.findUnique({
    where: { serialNumber: data.serialNumber },
  })
  if (existing) return apiError(`Scooter with serial number ${data.serialNumber} already exists`, 409)

  const scooter = await prisma.scooter.create({
    data: {
      ...data,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCost: data.purchaseCost ?? undefined,
    },
    include: { customer: { select: { id: true, name: true } } },
  })

  await logAudit({
    userId:     user.id,
    action:     'scooter.created',
    entityType: 'Scooter',
    entityId:   scooter.id,
    newValue:   { serialNumber: scooter.serialNumber, model: scooter.model },
  })

  return apiSuccess(scooter, 201)
})