'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/ui/Btn'

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: Date
  _count: { repairOrders: number }
}

const ROLES = ['ADMIN', 'MANAGER', 'MECHANIC', 'WAREHOUSE', 'CS'] as const
type Role = typeof ROLES[number]

const ROLE_COLOURS: Record<Role, string> = {
  ADMIN:     'var(--red)',
  MANAGER:   'var(--amber)',
  MECHANIC:  'var(--accent)',
  WAREHOUSE: 'var(--green)',
  CS:        'var(--text-muted)',
}

export default function UsersClient({
  users: initial,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router  = useRouter()
  const [users, setUsers] = useState(initial)
  const [busy,  setBusy]  = useState<string | null>(null)
  const [error, setError] = useState('')

  async function patchUser(id: string, patch: { role?: Role; isActive?: boolean }) {
    setBusy(id); setError('')
    const res = await fetch(`/api/users/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    })
    setBusy(null)
    if (res.ok) {
      const { data } = await res.json()
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u))
      router.refresh()
    } else {
      const body = await res.json()
      setError(body.error ?? 'Failed to update user')
    }
  }

  return (
    <>
      {error && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid var(--red)',
          borderRadius: 'var(--radius)', padding: '10px 14px',
          color: 'var(--red)', fontSize: 13, marginBottom: 14,
        }}>
          {error}
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Repairs</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf    = u.id === currentUserId
              const isLoading = busy === u.id
              return (
                <tr key={u.id} style={{ opacity: isLoading ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 500 }}>
                    {u.name}
                    {isSelf && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, fontWeight: 600,
                        background: 'var(--bg-raised)', padding: '1px 6px',
                        borderRadius: 10, color: 'var(--text-faint)',
                      }}>
                        you
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.email}</td>
                  <td>
                    {isSelf ? (
                      <RolePill role={u.role as Role} />
                    ) : (
                      <select
                        value={u.role}
                        disabled={isLoading}
                        onChange={e => patchUser(u.id, { role: e.target.value as Role })}
                        style={{ fontSize: 12, padding: '3px 8px', minWidth: 110 }}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="mono" style={{
                      background: 'var(--bg-raised)', padding: '2px 8px',
                      borderRadius: 4, fontSize: 12,
                      color: u._count.repairOrders > 0 ? 'var(--text)' : 'var(--text-faint)',
                    }}>
                      {u._count.repairOrders}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                      background: u.isActive ? 'var(--green-bg)' : 'var(--bg-raised)',
                      color:      u.isActive ? 'var(--green)'    : 'var(--text-faint)',
                      border:     u.isActive ? '1px solid var(--green)' : '1px solid var(--border)',
                    }}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-faint)', fontSize: 11 }}>
                    {new Date(u.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td>
                    {!isSelf && (
                      <Btn
                        variant={u.isActive ? 'danger' : 'success'}
                        size="sm"
                        disabled={isLoading}
                        onClick={() => patchUser(u.id, { isActive: !u.isActive })}
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </Btn>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function RolePill({ role }: { role: Role }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: ROLE_COLOURS[role],
      background: 'var(--bg-raised)',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-mono)',
    }}>
      {role}
    </span>
  )
}
