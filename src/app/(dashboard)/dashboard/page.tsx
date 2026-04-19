import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import StatCard from '@/components/ui/StatCard'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import Btn from '@/components/ui/Btn'
import LinkRow from '@/components/ui/LinkRow'
import { startOfDay } from 'date-fns'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Setting up your account...</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>If this persists, contact your administrator to assign your account role.</div>
      </div>
    )
  }

  const todayStart = startOfDay(new Date())
  const role = user.role
  // Cast helper: TS language server has stale RepairStatus enum (missing new values)
  const st = (s: string) => s as never

  // ── Shared counts (always shown) ───────────────────────────────────────
  const [receivedToday, dispatchedToday] = await Promise.all([
    prisma.repairOrder.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.repairOrder.count({ where: { status: 'DISPATCHED', updatedAt: { gte: todayStart } } }),
  ])

  // ── Role-specific data ─────────────────────────────────────────────────

  // CS role
  let awaitingCS = 0, disputed = 0, approvedToday = 0, csQueue: Awaited<ReturnType<typeof prisma.repairOrder.findMany>> = []
  if (['CS', 'ADMIN', 'MANAGER'].includes(role)) {
    ;[awaitingCS, disputed, approvedToday, csQueue] = await Promise.all([
      prisma.repairOrder.count({ where: { status: st('AWAITING_CS') } }),
      prisma.repairOrder.count({ where: { status: st('DISPUTED') } }),
      prisma.repairOrder.count({ where: { status: st('WAITING_FOR_MECHANIC'), updatedAt: { gte: todayStart } } }),
      prisma.repairOrder.findMany({
        where:   { status: { in: [st('AWAITING_CS'), st('DISPUTED')] } },
        take:    10,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          scooter:  { select: { serialNumber: true, brand: true, model: true } },
          customer: { select: { name: true } },
        },
      }),
    ])
  }

  // Mechanic role
  let myQueue: typeof csQueue = [], unassigned = 0, urgentCount = 0, returnedFromQC = 0
  if (['MECHANIC', 'ADMIN', 'MANAGER'].includes(role)) {
    const mechanicWhere = role === 'MECHANIC'
      ? { mechanicId: user.id }
      : {}
    ;[unassigned, urgentCount, returnedFromQC, myQueue] = await Promise.all([
      prisma.repairOrder.count({ where: { status: st('WAITING_FOR_MECHANIC'), mechanicId: null } }),
      prisma.repairOrder.count({ where: { status: { in: [st('WAITING_FOR_MECHANIC'), st('IN_REPAIR')] }, priority: { in: ['HIGH', 'URGENT'] } } }),
      prisma.repairOrder.count({ where: { status: st('QC_FAILED') } }),
      prisma.repairOrder.findMany({
        where:   { status: { in: [st('WAITING_FOR_MECHANIC'), st('IN_REPAIR'), st('QC_FAILED')] }, ...mechanicWhere },
        take:    10,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'asc' }],
        include: {
          scooter:  { select: { serialNumber: true, brand: true, model: true } },
          customer: { select: { name: true } },
          mechanic: { select: { name: true } },
        },
      }),
    ])
  }

  // Warehouse / QC role
  let qcPending = 0, qcFailed = 0, readyToShip = 0, warehouseQueue: typeof csQueue = []
  if (['WAREHOUSE', 'ADMIN', 'MANAGER'].includes(role)) {
    ;[qcPending, qcFailed, readyToShip, warehouseQueue] = await Promise.all([
      prisma.repairOrder.count({ where: { status: st('QUALITY_CONTROL') } }),
      prisma.repairOrder.count({ where: { status: st('QC_FAILED') } }),
      prisma.repairOrder.count({ where: { status: 'READY_TO_SHIP' } }),
      prisma.repairOrder.findMany({
        where:   { status: { in: [st('QUALITY_CONTROL'), st('QC_FAILED'), 'READY_TO_SHIP'] } },
        take:    10,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'asc' }],
        include: {
          scooter:  { select: { serialNumber: true, brand: true, model: true } },
          customer: { select: { name: true } },
        },
      }),
    ])
  }

  type QItem = { id: string; orderNumber: string; status: string; priority: string; scooter: { serialNumber: string; brand: string; model: string }; customer: { name: string } | null; mechanic?: { name: string } | null }

  // Admin / Manager overview
  let activeRepairs = 0, lowStock = 0
  if (['ADMIN', 'MANAGER'].includes(role)) {
    ;[activeRepairs, lowStock] = await Promise.all([
      prisma.repairOrder.count({ where: { status: { notIn: ['DISPATCHED', 'CANCELLED', 'BGRADE_RECORDED'] } } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "Part" WHERE "isActive" = true AND "stockQty" <= "reorderLevel"
      `.then(r => Number(r[0].count)),
    ])
  }

  // Inbound (no specific role in schema, covered by CS + admin)
  let bgradeTodayCount = 0
  ;[bgradeTodayCount] = await Promise.all([
    prisma.repairOrder.count({ where: { caseType: 'BGRADE', createdAt: { gte: todayStart } } }),
  ])

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fade-up">
      <PageHeader
        title="Dashboard"
        sub={dateLabel}
        action={
          <Link href="/cases/new">
            <Btn variant="primary" size="sm">+ New case</Btn>
          </Link>
        }
      />

      {/* ── Shared top stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Received today"   value={receivedToday}  accent />
        <StatCard label="Dispatched today" value={dispatchedToday} />
        {bgradeTodayCount > 0 && (
          <StatCard label="B-Grade today" value={bgradeTodayCount} />
        )}
        {['ADMIN', 'MANAGER'].includes(role) && (
          <>
            <StatCard label="Active cases"    value={activeRepairs} />
            <StatCard label="Awaiting CS"     value={awaitingCS}    warn={awaitingCS > 0}   sub="need review" />
            <StatCard label="Ready to ship"   value={readyToShip}   warn={readyToShip > 0}  sub="needs dispatch" />
            <StatCard label="Low stock parts" value={lowStock}       warn={lowStock > 0}     sub="at or below reorder" />
          </>
        )}
        {role === 'CS' && (
          <>
            <StatCard label="Awaiting review" value={awaitingCS}   warn={awaitingCS > 0}  accent />
            <StatCard label="Disputed"        value={disputed}     warn={disputed > 0}    sub="needs decision" />
            <StatCard label="Approved today"  value={approvedToday} />
          </>
        )}
        {role === 'MECHANIC' && (
          <>
            <StatCard label="My queue"         value={myQueue.length} accent />
            <StatCard label="Unassigned"       value={unassigned}     warn={unassigned > 0}   sub="available to pick up" />
            <StatCard label="Urgent"           value={urgentCount}    warn={urgentCount > 0}  sub="high + urgent priority" />
            <StatCard label="Returned from QC" value={returnedFromQC} warn={returnedFromQC > 0} sub="QC failed" />
          </>
        )}
        {role === 'WAREHOUSE' && (
          <>
            <StatCard label="QC queue"      value={qcPending}   accent />
            <StatCard label="QC failed"     value={qcFailed}    warn={qcFailed > 0}   sub="back to mechanic" />
            <StatCard label="Ready to ship" value={readyToShip} warn={readyToShip > 0} sub="label needed" />
          </>
        )}
      </div>

      {/* ── Role-specific queue tables ── */}

      {/* CS queue */}
      {['CS', 'ADMIN', 'MANAGER'].includes(role) && csQueue.length > 0 && (
        <QueueTable
          title="CS review queue"
          href="/cases?status=AWAITING_CS"
          rows={(csQueue as unknown as QItem[]).map(r => ({
            id:       r.id,
            order:    r.orderNumber,
            serial:   r.scooter.serialNumber,
            info:     `${r.scooter.brand} ${r.scooter.model}`,
            customer: r.customer?.name ?? '—',
            status:   r.status,
            priority: r.priority,
            extra:    null,
          }))}
        />
      )}

      {/* Mechanic queue */}
      {['MECHANIC', 'ADMIN', 'MANAGER'].includes(role) && myQueue.length > 0 && (
        <QueueTable
          title={role === 'MECHANIC' ? 'My repair queue' : 'Mechanic queue'}
          href="/cases?status=IN_REPAIR"
          rows={(myQueue as unknown as QItem[]).map(r => ({
            id:       r.id,
            order:    r.orderNumber,
            serial:   r.scooter.serialNumber,
            info:     `${r.scooter.brand} ${r.scooter.model}`,
            customer: r.customer?.name ?? '—',
            status:   r.status,
            priority: r.priority,
            extra:    (r as typeof r & { mechanic?: { name: string } | null }).mechanic?.name ?? null,
          }))}
        />
      )}

      {/* Warehouse / QC queue */}
      {['WAREHOUSE', 'ADMIN', 'MANAGER'].includes(role) && warehouseQueue.length > 0 && (
        <QueueTable
          title="QC & dispatch queue"
          href="/cases?status=QUALITY_CONTROL"
          rows={(warehouseQueue as unknown as QItem[]).map(r => ({
            id:       r.id,
            order:    r.orderNumber,
            serial:   r.scooter.serialNumber,
            info:     `${r.scooter.brand} ${r.scooter.model}`,
            customer: r.customer?.name ?? '—',
            status:   r.status,
            priority: r.priority,
            extra:    null,
          }))}
        />
      )}
    </div>
  )
}

type QueueRow = {
  id:       string
  order:    string
  serial:   string
  info:     string
  customer: string
  status:   string
  priority: string
  extra:    string | null
}

function QueueTable({ title, href, rows }: { title: string; href: string; rows: QueueRow[] }) {
  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0, marginBottom: 20 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{title}</div>
        <Link href={href} style={{ fontSize: 12, color: 'var(--accent)' }}>View all →</Link>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Serial</th>
            <th>Scooter</th>
            <th>Customer</th>
            <th>Priority</th>
            <th>Status</th>
            {rows.some(r => r.extra) && <th>Mechanic</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <LinkRow key={r.id} href={`/cases/${r.id}`}>
              <td><span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{r.order}</span></td>
              <td><span className="mono" style={{ fontSize: 12 }}>{r.serial}</span></td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.info}</td>
              <td style={{ fontSize: 12 }}>{r.customer}</td>
              <td>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                  background: r.priority === 'URGENT' ? 'var(--red-bg)'   :
                              r.priority === 'HIGH'   ? 'var(--amber-bg)' : 'transparent',
                  color:      r.priority === 'URGENT' ? 'var(--red)'   :
                              r.priority === 'HIGH'   ? 'var(--amber)' : 'var(--text-faint)',
                }}>
                  {r.priority}
                </span>
              </td>
              <td><StatusBadge status={r.status} /></td>
              {rows.some(row => row.extra) && (
                <td style={{ fontSize: 12, color: r.extra ? 'var(--text)' : 'var(--text-faint)' }}>
                  {r.extra ?? '— unassigned'}
                </td>
              )}
            </LinkRow>
          ))}
        </tbody>
      </table>
    </div>
  )
}
