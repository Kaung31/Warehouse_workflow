import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import TopBarClient from './TopBarClient'

export default async function TopBar() {
  const { userId } = await auth()
  let role = ''
  let name = ''
  if (userId) {
    const user = await prisma.user.findUnique({
      where:  { clerkId: userId },
      select: { role: true, name: true },
    })
    role = user?.role ?? ''
    name = user?.name ?? ''
  }

  return <TopBarClient role={role} name={name} />
}
