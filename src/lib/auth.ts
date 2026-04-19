import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { requireRole } from './rbac'
import type { Permission } from './rbac'
import type { User } from '@prisma/client'

export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth()
  if (!userId) return null

  return prisma.user.findUnique({
    where: { clerkId: userId },
  })
}

export async function requireAuth(permission?: Permission): Promise<User> {
  const user = await getCurrentUser()

  if (!user) throw new Error('UNAUTHENTICATED')
  if (!user.isActive) throw new Error('UNAUTHENTICATED')
  if (permission) requireRole(user.role, permission)

  return user
}
