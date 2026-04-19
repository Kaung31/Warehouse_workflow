import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import LinkRow from '@/components/ui/LinkRow'
import StatusBadge from '@/components/ui/StatusBadge'
import SearchBar from '@/components/ui/SearchBar'
import Btn from '@/components/ui/Btn'
import { RepairStatus } from '@prisma/client'

const STATUS_TABS = ['ALL', 'RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'QUALITY_CHECK', 'READY_TO_SHIP', 'DISPATCHED']

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/sign-in')

  const sp      = await searchParams
  const search  = sp.search ?? ''
  const status  = sp.status
  const page    = Math.max(1, parseInt(sp.page ?? '1'))
  const perPage = 25

  const where: Record<string, unknown> = {}
  if (status && status !== 'ALL') where.status = status as RepairStatus
  if (user.role === 'MECHANIC') where.mechanicId = user.id

  if (search) {
    where.OR = [
      { orderNumber:      { contains: search, mode: 'insensitive' } },
      { faultDescription: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { scooter:  { serialNumber: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [repairs, total] = await Promise.all([
    prisma.repairOrder.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip:    (page - 1) * perPage,
      take:    perPage,
      include: {
        customer: { select: { name: true, postcode: true } },
        scooter:  { select: { serialNumber: true, model: true } },
        mechanic: { select: { name: true } },
      },
    }),
    prisma.repairOrder.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="fade-up">
      <PageHeader
        title="Repair orders"
        sub={`${total} total`}
        action={
          <Link href="/repairs/new">
            <Btn variant="primary">+ New repair</Btn>
          </Link>
        }
      />

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((s) => {
          const active = (status ?? 'ALL') === s
          return (
            <Link key={s} href={`/repairs?status=${s}${search ? `&search=${search}` : ''}`}>
              <button style={{
                padding:      '5px 12px',
                fontSize:     11,
                fontWeight:   active ? 500 : 400,
                background:   active ? 'var(--bg-raised)' : 'transparent',
                border:       `1px solid ${active ? 'var(--border-light)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                color:        active ? 'var(--text)' : 'var(--text-muted)',
                cursor:       'pointer',
                fontFamily:   'var(--font-sans)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {s.replace(/_/g, ' ')}
              </button>
            </Link>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Search order number, customer, serial number..." />
      </div>

      {/* Table */}
      <div style={{
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Scooter</th>
              <th>Fault</th>
              <th>Mechanic</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {repairs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>
                  No repairs found
                </td>
              </tr>
            )}
            {repairs.map((r) => (
              <LinkRow key={r.id} href={`/repairs/${r.id}`}>
                <td><span className="mono" style={{ color: 'var(--accent)' }}>{r.orderNumber}</span></td>
                <td>
                  <div>{r.customer.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{r.customer.postcode}</div>
                </td>
                <td>
                  <span className="mono">{r.scooter.serialNumber}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{r.scooter.model}</div>
                </td>
                <td style={{ maxWidth: 200 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {r.faultDescription.slice(0, 60)}{r.faultDescription.length > 60 ? '…' : ''}
                  </span>
                </td>
                <td style={{ color: r.mechanic ? 'var(--text)' : 'var(--text-faint)', fontSize: 12 }}>
                  {r.mechanic?.name ?? '— unassigned'}
                </td>
                <td><StatusBadge status={r.priority} type="priority" /></td>
                <td><StatusBadge status={r.status} /></td>
                <td style={{ color: 'var(--text-faint)', fontSize: 11 }}>
                  {new Date(r.createdAt).toLocaleDateString('en-GB')}
                </td>
              </LinkRow>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', gap: 8, padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            alignItems: 'center', justifyContent: 'flex-end',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-faint)', marginRight: 8 }}>
              Page {page} of {totalPages}
            </span>
            {page > 1 && (
              <Link href={`/repairs?page=${page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
                <Btn size="sm">← Prev</Btn>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/repairs?page=${page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
                <Btn size="sm">Next →</Btn>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}