import {
  PrismaClient,
  Role,
  RepairStatus,
  ScooterStatus,
  Priority,
  CaseType,
  QCResult,
  ErrorCode,
  PaymentStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

async function main() {
  console.log('🌱 Seeding — clearing old seed data...')

  // Clear in dependency order
  await prisma.qCChecklistResult.deleteMany()
  await prisma.qCSubmission.deleteMany()
  await prisma.errorCodeReport.deleteMany()
  await prisma.invoiceReference.deleteMany()
  await prisma.caseStatusHistory.deleteMany()
  await prisma.caseComment.deleteMany()
  await prisma.repairTimeLog.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.repairPart.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.repairOrder.deleteMany()
  await prisma.scooter.deleteMany()
  await prisma.part.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.qCChecklistTemplate.deleteMany()
  await prisma.user.deleteMany({
    where: { clerkId: { startsWith: 'seed_' } },
  })

  // ── Users ──────────────────────────────────────────────────────
  const roleList: Role[] = ['ADMIN', 'MANAGER', 'MECHANIC', 'WAREHOUSE', 'CS']

  const users = await Promise.all([
    prisma.user.create({ data: { clerkId: 'seed_admin',     email: 'admin@test.com',     name: 'Admin User',    role: 'ADMIN'     } }),
    prisma.user.create({ data: { clerkId: 'seed_manager',   email: 'manager@test.com',   name: 'Sarah Manager', role: 'MANAGER'   } }),
    prisma.user.create({ data: { clerkId: 'seed_mechanic1', email: 'mechanic1@test.com', name: 'John Mechanic', role: 'MECHANIC'  } }),
    prisma.user.create({ data: { clerkId: 'seed_mechanic2', email: 'mechanic2@test.com', name: 'Tom Wrench',    role: 'MECHANIC'  } }),
    prisma.user.create({ data: { clerkId: 'seed_warehouse', email: 'warehouse@test.com', name: 'Mike Inbound',  role: 'WAREHOUSE' } }),
    prisma.user.create({ data: { clerkId: 'seed_cs',        email: 'cs@test.com',        name: 'Emma CS',       role: 'CS'        } }),
  ])

  const admin     = users[0]
  const manager   = users[1]
  const mechanic1 = users[2]
  const mechanic2 = users[3]
  const warehouse = users[4]
  const csUser    = users[5]

  // ── QC Checklist Templates ─────────────────────────────────────
  const qcSteps = [
    { stepNumber: 1,  stepName: 'Power on / off',         description: 'Scooter powers on and off cleanly with no errors' },
    { stepNumber: 2,  stepName: 'Battery level display',  description: 'Battery percentage shows correctly on display' },
    { stepNumber: 3,  stepName: 'Throttle response',      description: 'Throttle accelerates smoothly from 0 to max speed' },
    { stepNumber: 4,  stepName: 'Brake effectiveness',    description: 'Front and rear brakes stop within acceptable distance' },
    { stepNumber: 5,  stepName: 'Brake lights',           description: 'Brake lights illuminate when brakes are applied' },
    { stepNumber: 6,  stepName: 'Headlight & tail light', description: 'Front headlight and rear light operational' },
    { stepNumber: 7,  stepName: 'Speed display',          description: 'Speed shown on display matches riding speed' },
    { stepNumber: 8,  stepName: 'Tyre condition',         description: 'No visible damage, cracks or low pressure on both tyres' },
    { stepNumber: 9,  stepName: 'Frame & deck integrity', description: 'No cracks, loose welds or structural damage visible' },
    { stepNumber: 10, stepName: 'Folding mechanism',      description: 'Stem folds and locks securely, no play when locked' },
  ]

  const templates = await Promise.all(
    qcSteps.map(s =>
      prisma.qCChecklistTemplate.create({ data: { ...s, isActive: true } })
    )
  )

  // ── Customers ──────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'James Wilson',  email: 'james@mail.com',  phone: '07700900001', addressLine1: '12 Baker St',   city: 'London',     postcode: 'SW1A 1AA' } }),
    prisma.customer.create({ data: { name: 'Sarah Brown',   email: 'sarah@mail.com',  phone: '07700900002', addressLine1: '5 Oak Avenue',  city: 'Manchester', postcode: 'M1 1AE'  } }),
    prisma.customer.create({ data: { name: 'Daniel Taylor', email: 'daniel@mail.com', phone: '07700900003', addressLine1: '88 High Street',city: 'Birmingham', postcode: 'B1 1BB'  } }),
    prisma.customer.create({ data: { name: 'Emily Johnson', email: 'emily@mail.com',  phone: '07700900004', addressLine1: '3 Mill Road',   city: 'Leeds',      postcode: 'LS1 1BA' } }),
    prisma.customer.create({ data: { name: 'Chris Lee',     email: 'chris@mail.com',  phone: '07700900005', addressLine1: '47 Park Lane',  city: 'Bristol',    postcode: 'BS1 1AA' } }),
  ])

  // ── Parts ──────────────────────────────────────────────────────
  const parts = await Promise.all([
    prisma.part.create({ data: { sku: 'P-001', barcode: 'BC001', name: 'Brake Cable',      stockQty: 25, reorderLevel: 5, unitCost: 8,   supplierName: 'ScooterParts Ltd', warehouseLocation: 'Shelf A1' } }),
    prisma.part.create({ data: { sku: 'P-002', barcode: 'BC002', name: 'Inner Tube',       stockQty: 40, reorderLevel: 10, unitCost: 6,  supplierName: 'ScooterParts Ltd', warehouseLocation: 'Shelf A2' } }),
    prisma.part.create({ data: { sku: 'P-003', barcode: 'BC003', name: 'Controller Board', stockQty: 8,  reorderLevel: 3, unitCost: 45,  supplierName: 'TechParts UK',     warehouseLocation: 'Shelf B1' } }),
    prisma.part.create({ data: { sku: 'P-004', barcode: 'BC004', name: 'Battery Pack',     stockQty: 6,  reorderLevel: 3, unitCost: 120, supplierName: 'TechParts UK',     warehouseLocation: 'Shelf B2' } }),
    prisma.part.create({ data: { sku: 'P-005', barcode: 'BC005', name: 'Brake Lever',      stockQty: 30, reorderLevel: 8, unitCost: 12,  supplierName: 'ScooterParts Ltd', warehouseLocation: 'Shelf A3' } }),
    prisma.part.create({ data: { sku: 'P-006', barcode: 'BC006', name: 'Display Screen',   stockQty: 4,  reorderLevel: 3, unitCost: 35,  supplierName: 'TechParts UK',     warehouseLocation: 'Shelf B3' } }),
    prisma.part.create({ data: { sku: 'P-007', barcode: 'BC007', name: 'Throttle',         stockQty: 15, reorderLevel: 5, unitCost: 18,  supplierName: 'ScooterParts Ltd', warehouseLocation: 'Shelf A4' } }),
  ])

  // ── Scooters ───────────────────────────────────────────────────
  const scooters = await Promise.all([
    prisma.scooter.create({ data: { serialNumber: 'SC-1001', model: 'Air Pro',    brand: 'Pure',    status: 'IN_REPAIR',    customerId: customers[0].id } }),
    prisma.scooter.create({ data: { serialNumber: 'SC-1002', model: 'Air Pro',    brand: 'Pure',    status: 'IN_REPAIR',    customerId: customers[1].id } }),
    prisma.scooter.create({ data: { serialNumber: 'SC-1003', model: 'M365',       brand: 'Xiaomi',  status: 'IN_REPAIR',    customerId: customers[2].id } }),
    prisma.scooter.create({ data: { serialNumber: 'SC-1004', model: 'Ninebot Max',brand: 'Segway',  status: 'IN_REPAIR',    customerId: customers[3].id } }),
    prisma.scooter.create({ data: { serialNumber: 'SC-1005', model: 'Air',        brand: 'Pure',    status: 'IN_REPAIR',    customerId: customers[4].id } }),
    prisma.scooter.create({ data: { serialNumber: 'SC-1006', model: 'M365 Pro',   brand: 'Xiaomi',  status: 'READY_TO_SHIP',customerId: customers[0].id } }),
    prisma.scooter.create({ data: { serialNumber: 'SC-1007', model: 'Air Go',     brand: 'Pure',    status: 'IN_STOCK',     customerId: customers[1].id } }),
    prisma.scooter.create({ data: { serialNumber: 'SC-1008', model: 'G30',        brand: 'Segway',  status: 'DISPATCHED',   customerId: customers[2].id } }),
  ])

  const now        = new Date()
  const hourAgo    = new Date(now.getTime() - 3_600_000)
  const dayAgo     = new Date(now.getTime() - 86_400_000)
  const twoDaysAgo = new Date(now.getTime() - 172_800_000)

  // ── Helper to create a full workflow case ──────────────────────
  async function createCase(opts: {
    suffix:     string
    scooter:    typeof scooters[0]
    customer:   typeof customers[0]
    status:     RepairStatus
    caseType:   CaseType
    priority:   Priority
    fault:      string
    errorCode:  ErrorCode
    mechanic?:  typeof mechanic1 | null
    invoiceNum: string | null
    payment:    PaymentStatus
  }) {
    const repair = await prisma.repairOrder.create({
      data: {
        orderNumber:      `RO-202604-${opts.suffix}`,
        scooterId:        opts.scooter.id,
        customerId:       opts.customer.id,
        mechanicId:       opts.mechanic?.id ?? null,
        status:           opts.status,
        caseType:         opts.caseType,
        priority:         opts.priority,
        faultDescription: opts.fault,
        estimatedCost:    randomInt(20, 200),
        repairStartedAt:
          ['IN_REPAIR','QUALITY_CONTROL','QC_FAILED','READY_TO_SHIP','DISPATCHED']
            .includes(opts.status) ? dayAgo : null,
        repairCompletedAt:
          ['QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED']
            .includes(opts.status) ? hourAgo : null,
        repairDurationMinutes:
          ['QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED']
            .includes(opts.status) ? randomInt(30, 240) : null,
        qcPassed:
          opts.status === 'READY_TO_SHIP' || opts.status === 'DISPATCHED' ? true
          : opts.status === 'QC_FAILED' ? false : null,
      },
    })

    // Error code
    await prisma.errorCodeReport.create({
      data: { caseId: repair.id, errorCode: opts.errorCode },
    })

    // Invoice (warranty only)
    if (opts.caseType === 'WARRANTY') {
      await prisma.invoiceReference.create({
        data: {
          caseId:        repair.id,
          invoiceNumber: opts.invoiceNum,
          paymentStatus: opts.payment,
          updatedById:   csUser.id,
        },
      })
    }

    // Status history
    type Ev = { from: string | null; to: string; reason: string; by: typeof admin; at: Date }
    const events: Ev[] = []

    events.push({
      from:   null,
      to:     opts.caseType === 'WARRANTY' ? 'AWAITING_CS' : 'BGRADE_RECORDED',
      reason: 'Scooter received at warehouse — case created',
      by:     warehouse,
      at:     twoDaysAgo,
    })

    if (['WAITING_FOR_MECHANIC','IN_REPAIR','QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED']
        .includes(opts.status)) {
      events.push({ from: 'AWAITING_CS', to: 'WAITING_FOR_MECHANIC', reason: 'CS approved — invoice confirmed', by: csUser, at: new Date(twoDaysAgo.getTime() + 3_600_000) })
    }
    if (['IN_REPAIR','QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED'].includes(opts.status)) {
      events.push({ from: 'WAITING_FOR_MECHANIC', to: 'IN_REPAIR', reason: 'Mechanic started repair', by: opts.mechanic ?? mechanic1, at: dayAgo })
    }
    if (['QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED'].includes(opts.status)) {
      events.push({ from: 'IN_REPAIR', to: 'QUALITY_CONTROL', reason: 'Repair completed — sent to QC', by: opts.mechanic ?? mechanic1, at: new Date(now.getTime() - 7_200_000) })
    }
    if (['READY_TO_SHIP','DISPATCHED'].includes(opts.status)) {
      events.push({ from: 'QUALITY_CONTROL', to: 'READY_TO_SHIP', reason: 'QC passed — all 10 steps green', by: warehouse, at: hourAgo })
    }
    if (opts.status === 'DISPATCHED') {
      events.push({ from: 'READY_TO_SHIP', to: 'DISPATCHED', reason: 'DPD label printed — handed to courier', by: warehouse, at: new Date(now.getTime() - 1_800_000) })
    }
    if (opts.status === 'DISPUTED') {
      events.push({ from: 'AWAITING_CS', to: 'DISPUTED', reason: 'Invoice amount disputed by customer', by: csUser, at: new Date(twoDaysAgo.getTime() + 7_200_000) })
    }

    for (const ev of events) {
      await prisma.caseStatusHistory.create({
        data: { caseId: repair.id, fromStatus: ev.from, toStatus: ev.to, reason: ev.reason, changedById: ev.by.id, createdAt: ev.at },
      })
    }

    // Comments
    await prisma.caseComment.create({
      data: {
        caseId:           repair.id,
        authorId:         warehouse.id,
        content:          `Scooter received in ${opts.priority === 'URGENT' ? 'poor' : 'fair'} condition. Serial number verified. ${opts.fault}`,
        isCustomerFacing: false,
        createdAt:        twoDaysAgo,
      },
    })

    if (opts.caseType === 'WARRANTY') {
      await prisma.caseComment.create({
        data: {
          caseId:           repair.id,
          authorId:         csUser.id,
          content:          opts.invoiceNum
            ? `Invoice ${opts.invoiceNum} verified. Customer confirmed warranty applies. Approved for repair.`
            : `Waiting for customer to provide invoice. Sent reminder email.`,
          isCustomerFacing: true,
          createdAt:        new Date(twoDaysAgo.getTime() + 3_600_000),
        },
      })
    }

    if (['QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED'].includes(opts.status) && opts.mechanic) {
      await prisma.caseComment.create({
        data: {
          caseId:           repair.id,
          authorId:         opts.mechanic.id,
          content:          `Repair complete. ${opts.fault.replace('—', '—').substring(0, 80)}. All components tested and working correctly.`,
          isCustomerFacing: false,
          createdAt:        new Date(now.getTime() - 7_200_000),
        },
      })
    }

    // Repair time log
    if (['IN_REPAIR','QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED'].includes(opts.status) && opts.mechanic) {
      await prisma.repairTimeLog.create({
        data: {
          caseId:           repair.id,
          mechanicId:       opts.mechanic.id,
          startedAt:        dayAgo,
          completedAt:      ['QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED'].includes(opts.status) ? hourAgo : null,
          durationMinutes:  ['QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED'].includes(opts.status) ? randomInt(30, 240) : null,
        },
      })
    }

    // Parts used (for cases past IN_REPAIR)
    if (['QUALITY_CONTROL','READY_TO_SHIP','DISPATCHED'].includes(opts.status)) {
      const usedPart = parts[randomInt(0, parts.length - 1)]
      const qty      = randomInt(1, 2)
      await prisma.repairPart.create({
        data: { repairOrderId: repair.id, partId: usedPart.id, quantity: qty },
      })
      await prisma.stockMovement.create({
        data: {
          partId:        usedPart.id,
          performedById: opts.mechanic?.id ?? mechanic1.id,
          delta:         -qty,
          reason:        'REPAIR_CONSUMED',
          referenceType: 'RepairOrder',
          referenceId:   repair.id,
        },
      })
      await prisma.part.update({
        where: { id: usedPart.id },
        data:  { stockQty: { decrement: qty } },
      })
    }

    // QC submission (for cases that passed QC)
    if (opts.status === 'READY_TO_SHIP' || opts.status === 'DISPATCHED') {
      const qcSub = await prisma.qCSubmission.create({
        data: {
          caseId:        repair.id,
          submittedById: warehouse.id,
          overallResult: 'PASS',
          submittedAt:   hourAgo,
        },
      })

      await Promise.all(
        templates.map(t =>
          prisma.qCChecklistResult.create({
            data: {
              caseId:       repair.id,
              submissionId: qcSub.id,
              templateId:   t.id,
              result:       'PASS',
              notes:        t.stepNumber === 4 ? 'Both brakes tested — stopping distance within spec' : null,
              checkedById:  warehouse.id,
              createdAt:    hourAgo,
            },
          })
        )
      )

      await prisma.repairOrder.update({
        where: { id: repair.id },
        data:  { lastQCSubmissionId: qcSub.id },
      })
    }

    // Shipment for dispatched
    if (opts.status === 'DISPATCHED') {
      await prisma.shipment.create({
        data: {
          repairOrderId:  repair.id,
          carrier:        'DPD',
          trackingNumber: `DPD${randomInt(100000000, 999999999)}`,
          status:         'DELIVERED',
          createdAt:      new Date(now.getTime() - 1_800_000),
        },
      })
    }

    return repair
  }

  // ── Create the 8 sample workflow cases ────────────────────────
  await createCase({
    suffix:     '0018',
    scooter:    scooters[0],
    customer:   customers[0],
    status:     'AWAITING_CS',
    caseType:   'WARRANTY',
    priority:   'HIGH',
    fault:      'Motor cuts out at high speed — possible controller fault',
    errorCode:  'E04',
    invoiceNum: 'INV-10018',
    payment:    'UNPAID',
  })

  await createCase({
    suffix:     '0019',
    scooter:    scooters[1],
    customer:   customers[1],
    status:     'DISPUTED',
    caseType:   'WARRANTY',
    priority:   'NORMAL',
    fault:      'Battery swelling reported by customer — safety concern',
    errorCode:  'PHYSICAL_BATTERY',
    invoiceNum: 'INV-10019',
    payment:    'DISPUTED',
  })

  await createCase({
    suffix:     '0020',
    scooter:    scooters[2],
    customer:   customers[2],
    status:     'WAITING_FOR_MECHANIC',
    caseType:   'WARRANTY',
    priority:   'NORMAL',
    fault:      'Throttle unresponsive after firmware update attempt',
    errorCode:  'E05',
    invoiceNum: 'INV-10020',
    payment:    'WARRANTY_APPROVED',
  })

  await createCase({
    suffix:     '0021',
    scooter:    scooters[3],
    customer:   customers[3],
    status:     'IN_REPAIR',
    caseType:   'WARRANTY',
    priority:   'URGENT',
    fault:      'No power at all — unit completely dead on arrival',
    errorCode:  'E01',
    mechanic:   mechanic1,
    invoiceNum: 'INV-10021',
    payment:    'WARRANTY_APPROVED',
  })

  await createCase({
    suffix:     '0022',
    scooter:    scooters[4],
    customer:   customers[4],
    status:     'QUALITY_CONTROL',
    caseType:   'WARRANTY',
    priority:   'NORMAL',
    fault:      'Brake pads worn through — both front and rear replaced',
    errorCode:  'E06',
    mechanic:   mechanic1,
    invoiceNum: 'INV-10022',
    payment:    'PAID',
  })

  await createCase({
    suffix:     '0023',
    scooter:    scooters[5],
    customer:   customers[0],
    status:     'READY_TO_SHIP',
    caseType:   'WARRANTY',
    priority:   'NORMAL',
    fault:      'Display not showing speed — replaced display module',
    errorCode:  'E07',
    mechanic:   mechanic2,
    invoiceNum: 'INV-10023',
    payment:    'PAID',
  })

  await createCase({
    suffix:     '0024',
    scooter:    scooters[6],
    customer:   customers[1],
    status:     'BGRADE_RECORDED',
    caseType:   'BGRADE',
    priority:   'LOW',
    fault:      'Pre-owned unit — general wear, minor cosmetic damage',
    errorCode:  'OTHER',
    invoiceNum: null,
    payment:    'PAID',
  })

  await createCase({
    suffix:     '0025',
    scooter:    scooters[7],
    customer:   customers[2],
    status:     'DISPATCHED',
    caseType:   'WARRANTY',
    priority:   'NORMAL',
    fault:      'Charging port damaged — replacement port fitted and tested',
    errorCode:  'E08',
    mechanic:   mechanic2,
    invoiceNum: 'INV-10025',
    payment:    'PAID',
  })

  console.log('✅ Seed complete:')
  console.log(`   ${users.length} users`)
  console.log(`   ${customers.length} customers`)
  console.log(`   ${scooters.length} scooters`)
  console.log(`   ${parts.length} parts`)
  console.log(`   ${templates.length} QC steps`)
  console.log('   8 workflow cases at different stages')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())