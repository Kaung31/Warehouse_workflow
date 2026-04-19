import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, parseBody, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { getUploadUrl, validateFileUpload } from '@/lib/r2'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

const uploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes:   z.number().int().positive(),
  photoType:   z.enum(['SCOOTER_INBOUND', 'SCOOTER_OUTBOUND', 'REPAIR_EVIDENCE', 'DAMAGE_REPORT']),
  entityType:  z.enum(['Scooter', 'RepairOrder']),
  entityId:    z.string().cuid(),
  caption:     z.string().max(200).optional(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth('scooter:view') // any authenticated user can upload

  const { data, error } = await parseBody(req, uploadSchema)
  if (error) return error

  const validationError = validateFileUpload(data.contentType, data.sizeBytes)
  if (validationError) return apiError(validationError, 400)

  // Random key so users cannot guess other files' URLs
  const ext = data.contentType.split('/')[1]
  const key = `photos/${data.entityType.toLowerCase()}/${data.entityId}/${randomUUID()}.${ext}`

  const uploadUrl = await getUploadUrl(key, data.contentType)

  // Save the photo record — key stored, not the URL (URLs are generated on-demand)
  await prisma.photo.create({
    data: {
      photoType:  data.photoType,
      entityType: data.entityType,
      entityId:   data.entityId,
      s3Key:      key,
      caption:    data.caption,
      takenById:  user.id,
    },
  })

  // Return the signed upload URL — browser POSTs the file directly to R2
  return apiSuccess({ uploadUrl, key })
})