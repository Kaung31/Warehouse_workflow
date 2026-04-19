import { NextRequest } from 'next/server'
import { requireAuth, apiSuccess, withErrorHandler } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAuth('repair:view')
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') as Role | null

  const users = await prisma.user.findMany({
    where:   { isActive: true, ...(role ? { role } : {}) },
    select:  { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return apiSuccess(users)
})