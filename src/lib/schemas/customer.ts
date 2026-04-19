import { z } from 'zod'

export const createCustomerSchema = z.object({
  name:         z.string().min(1).max(100),
  email:        z.string().email().optional().or(z.literal('')),
  phone:        z.string().max(20).optional(),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city:         z.string().min(1).max(100),
  // UK postcode validation
  postcode:     z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, 'Invalid UK postcode'),
  notes:        z.string().max(1000).optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>