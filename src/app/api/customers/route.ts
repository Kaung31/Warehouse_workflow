import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { createCustomerSchema } from '@/lib/schemas/customer'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth('customer:view')

  const { searchParams } = new URL(req.url)
  const search   = searchParams.get('search') ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 20

  const where = search ? {
    isDeleted: false,
    OR: [
      { name:     { contains: search, mode: 'insensitive' as const } },
      { email:    { contains: search, mode: 'insensitive' as const } },
      { postcode: { contains: search, mode: 'insensitive' as const } },
      { phone:    { contains: search } },
    ],
  } : { isDeleted: false }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
      select: {
        id: true, name: true, email: true, phone: true,
        postcode: true, city: true, createdAt: true,
        _count: { select: { repairOrders: true } },
      },
    }),
    prisma.customer.count({ where }),
  ])

  return apiSuccess({ customers, total, page, pageSize })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth('customer:create')

  const { data, error } = await parseBody(req, createCustomerSchema)
  if (error) return error

  // Check no duplicate email
  if (data.email) {
    const existing = await prisma.customer.findFirst({
      where: { email: data.email, isDeleted: false },
    })
    if (existing) return apiError('A customer with this email already exists', 409)
  }

  const customer = await prisma.customer.create({ data })

  await logAudit({
    userId:     user.id,
    action:     'customer.created',
    entityType: 'Customer',
    entityId:   customer.id,
    newValue:   { name: customer.name, email: customer.email },
  })

  return apiSuccess(customer, 201)
})