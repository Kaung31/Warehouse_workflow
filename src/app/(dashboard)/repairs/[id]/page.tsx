import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import RepairActions from '@/components/repairs/RepairActions'
import RepairPartsPanel from '@/components/repairs/RepairPartsPanel'

type Ctx = { params: Promise<{ id: string }> }

export default async function RepairDetailPage({ params }: Ctx) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/sign-in')

  const { id } = await params

  const repair = await prisma.repairOrder.findUnique({
    where: { id },
    include: {
      customer:    true,
      scooter:     true,
      mechanic:    { select: { id: true, name: true } },
      repairParts: { include: { part: { select: { name: true, sku: true, stockQty: true } } } },
      shipments:   true,
    },
  })

  if (!repair) notFound()

  // Mechanics can only see their own
  if (user.role === 'MECHANIC' && repair.mechanicId !== user.id) notFound()

  const canViewCost = ['ADMIN', 'MANAGER'].includes(user.role)
  const mechanics   = await prisma.user.findMany({
    where:   { role: 'MECHANIC', isActive: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--text-faint)' }}>
        {value ?? '—'}
      </div>
    </div>
  )

  return (
    <div className="fade-up">
      <PageHeader
        title={repair.orderNumber}
        sub={`Created ${new Date(repair.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={<StatusBadge status={repair.status} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left — main details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Scooter + Customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="Scooter">
              <Field label="Serial number" value={repair.scooter.serialNumber} />
              <Field label="Model" value={`${repair.scooter.brand} ${repair.scooter.model}`} />
              <Field label="Colour" value={repair.scooter.colour} />
            </Section>
            <Section title="Customer">
              <Field label="Name" value={repair.customer.name} />
              <Field label="Phone" value={repair.customer.phone} />
              <Field label="Email" value={repair.customer.email} />
              <Field label="Postcode" value={repair.customer.postcode} />
            </Section>
          </div>

          {/* Repair details */}
          <Section title="Repair details">
            <Field label="Fault description"   value={repair.faultDescription} />
            <Field label="Diagnosis"            value={repair.diagnosis} />
            <Field label="Resolution"           value={repair.resolution} />
            <Field label="Assigned mechanic"    value={repair.mechanic?.name} />
            <Field label="Priority"             value={repair.priority} />
            {canViewCost && (
              <>
                <Field label="Estimated cost" value={repair.estimatedCost ? `£${Number(repair.estimatedCost).toFixed(2)}` : undefined} />
                <Field label="Final cost"     value={repair.finalCost     ? `£${Number(repair.finalCost).toFixed(2)}`     : undefined} />
              </>
            )}
            {repair.internalNotes && (
              <Field label="Internal notes" value={repair.internalNotes} />
            )}
          </Section>

          {/* Parts used */}
          <RepairPartsPanel
            repairId={repair.id}
            parts={repair.repairParts}
            canEdit={['ADMIN', 'MANAGER', 'MECHANIC'].includes(user.role)}
          />

          {/* Shipping */}
          {repair.shipments.length > 0 && (
            <Section title="Shipping">
              {repair.shipments.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Carrier</div>
                    <div className="mono">{s.carrier}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Tracking</div>
                    <div className="mono" style={{ color: 'var(--accent)' }}>{s.trackingNumber ?? '—'}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </Section>
          )}
        </div>

        {/* Right — actions panel */}
        <RepairActions
          repair={{
            id:         repair.id,
            status:     repair.status,
            mechanicId: repair.mechanicId,
          }}
          mechanics={mechanics}
          userRole={user.role}
          userId={user.id}
        />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding:      '16px 18px',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 14,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}