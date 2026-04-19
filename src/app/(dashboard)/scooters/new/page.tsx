'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Btn from '@/components/ui/Btn'

type Customer = { id: string; name: string; postcode: string }

export default function NewScooterPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    serialNumber: '',
    brand:        '',
    model:        '',
    colour:       '',
    customerId:   searchParams.get('customerId') ?? '',
    purchaseCost: '',
    notes:        '',
  })

  useEffect(() => {
    fetch('/api/customers?pageSize=200')
      .then(r => r.json())
      .then(d => setCustomers(d.data?.customers ?? []))
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.serialNumber || !form.brand || !form.model) {
      setError('Serial number, brand, and model are required')
      return
    }
    setBusy(true); setError('')

    const res = await fetch('/api/scooters', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serialNumber: form.serialNumber.toUpperCase().trim(),
        brand:        form.brand.trim(),
        model:        form.model.trim(),
        colour:       form.colour.trim() || undefined,
        customerId:   form.customerId || undefined,
        purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : undefined,
        notes:        form.notes.trim() || undefined,
      }),
    })

    setBusy(false)
    if (res.ok) {
      const { data } = await res.json()
      router.push(`/scooters/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Failed to create scooter')
    }
  }

  return (
    <div className="fade-up" style={{ maxWidth: 680 }}>
      <PageHeader
        title="Add scooter"
        sub="Register a new scooter in the system"
        action={
          <Link href="/scooters">
            <Btn variant="ghost" size="sm">← Back</Btn>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px 24px 8px' }}>

          <SectionTitle>Identity</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <Field label="Serial number *">
              <input
                value={form.serialNumber}
                onChange={e => set('serialNumber', e.target.value)}
                placeholder="e.g. SC-10234"
                required
                style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
              />
            </Field>
            <Field label="Colour">
              <input
                value={form.colour}
                onChange={e => set('colour', e.target.value)}
                placeholder="e.g. Midnight Black"
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <Field label="Brand *">
              <input
                list="brands"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                placeholder="e.g. Pure, Xiaomi, Segway"
                required
              />
              <datalist id="brands">
                {['Pure', 'Xiaomi', 'Segway', 'Apollo', 'Kaabo', 'Vsett', 'Dualtron'].map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Field>
            <Field label="Model *">
              <input
                list="models"
                value={form.model}
                onChange={e => set('model', e.target.value)}
                placeholder="e.g. Pure Air, M365, Ninebot Max"
                required
              />
              <datalist id="models">
                {['Pure Air', 'Pure Air Pro', 'Xiaomi M365', 'Ninebot Max', 'Apollo City', 'Kaabo Wolf King'].map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
          </div>

          <Divider />
          <SectionTitle>Ownership & cost</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <Field label="Customer (optional)">
              <select value={form.customerId} onChange={e => set('customerId', e.target.value)}>
                <option value="">— No customer yet</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.postcode}</option>
                ))}
              </select>
            </Field>
            <Field label="Purchase cost (£)">
              <input
                type="number" min="0" step="0.01"
                value={form.purchaseCost}
                onChange={e => set('purchaseCost', e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any notes about this scooter..."
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

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 24, marginTop: 8 }}>
            <Link href="/scooters"><Btn variant="secondary">Cancel</Btn></Link>
            <Btn variant="primary" disabled={busy} type="submit">
              {busy ? 'Creating...' : '+ Add scooter'}
            </Btn>
          </div>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label>{label}</label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-muted)', margin: '4px 0 20px' }} />
}
