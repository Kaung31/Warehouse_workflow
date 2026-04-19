import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Only admins can access this page
  const me = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!me || me.role !== 'ADMIN') redirect('/dashboard')

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, email: true, role: true,
      isActive: true, createdAt: true,
      _count: { select: { repairOrders: true } },
    },
  })

  return (
    <div className="fade-up">
      <PageHeader
        title="Users"
        sub={`${users.length} accounts`}
      />

      <UsersClient users={users} currentUserId={me.id} />
    </div>
  )
}
