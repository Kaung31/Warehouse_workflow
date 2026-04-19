import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import SearchBar from '@/components/ui/SearchBar'
import Btn from '@/components/ui/Btn'
import LinkRow from '@/components/ui/LinkRow'
import { ScooterStatus } from '@prisma/client'

const STATUS_TABS = ['ALL', 'IN_STOCK', 'WITH_CUSTOMER', 'IN_REPAIR', 'READY_TO_SHIP', 'DISPATCHED', 'SECOND_HAND_AVAILABLE', 'SOLD']

export default async function ScootersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const sp      = await searchParams
  const search  = sp.search ?? ''
  const status  = sp.status
  const page    = Math.max(1, parseInt(sp.page ?? '1'))
  const perPage = 25

  const where: Record<string, unknown> = {}
  if (status && status !== 'ALL') where.status = status as ScooterStatus
  if (search) {
    where.OR = [
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { model:        { contains: search, mode: 'insensitive' } },
      { brand:        { contains: search, mode: 'insensitive' } },
    ]
  }

  const [scooters, total] = await Promise.all([
    prisma.scooter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * perPage,
      take:    perPage,
      include: {
        customer: { select: { name: true, postcode: true } },
        _count:   { select: { repairOrders: true } },
      },
    }),
    prisma.scooter.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="fade-up">
      <PageHeader
        title="Scooters"
        sub={`${total} total`}
        action={
          <Link href="/scooters/new">
            <Btn variant="primary">+ Add scooter</Btn>
          </Link>
        }
      />

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((s) => {
          const active = (status ?? 'ALL') === s
          const label  = s === 'ALL' ? 'All' : s.replace(/_/g, ' ')
          return (
            <Link key={s} href={`/scooters?status=${s}${search ? `&search=${search}` : ''}`}>
              <button style={{
                padding:       '5px 12px',
                fontSize:      11,
                fontWeight:    active ? 500 : 400,
                background:    active ? 'var(--bg-raised)' : 'transparent',
                border:        `1px solid ${active ? 'var(--border-focus)' : 'var(--border)'}`,
                borderRadius:  20,
                color:         active ? 'var(--accent)' : 'var(--text-muted)',
                cursor:        'pointer',
                fontFamily:    'var(--font-sans)',
                whiteSpace:    'nowrap',
                transition:    'all 0.1s',
              }}>
                {label}
              </button>
            </Link>
          )
        })}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Search serial number, model, brand..." />
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Serial number</th>
              <th>Brand / Model</th>
              <th>Colour</th>
              <th>Customer</th>
              <th>Repairs</th>
              <th>Status</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {scooters.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 48 }}>
                  No scooters found
                </td>
              </tr>
            )}
            {scooters.map((s) => (
              <LinkRow key={s.id} href={`/scooters/${s.id}`}>
                <td>
                  <span className="mono" style={{ color: 'var(--accent)' }}>
                    {s.serialNumber}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.brand}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.model}</div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {s.colour ?? '—'}
                </td>
                <td>
                  {s.customer ? (
                    <div>
                      <div style={{ fontSize: 13 }}>{s.customer.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        <span className="mono">{s.customer.postcode}</span>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-faint)' }}>—</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="mono" style={{
                    background:   'var(--bg-raised)',
                    padding:      '2px 8px',
                    borderRadius: 4,
                    fontSize:     12,
                    color:        s._count.repairOrders > 0 ? 'var(--text)' : 'var(--text-faint)',
                  }}>
                    {s._count.repairOrders}
                  </span>
                </td>
                <td>
                  <StatusBadge status={s.status} type="scooter" />
                </td>
                <td style={{ color: 'var(--text-faint)', fontSize: 11 }}>
                  {new Date(s.createdAt).toLocaleDateString('en-GB')}
                </td>
              </LinkRow>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{
            display: 'flex', gap: 8, padding: '12px 16px',
            borderTop:      '1px solid var(--border)',
            alignItems:     'center',
            justifyContent: 'flex-end',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-faint)', marginRight: 8 }}>
              Page {page} of {totalPages} · {total} scooters
            </span>
            {page > 1 && (
              <Link href={`/scooters?page=${page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
                <Btn size="sm" variant="secondary">← Prev</Btn>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/scooters?page=${page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
                <Btn size="sm" variant="secondary">Next →</Btn>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}