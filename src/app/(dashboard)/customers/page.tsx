import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SearchBar from '@/components/ui/SearchBar'
import Btn from '@/components/ui/Btn'
import LinkRow from '@/components/ui/LinkRow'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const sp      = await searchParams
  const search  = sp.search ?? ''
  const page    = Math.max(1, parseInt(sp.page ?? '1'))
  const perPage = 25

  const where: Record<string, unknown> = { isDeleted: false }
  if (search) {
    where.OR = [
      { name:     { contains: search, mode: 'insensitive' } },
      { email:    { contains: search, mode: 'insensitive' } },
      { postcode: { contains: search, mode: 'insensitive' } },
      { phone:    { contains: search } },
    ]
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * perPage,
      take:    perPage,
      include: { _count: { select: { repairOrders: true } } },
    }),
    prisma.customer.count({ where }),
  ])

  return (
    <div className="fade-up">
      <PageHeader
        title="Customers"
        sub={`${total} total`}
        action={
          <Link href="/customers/new">
            <Btn variant="primary">+ Add customer</Btn>
          </Link>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="Search name, email, postcode..." />
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
              <th>Email</th>
              <th>Phone</th>
              <th>Postcode</th>
              <th>City</th>
              <th style={{ textAlign: 'right' }}>Repairs</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>
                  No customers found
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <LinkRow key={c.id} href={`/customers/${c.id}`}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.email ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.phone ?? '—'}</td>
                <td><span className="mono">{c.postcode}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.city}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className="mono">{c._count.repairOrders}</span>
                </td>
                <td style={{ color: 'var(--text-faint)', fontSize: 11 }}>
                  {new Date(c.createdAt).toLocaleDateString('en-GB')}
                </td>
              </LinkRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}