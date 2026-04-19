import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import SearchBar from '@/components/ui/SearchBar'
import StatCard from '@/components/ui/StatCard'
import LinkRow from '@/components/ui/LinkRow'

export default async function SecondHandPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; grade?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const sp     = await searchParams
  const search = sp.search ?? ''
  const grade  = sp.grade

  const where: Record<string, unknown> = {
    status: { in: ['SECOND_HAND_AVAILABLE', 'SOLD'] },
  }
  if (grade) where.grade = grade
  if (search) {
    where.OR = [
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { model:        { contains: search, mode: 'insensitive' } },
      { brand:        { contains: search, mode: 'insensitive' } },
    ]
  }

  const [scooters, available, sold, totalRevenue] = await Promise.all([
    prisma.scooter.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { name: true } },
      },
    }),
    prisma.scooter.count({ where: { status: 'SECOND_HAND_AVAILABLE' } }),
    prisma.scooter.count({ where: { status: 'SOLD' } }),
    prisma.scooter.aggregate({
      where: { status: 'SOLD' },
      _sum:  { salePrice: true },
    }),
  ])

  return (
    <div className="fade-up">
      <PageHeader title="Second-hand stock" sub="Graded scooters for resale" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Available"     value={available} accent />
        <StatCard label="Sold"          value={sold} />
        <StatCard label="Total revenue" value={`£${Number(totalRevenue._sum.salePrice ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`} />
      </div>

      {/* Grade filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['ALL', 'A', 'B', 'C'].map(g => {
          const active = (grade ?? 'ALL') === g
          const colors: Record<string, string> = { A: 'var(--green)', B: 'var(--amber)', C: 'var(--red)' }
          return (
            <Link key={g} href={`/second-hand${g !== 'ALL' ? `?grade=${g}` : ''}${search ? `${g !== 'ALL' ? '&' : '?'}search=${search}` : ''}`}>
              <button style={{
                padding:      '5px 14px',
                fontSize:     12,
                fontWeight:   active ? 600 : 400,
                background:   active ? 'var(--bg-raised)' : 'transparent',
                border:       `1px solid ${active && g !== 'ALL' ? colors[g] : active ? 'var(--border-focus)' : 'var(--border)'}`,
                borderRadius: 20,
                color:        active && g !== 'ALL' ? colors[g] : active ? 'var(--accent)' : 'var(--text-muted)',
                cursor:       'pointer',
                fontFamily:   'var(--font-sans)',
              }}>
                {g === 'ALL' ? 'All grades' : `Grade ${g}`}
              </button>
            </Link>
          )
        })}
        <div style={{ marginLeft: 'auto' }}>
          <SearchBar placeholder="Search serial, model..." />
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Serial number</th>
              <th>Brand / Model</th>
              <th>Grade</th>
              <th>Sale price</th>
              <th>Purchase cost</th>
              <th>Customer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {scooters.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 48 }}>
                  No second-hand scooters found
                </td>
              </tr>
            )}
            {scooters.map((s) => {
              const gradeColors: Record<string, string> = { A: 'var(--green)', B: 'var(--amber)', C: 'var(--red)' }
              const margin = s.salePrice && s.purchaseCost
                ? Number(s.salePrice) - Number(s.purchaseCost)
                : null

              return (
                <LinkRow key={s.id} href={`/scooters/${s.id}`}>
                  <td><span className="mono" style={{ color: 'var(--accent)' }}>{s.serialNumber}</span></td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.brand}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.model}</div>
                  </td>
                  <td>
                    {s.grade ? (
                      <span style={{
                        fontFamily:   'var(--font-mono)',
                        fontSize:     13,
                        fontWeight:   600,
                        color:        gradeColors[s.grade] ?? 'var(--text)',
                      }}>
                        {s.grade}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {s.salePrice ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green)' }}>
                        £{Number(s.salePrice).toFixed(0)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {s.purchaseCost ? (
                      <div>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          £{Number(s.purchaseCost).toFixed(0)}
                        </span>
                        {margin !== null && (
                          <span style={{
                            fontSize: 11, marginLeft: 8,
                            color: margin >= 0 ? 'var(--green)' : 'var(--red)',
                          }}>
                            {margin >= 0 ? '+' : ''}£{margin.toFixed(0)}
                          </span>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {s.customer?.name ?? '—'}
                  </td>
                  <td><StatusBadge status={s.status} type="scooter" /></td>
                </LinkRow>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}