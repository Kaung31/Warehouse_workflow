'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Btn from '@/components/ui/Btn'

export default function NewCustomerPage() {
  const router = useRouter()
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name:         '',
    email:        '',
    phone:        '',
    addressLine1: '',
    addressLine2: '',
    city:         '',
    postcode:     '',
    notes:        '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')

    const res = await fetch('/api/customers', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:         form.name.trim(),
        email:        form.email.trim() || undefined,
        phone:        form.phone.trim() || undefined,
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        city:         form.city.trim(),
        postcode:     form.postcode.trim().toUpperCase(),
        notes:        form.notes.trim() || undefined,
      }),
    })

    setBusy(false)
    if (res.ok) {
      const { data } = await res.json()
      router.push(`/customers/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Failed to create customer')
    }
  }

  return (
    <div className="fade-up" style={{ maxWidth: 680 }}>
      <PageHeader
        title="New customer"
        sub="Add a customer to the system"
        action={
          <Link href="/customers">
            <Btn variant="ghost" size="sm">← Back</Btn>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px 24px 8px' }}>

          <SectionTitle>Contact details</SectionTitle>

          <Field label="Full name *">
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. John Smith"
              required
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="john@example.com"
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="07700 900000"
              />
            </Field>
          </div>

          <Divider />
          <SectionTitle>Address</SectionTitle>

          <Field label="Address line 1 *">
            <input
              value={form.addressLine1}
              onChange={e => set('addressLine1', e.target.value)}
              placeholder="e.g. 12 Baker Street"
              required
            />
          </Field>

          <Field label="Address line 2">
            <input
              value={form.addressLine2}
              onChange={e => set('addressLine2', e.target.value)}
              placeholder="Flat, apartment, etc."
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
            <Field label="City *">
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="London"
                required
              />
            </Field>
            <Field label="Postcode *">
              <input
                value={form.postcode}
                onChange={e => set('postcode', e.target.value.toUpperCase())}
                placeholder="SW1A 1AA"
                required
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </Field>
          </div>

          <Divider />

          <Field label="Notes">
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any notes about this customer..."
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
            <Link href="/customers"><Btn variant="secondary">Cancel</Btn></Link>
            <Btn variant="primary" disabled={busy} type="submit">
              {busy ? 'Creating...' : '+ Add customer'}
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
