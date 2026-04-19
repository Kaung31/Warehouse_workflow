import { NextRequest } from 'next/server'
import { requireAuth, apiSuccess, withErrorHandler } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAuth('scooter:view')

  const { searchParams } = new URL(req.url)
  const grade    = searchParams.get('grade')       // A, B, C
  const status   = searchParams.get('status')      // SECOND_HAND_AVAILABLE, SOLD etc
  const search   = searchParams.get('search') ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 25

  const where: Record<string, unknown> = {
    // Only show second-hand scooters
    status: status ?? { in: ['SECOND_HAND_AVAILABLE', 'SOLD'] },
  }

  if (grade) where.grade = grade

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
      orderBy: { updatedAt: 'desc' },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: {
        customer: { select: { id: true, name: true, postcode: true } },
      },
    }),
    prisma.scooter.count({ where }),
  ])

  return apiSuccess({ scooters, total, page, pageSize })
})