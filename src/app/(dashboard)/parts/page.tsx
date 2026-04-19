import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SearchBar from '@/components/ui/SearchBar'

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; lowStock?: string; page?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const sp       = await searchParams
  const search   = sp.search   ?? ''
  const lowStock = sp.lowStock === 'true'
  const page     = Math.max(1, parseInt(sp.page ?? '1'))
  const perPage  = 30

  const where: Record<string, unknown> = { isActive: true }
  if (search) {
    where.OR = [
      { name:    { contains: search, mode: 'insensitive' } },
      { sku:     { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [parts, total, lowStockCount] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { name: 'asc' },
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    prisma.part.count({ where }),
    prisma.part.count({
      where: { isActive: true, stockQty: { lte: prisma.part.fields.reorderLevel } },
    }),
  ])

  return (
    <div className="fade-up">
      <PageHeader title="Parts & stock" sub={`${total} parts · ${lowStockCount} low stock`} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <SearchBar placeholder="Search name, SKU, barcode..." />
        <a href={`/parts${lowStock ? '' : '?lowStock=true'}`}>
          <button style={{
            padding: '8px 14px', fontSize: 12,
            background: lowStock ? 'var(--amber)' : 'transparent',
            color:      lowStock ? '#0f0f0f'      : 'var(--amber)',
            border:     '1px solid var(--amber)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            ⚠ Low stock {lowStockCount > 0 && `(${lowStockCount})`}
          </button>
        </a>
      </div>

      <div style={{
        background: 'var(--bg-surface)',
        border:     '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Location</th>
              <th style={{ textAlign: 'right' }}>Stock</th>
              <th style={{ textAlign: 'right' }}>Reorder at</th>
              <th>Supplier</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => {
              const isLow = p.stockQty <= p.reorderLevel
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td><span className="mono">{p.sku}</span></td>
                  <td><span className="mono" style={{ color: 'var(--text-muted)' }}>{p.barcode ?? '—'}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.warehouseLocation ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="mono" style={{ color: isLow ? 'var(--amber)' : 'var(--text)', fontWeight: isLow ? 500 : 400 }}>
                      {p.stockQty}
                    </span>
                    {isLow && <span style={{ fontSize: 10, color: 'var(--amber)', marginLeft: 6 }}>LOW</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="mono" style={{ color: 'var(--text-faint)' }}>{p.reorderLevel}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.supplierName ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}