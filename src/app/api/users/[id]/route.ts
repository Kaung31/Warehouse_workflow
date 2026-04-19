import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

const updateUserSchema = z.object({
  role:     z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
})

export const PATCH = withErrorHandler(async (req: NextRequest, ctx: unknown) => {
  const actor = await requireAuth('users:manage')

  const id = (ctx as { params: { id: string } }).params.id
  if (actor.id === id) return apiError('You cannot change your own role or status', 400)

  const { data, error } = await parseBody(req, updateUserSchema)
  if (error) return error

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return apiError('User not found', 404)

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })

  return apiSuccess(updated)
})
