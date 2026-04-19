import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

type AuditParams = {
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     params.userId,
        action:     params.action,
        entityType: params.entityType,
        entityId:   params.entityId,
        oldValue:   params.oldValue as unknown as Prisma.InputJsonValue,
        newValue:   params.newValue as unknown as Prisma.InputJsonValue,
        ipAddress:  params.ipAddress,
      },
    })
  } catch (error) {
    console.error('[AUDIT LOG FAILED]', { params, error })
  }
}
