import { z } from 'zod'
import { ScooterStatus, Grade } from '@prisma/client'

export const createScooterSchema = z.object({
  serialNumber: z.string().min(1).max(50).regex(/^[A-Z0-9\-]+$/i, 'Serial number must be letters, numbers, hyphens only'),
  model:        z.string().min(1).max(100),
  brand:        z.string().min(1).max(100),
  colour:       z.string().max(50).optional(),
  customerId:   z.string().cuid().optional(),
  purchaseDate: z.string().datetime().optional(),
  purchaseCost: z.number().positive().optional(),
  notes:        z.string().max(1000).optional(),
})

export const updateScooterSchema = z.object({
  model:        z.string().min(1).max(100).optional(),
  brand:        z.string().min(1).max(100).optional(),
  colour:       z.string().max(50).optional(),
  status:       z.nativeEnum(ScooterStatus).optional(),
  grade:        z.nativeEnum(Grade).optional(),
  customerId:   z.string().cuid().nullable().optional(),
  salePrice:    z.number().positive().optional(),
  notes:        z.string().max(1000).optional(),
})

export type CreateScooterInput = z.infer<typeof createScooterSchema>
export type UpdateScooterInput = z.infer<typeof updateScooterSchema>