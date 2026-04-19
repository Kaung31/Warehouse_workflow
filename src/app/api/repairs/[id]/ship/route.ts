import { NextRequest } from 'next/server'
import { requireAuth, apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers'
import { createDpdShipment } from '@/lib/dpd'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { r2 } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

type Ctx = { params: Promise<{ id: string }> }

export const POST = withErrorHandler(async (_req: NextRequest, ctx: unknown) => {
  const user = await requireAuth('shipping:create')
  const { id } = await (ctx as Ctx).params

  const repair = await prisma.repairOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      scooter:  true,
    },
  })

  if (!repair) return apiError('Repair order not found', 404)

  // Only create label when repair is ready to ship
  if (repair.status !== 'READY_TO_SHIP') {
    return apiError('Repair must be in READY_TO_SHIP status before creating a shipping label', 400)
  }

  // Check no label already created for this repair
  const existingShipment = await prisma.shipment.findFirst({
    where: { repairOrderId: id, status: { not: 'FAILED' } },
  })
  if (existingShipment) {
    return apiError('A shipping label already exists for this repair order', 409)
  }

  // Call DPD API
  const shipment = await createDpdShipment({
    customerName:    repair.customer.name,
    addressLine1:    repair.customer.addressLine1 ?? '',
    addressLine2:    repair.customer.addressLine2 ?? undefined,
    city:            repair.customer.city ?? '',
    postcode:        repair.customer.postcode ?? '',
    phone:           repair.customer.phone   ?? undefined,
    email:           repair.customer.email   ?? undefined,
    referenceNumber: repair.orderNumber,
    parcelWeight:    15,  // kg — update this if you store scooter weight on the model
  })

  // Store the label PDF in R2
  const labelKey = `labels/${repair.orderNumber}-${randomUUID()}.pdf`
  const labelBuffer = Buffer.from(shipment.labelPdf, 'base64')

  await r2.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME!,
    Key:         labelKey,
    Body:        labelBuffer,
    ContentType: 'application/pdf',
  }))

  // Save shipment record
  const newShipment = await prisma.shipment.create({
    data: {
      repairOrderId:  id,
      carrier:        'DPD',
      trackingNumber: shipment.trackingNumber,
      dpdShipmentId:  shipment.shipmentId,
      labelS3Key:     labelKey,
      status:         'LABEL_CREATED',
    },
  })

  await logAudit({
    userId:     user.id,
    action:     'shipment.label_created',
    entityType: 'RepairOrder',
    entityId:   id,
    newValue:   {
      trackingNumber: shipment.trackingNumber,
      carrier:        'DPD',
      orderNumber:    repair.orderNumber,
    },
  })

  return apiSuccess({
    shipmentId:     newShipment.id,
    trackingNumber: shipment.trackingNumber,
    labelKey,
    // Return the base64 PDF so the frontend can open/print it immediately
    labelPdf:       shipment.labelPdf,
  }, 201)
})