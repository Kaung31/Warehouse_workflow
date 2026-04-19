import { z } from 'zod'
import { Grade } from '@prisma/client'

export const gradeScooterSchema = z.object({
  grade:        z.nativeEnum(Grade),
  salePrice:    z.number().positive('Sale price must be positive'),
  purchaseCost: z.number().positive().optional(),
  notes:        z.string().max(1000).optional(),
})

export const sellScooterSchema = z.object({
  customerId: z.string().cuid('Invalid customer ID'),
  salePrice:  z.number().positive(),
  notes:      z.string().max(500).optional(),
})

export const reserveScooterSchema = z.object({
  customerId: z.string().cuid(),
  notes:      z.string().max(500).optional(),
})

export type GradeScooterInput   = z.infer<typeof gradeScooterSchema>
export type SellScooterInput    = z.infer<typeof sellScooterSchema>
export type ReserveScooterInput = z.infer<typeof reserveScooterSchema>