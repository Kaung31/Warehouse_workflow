import { z } from 'zod'

export const createPartSchema = z.object({
  sku:              z.string().min(1).max(50).regex(/^[A-Z0-9\-]+$/i),
  barcode:          z.string().max(100).optional(),
  name:             z.string().min(1).max(200),
  description:      z.string().max(1000).optional(),
  reorderLevel:     z.number().int().min(0).default(5),
  warehouseLocation:z.string().max(50).optional(),
  unitCost:         z.number().positive().optional(),
  supplierName:     z.string().max(200).optional(),
})

export const updatePartSchema = createPartSchema.partial()

export const adjustStockSchema = z.object({
  delta:  z.number().int().refine(n => n !== 0, 'Delta cannot be zero'),
  notes:  z.string().max(500),
})

export type CreatePartInput = z.infer<typeof createPartSchema>
export type UpdatePartInput = z.infer<typeof updatePartSchema>