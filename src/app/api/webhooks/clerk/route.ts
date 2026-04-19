import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) return new NextResponse('Missing webhook secret', { status: 500 })

  const headerPayload = await headers()
  const svix_id        = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id':        svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch {
    return new NextResponse('Invalid signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0]?.email_address ?? ''
    const name  = [first_name, last_name].filter(Boolean).join(' ') || email

    await prisma.user.upsert({
      where:  { clerkId: id },
      update: { name, email },
      create: {
        clerkId: id,
        name,
        email,
        role: Role.CS,
      },
    })
  }

  if (evt.type === 'user.deleted') {
    if (evt.data.id) {
      await prisma.user.updateMany({
        where: { clerkId: evt.data.id },
        data:  { isActive: false },
      })
    }
  }

  return new NextResponse('OK', { status: 200 })
}
