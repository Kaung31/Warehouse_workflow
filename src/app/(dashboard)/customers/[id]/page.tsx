import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import Btn from '@/components/ui/Btn'
import LinkRow from '@/components/ui/LinkRow'

type Ctx = { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Ctx) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id, isDeleted: false },
    include: {
      scooters: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { repairOrders: true } } },
      },
      repairOrders: {
        orderBy: { createdAt: 'desc' },
        include: {
          scooter:  { select: { serialNumber: true, model: true, brand: true } },
          mechanic: { select: { name: true } },
        },
      },
    },
  })

  if (!customer) notFound()

  const totalSpend = customer.repairOrders.reduce(
    (sum, r) => sum + (r.finalCost ? Number(r.finalCost) : r.estimatedCost ? Number(r.estimatedCost) : 0),
    0
  )

  const activeRepairs = customer.repairOrders.filter(
    r => !['DISPATCHED', 'CANCELLED'].includes(r.status)
  ).length

  return (
    <div className="fade-up">
      <PageHeader
        title={customer.name}
        sub={customer.email ?? customer.phone ?? 'No contact info'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/scooters/new?customerId=${customer.id}`}>
              <Btn variant="secondary" size="sm">+ Add scooter</Btn>
            </Link>
            <Link href={`/repairs/new?customerId=${customer.id}`}>
              <Btn variant="primary" size="sm">+ New repair</Btn>
            </Link>
            <Link href="/customers">
              <Btn variant="ghost" size="sm">← Back</Btn>
            </Link>
          </div>
        }
      />

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Scooters',       value: customer.scooters.length },
          { label: 'Total repairs',  value: customer.repairOrders.length },
          { label: 'Active repairs', value: activeRepairs, warn: activeRepairs > 0 },
          { label: 'Est. spend',     value: `£${totalSpend.toFixed(0)}` },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.warn ? 'var(--amber)' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Contact info */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <SectionTitle>Contact details</SectionTitle>
          <Field label="Email"    value={customer.email} />
          <Field label="Phone"    value={customer.phone} />
          <Field label="Address"  value={[customer.addressLine1, customer.addressLine2].filter(Boolean).join(', ')} />
          <Field label="City"     value={customer.city} />
          <Field label="Postcode" value={customer.postcode} mono />
          {customer.notes && <Field label="Notes" value={customer.notes} />}
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 12 }}>
            Customer since {new Date(customer.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Scooters */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <SectionTitle>Scooters ({customer.scooters.length})</SectionTitle>
          {customer.scooters.length === 0 ? (
            <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>No scooters registered</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {customer.scooters.map(s => (
                <Link key={s.id} href={`/scooters/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px',
                    background: 'var(--bg-raised)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-muted)',
                    cursor: 'pointer',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {s.serialNumber}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.brand} {s.model}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {s._count.repairOrders} repairs
                      </span>
                      <StatusBadge status={s.status} type="scooter" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Repair timeline */}
      <div className="card">
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          fontSize: 13, fontWeight: 500,
        }}>
          Repair history ({customer.repairOrders.length})
        </div>
        {customer.repairOrders.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            No repairs yet
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Scooter</th>
                <th>Fault</th>
                <th>Mechanic</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {customer.repairOrders.map(r => (
                <LinkRow key={r.id} href={`/repairs/${r.id}`}>
                  <td><span className="mono" style={{ color: 'var(--accent)' }}>{r.orderNumber}</span></td>
                  <td>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{r.scooter.serialNumber}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{r.scooter.brand} {r.scooter.model}</div>
                  </td>
                  <td style={{ maxWidth: 220, color: 'var(--text-muted)', fontSize: 12 }}>
                    {r.faultDescription.slice(0, 60)}{r.faultDescription.length > 60 ? '…' : ''}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {r.mechanic?.name ?? <span style={{ color: 'var(--text-faint)' }}>—</span>}
                  </td>
                  <td><StatusBadge status={r.priority} /></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    {r.finalCost
                      ? `£${Number(r.finalCost).toFixed(2)}`
                      : r.estimatedCost
                        ? <span style={{ color: 'var(--text-faint)' }}>~£{Number(r.estimatedCost).toFixed(0)}</span>
                        : <span style={{ color: 'var(--text-faint)' }}>—</span>
                    }
                  </td>
                  <td style={{ color: 'var(--text-faint)', fontSize: 11 }}>
                    {new Date(r.createdAt).toLocaleDateString('en-GB')}
                  </td>
                </LinkRow>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: 13,
        color: value ? 'var(--text)' : 'var(--text-faint)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14,
    }}>
      {children}
    </div>
  )
}
