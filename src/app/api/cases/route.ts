import { NextRequest } from 'next/server'
import { requireAuth, apiSuccess, withErrorHandler } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth('case:view')

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const caseType = searchParams.get('caseType')
  const search   = searchParams.get('search') ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 25

  const where: Record<string, unknown> = {}
  if (status)   where.status   = status
  if (caseType) where.caseType = caseType

  // Mechanics only see cases assigned to them or waiting for mechanic
  if (user.role === 'MECHANIC') {
    where.OR = [
      { mechanicId: user.id },
      { status: 'WAITING_FOR_MECHANIC' },
    ]
  }

  if (search) {
    where.OR = [
      { orderNumber:      { contains: search, mode: 'insensitive' } },
      { faultDescription: { contains: search, mode: 'insensitive' } },
      { customer: { name:  { contains: search, mode: 'insensitive' } } },
      { scooter:  { serialNumber: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [cases, total] = await Promise.all([
    prisma.repairOrder.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: {
        customer:    { select: { id: true, name: true, postcode: true } },
        scooter:     { select: { id: true, serialNumber: true, model: true, brand: true } },
        mechanic:    { select: { id: true, name: true } },
        errorCodes:  { select: { errorCode: true } },
        invoice:     { select: { paymentStatus: true, invoiceNumber: true } },
      },
    }),
    prisma.repairOrder.count({ where }),
  ])

  return apiSuccess({ cases, total, page, pageSize })
})
