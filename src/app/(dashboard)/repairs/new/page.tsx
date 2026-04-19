'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/ui/Btn'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'

type Customer = { id: string; name: string; postcode: string }
type Scooter  = { id: string; serialNumber: string; model: string; brand: string }
type Mechanic = { id: string; name: string }

export default function NewRepairPage() {
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [scooters,  setScooters]  = useState<Scooter[]>([])
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    customerId:       '',
    scooterId:        '',
    mechanicId:       '',
    faultDescription: '',
    priority:         'NORMAL',
    estimatedCost:    '',
    internalNotes:    '',
  })

  useEffect(() => {
    fetch('/api/customers?pageSize=100').then(r => r.json()).then(d => setCustomers(d.data?.customers ?? []))
    fetch('/api/scooters?pageSize=100').then(r => r.json()).then(d => setScooters(d.data?.scooters ?? []))
    fetch('/api/users?role=MECHANIC').then(r => r.json()).then(d => setMechanics(d.data ?? []))
  }, [])

  // When customer is selected, filter their scooters
  const customerScooters = form.customerId
    ? scooters.filter(s => {
        // show all scooters for now — in production filter by customerId
        return true
      })
    : scooters

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId || !form.scooterId || !form.faultDescription) {
      setError('Customer, scooter, and fault description are required')
      return
    }
    setBusy(true); setError('')

    const res = await fetch('/api/repairs', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId:       form.customerId,
        scooterId:        form.scooterId,
        mechanicId:       form.mechanicId || undefined,
        faultDescription: form.faultDescription,
        priority:         form.priority,
        estimatedCost:    form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
        internalNotes:    form.internalNotes || undefined,
      }),
    })

    setBusy(false)
    if (res.ok) {
      const { data } = await res.json()
      router.push(`/repairs/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Failed to create repair order')
    }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <label>{label}</label>
      {children}
    </div>
  )

  return (
    <div className="fade-up" style={{ maxWidth: 720 }}>
      <PageHeader
        title="New repair order"
        sub="Fill in the details below to create a new repair"
        action={
          <Link href="/repairs">
            <Btn variant="ghost" size="sm">← Back</Btn>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px 24px 8px' }}>

          {/* Section: Customer & Scooter */}
          <SectionTitle>Customer & scooter</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <Field label="Customer *">
              <select value={form.customerId} onChange={e => set('customerId', e.target.value)} required>
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.postcode}</option>
                ))}
              </select>
            </Field>
            <Field label="Scooter *">
              <select value={form.scooterId} onChange={e => set('scooterId', e.target.value)} required>
                <option value="">Select scooter...</option>
                {scooters.map(s => (
                  <option key={s.id} value={s.id}>{s.serialNumber} — {s.brand} {s.model}</option>
                ))}
              </select>
            </Field>
          </div>

          <Divider />

          {/* Section: Repair details */}
          <SectionTitle>Repair details</SectionTitle>

          <Field label="Fault description *">
            <textarea
              rows={3}
              value={form.faultDescription}
              onChange={e => set('faultDescription', e.target.value)}
              placeholder="Describe the fault or issue reported by the customer..."
              required
              style={{ resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 18 }}>
            <Field label="Assign mechanic">
              <select value={form.mechanicId} onChange={e => set('mechanicId', e.target.value)}>
                <option value="">— Unassigned</option>
                {mechanics.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </Field>
            <Field label="Estimated cost (£)">
              <input
                type="number" min="0" step="0.01"
                value={form.estimatedCost}
                onChange={e => set('estimatedCost', e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field label="Internal notes">
            <textarea
              rows={2}
              value={form.internalNotes}
              onChange={e => set('internalNotes', e.target.value)}
              placeholder="Notes visible only to staff..."
              style={{ resize: 'vertical' }}
            />
          </Field>

          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid var(--red)',
              borderRadius: 'var(--radius)', padding: '10px 14px',
              color: 'var(--red)', fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            paddingBottom: 24, marginTop: 8,
          }}>
            <Link href="/repairs"><Btn variant="secondary">Cancel</Btn></Link>
            <Btn variant="primary" disabled={busy} type="submit">
              {busy ? 'Creating...' : '+ Create repair order'}
            </Btn>
          </div>
        </div>
      </form>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-muted)', margin: '4px 0 20px' }} />
}