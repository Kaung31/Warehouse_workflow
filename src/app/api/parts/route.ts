import { NextRequest } from 'next/server'
import { requireAuth, parseBody, apiSuccess, withErrorHandler } from '@/lib/api-helpers'
import { createPartSchema } from '@/lib/schemas/part'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { Part } from '@prisma/client'

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAuth('parts:view')

  const { searchParams } = new URL(req.url)
  const search     = searchParams.get('search') ?? ''
  const lowStock   = searchParams.get('lowStock') === 'true'
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize   = 30

  if (lowStock) {
    const searchFilter = search
      ? Prisma.sql`AND ("name" ILIKE ${`%${search}%`} OR "sku" ILIKE ${`%${search}%`} OR "barcode" ILIKE ${`%${search}%`})`
      : Prisma.empty
    const offset = (page - 1) * pageSize
    const [parts, countRows] = await Promise.all([
      prisma.$queryRaw<Part[]>(Prisma.sql`
        SELECT * FROM "Part"
        WHERE "isActive" = true AND "stockQty" <= "reorderLevel"
        ${searchFilter}
        ORDER BY name ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `),
      prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*) as count FROM "Part"
        WHERE "isActive" = true AND "stockQty" <= "reorderLevel"
        ${searchFilter}
      `),
    ])
    const partsWithFlag = (parts as Record<string, unknown>[]).map((p) => ({ ...p, isLowStock: true }))
    return apiSuccess({ parts: partsWithFlag, total: Number(countRows[0].count), page, pageSize })
  }

  const where: Record<string, unknown> = { isActive: true }

  if (search) {
    where.OR = [
      { name:    { contains: search, mode: 'insensitive' } },
      { sku:     { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.part.count({ where }),
  ])

  const partsWithFlag = parts.map((p) => ({
    ...p,
    isLowStock: p.stockQty <= p.reorderLevel,
  }))

  return apiSuccess({ parts: partsWithFlag, total, page, pageSize })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth('parts:manage')

  const { data, error } = await parseBody(req, createPartSchema)
  if (error) return error

  const part = await prisma.part.create({ data })

  await logAudit({
    userId:     user.id,
    action:     'part.created',
    entityType: 'Part',
    entityId:   part.id,
    newValue:   { sku: part.sku, name: part.name, stockQty: 0 },
  })

  return apiSuccess(part, 201)
})