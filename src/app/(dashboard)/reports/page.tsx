import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { subDays, startOfDay, startOfMonth } from 'date-fns'

export default async function ReportsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    redirect('/dashboard')
  }

  const today      = startOfDay(new Date())
  const monthStart = startOfMonth(new Date())
  const last7      = subDays(today, 7)
  const last30     = subDays(today, 30)

  const [
    repairsByStatus,
    completedLast30,
    avgResolutionRaw,
    mechanicStats,
    lowStockParts,
    topParts,
    secondHandRevenue,
    dailyLast7,
  ] = await Promise.all([
    prisma.repairOrder.groupBy({ by: ['status'], _count: true }),

    prisma.repairOrder.count({
      where: { status: 'DISPATCHED', updatedAt: { gte: last30 } },
    }),

    prisma.$queryRaw<{ avg_hours: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("closedAt" - "createdAt")) / 3600) as avg_hours
      FROM "RepairOrder"
      WHERE status = 'DISPATCHED' AND "closedAt" IS NOT NULL AND "createdAt" >= ${last30}
    `,

    prisma.repairOrder.groupBy({
      by:    ['mechanicId'],
      where: { status: 'DISPATCHED', updatedAt: { gte: last30 } },
      _count:{ _all: true },
      orderBy: { _count: { mechanicId: 'desc' } },
    }),

    prisma.part.findMany({
      where:   { isActive: true, stockQty: { lte: prisma.part.fields.reorderLevel } },
      orderBy: { stockQty: 'asc' },
      take:    10,
      select:  { id: true, name: true, sku: true, stockQty: true, reorderLevel: true, supplierName: true },
    }),

    prisma.$queryRaw<{ name: string; sku: string; total: bigint }[]>`
      SELECT p.name, p.sku, ABS(SUM(sm.delta)) as total
      FROM "StockMovement" sm
      JOIN "Part" p ON p.id = sm."partId"
      WHERE sm.reason = 'REPAIR_CONSUMED' AND sm."createdAt" >= ${last30}
      GROUP BY p.name, p.sku
      ORDER BY total DESC LIMIT 8
    `,

    prisma.scooter.aggregate({
      where: { status: 'SOLD', updatedAt: { gte: monthStart } },
      _sum:  { salePrice: true },
      _count: true,
    }),

    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "RepairOrder"
      WHERE "createdAt" >= ${last7}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  ])

  // Resolve mechanic names
  const mechanicIds = mechanicStats.map(m => m.mechanicId).filter(Boolean) as string[]
  const mechanics   = await prisma.user.findMany({
    where:  { id: { in: mechanicIds } },
    select: { id: true, name: true },
  })
  const mechanicMap = Object.fromEntries(mechanics.map(m => [m.id, m.name]))

  const activeRepairs = repairsByStatus
    .filter(r => !['DISPATCHED', 'CANCELLED'].includes(r.status))
    .reduce((sum, r) => sum + r._count, 0)

  const avgHours = Math.round(avgResolutionRaw[0]?.avg_hours ?? 0)

  return (
    <div className="fade-up">
      <PageHeader title="Reports" sub="Last 30 days unless noted otherwise" />

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard label="Active repairs"    value={activeRepairs} accent />
        <StatCard label="Completed (30d)"   value={completedLast30} />
        <StatCard label="Avg resolution"    value={`${avgHours}h`} sub="received → dispatched" />
        <StatCard label="2nd hand revenue"  value={`£${Number(secondHandRevenue._sum.salePrice ?? 0).toLocaleString()}`} sub={`${secondHandRevenue._count} sold this month`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Repair queue breakdown */}
        <div className="card">
          <SectionHeader>Repair queue by status</SectionHeader>
          <div style={{ padding: '0 0 8px' }}>
            {repairsByStatus
              .sort((a, b) => b._count - a._count)
              .map((r) => (
                <div key={r.status} style={{
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'space-between',
                  padding:       '10px 18px',
                  borderBottom:  '1px solid var(--border-muted)',
                }}>
                  <StatusBadge status={r.status} />
                  <span className="mono" style={{ fontSize: 14, fontWeight: 500 }}>
                    {r._count}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Mechanic performance */}
        <div className="card">
          <SectionHeader>Mechanic performance (30d completed)</SectionHeader>
          <div style={{ padding: '0 0 8px' }}>
            {mechanicStats.length === 0 && (
              <div style={{ padding: '20px 18px', color: 'var(--text-faint)', fontSize: 13 }}>
                No data yet
              </div>
            )}
            {mechanicStats.map((m, i) => {
              const name = m.mechanicId ? mechanicMap[m.mechanicId] ?? 'Unknown' : 'Unassigned'
              const max  = mechanicStats[0]._count._all
              const pct  = Math.round((m._count._all / max) * 100)
              return (
                <div key={m.mechanicId ?? 'unassigned'} style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13 }}>{name}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{m._count._all}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-raised)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: i === 0 ? 'var(--accent)' : 'var(--border-focus)',
                      borderRadius: 2, transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Low stock */}
        <div className="card">
          <SectionHeader>Low stock parts ({lowStockParts.length})</SectionHeader>
          {lowStockParts.length === 0 ? (
            <div style={{ padding: '20px 18px', color: 'var(--green)', fontSize: 13 }}>
              ✓ All parts adequately stocked
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Reorder at</th>
                </tr>
              </thead>
              <tbody>
                {lowStockParts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500, fontSize: 12 }}>{p.name}</td>
                    <td><span className="mono">{p.sku}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ color: p.stockQty === 0 ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>
                        {p.stockQty}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ color: 'var(--text-faint)' }}>{p.reorderLevel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top consumed parts */}
        <div className="card">
          <SectionHeader>Most used parts (30d)</SectionHeader>
          {topParts.length === 0 ? (
            <div style={{ padding: '20px 18px', color: 'var(--text-faint)', fontSize: 13 }}>
              No part usage data yet
            </div>
          ) : (
            <div style={{ padding: '0 0 8px' }}>
              {topParts.map((p, i) => {
                const max = Number(topParts[0].total)
                const pct = Math.round((Number(p.total) / max) * 100)
                return (
                  <div key={p.sku} style={{ padding: '9px 18px', borderBottom: '1px solid var(--border-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{p.name}</span>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{Number(p.total)}×</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--bg-raised)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: i < 3 ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 2,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily repair intake — last 7 days */}
      <div className="card">
        <SectionHeader>Daily repair intake — last 7 days</SectionHeader>
        <div style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-end', height: 120 }}>
          {dailyLast7.length === 0 ? (
            <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>No data yet</div>
          ) : (() => {
            const max = Math.max(...dailyLast7.map(d => Number(d.count)), 1)
            return dailyLast7.map((d) => {
              const pct   = Math.round((Number(d.count) / max) * 100)
              const label = new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
              return (
                <div key={String(d.date)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {Number(d.count)}
                  </span>
                  <div style={{
                    width:        '100%',
                    height:       `${Math.max(pct, 4)}%`,
                    background:   'var(--accent-dim)',
                    borderRadius: '3px 3px 0 0',
                    minHeight:    4,
                    transition:   'height 0.3s ease',
                  }} />
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding:      '12px 18px',
      borderBottom: '1px solid var(--border)',
      fontSize:     12,
      fontWeight:   600,
      color:        'var(--text-muted)',
      textTransform:'uppercase',
      letterSpacing:'0.07em',
    }}>
      {children}
    </div>
  )
}