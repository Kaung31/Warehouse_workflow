'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/ui/Btn'
import StatusBadge from '@/components/ui/StatusBadge'

type Invoice = { invoiceNumber: string | null; paymentStatus: string }

type Props = {
  caseId:  string
  status:  string
  invoice: Invoice | null
}

const PAYMENT_OPTIONS = [
  { value: 'PAID',              label: 'Paid' },
  { value: 'UNPAID',            label: 'Unpaid' },
  { value: 'WARRANTY_APPROVED', label: 'Warranty Approved' },
  { value: 'DISPUTED',          label: 'Disputed' },
]

export default function CSActionPanel({ caseId, status, invoice }: Props) {
  const router = useRouter()
  const [comment,       setComment]       = useState('')
  const [facing,        setFacing]        = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(invoice?.paymentStatus ?? 'UNPAID')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  async function send(extra: object = {}) {
    setBusy(true); setError('')
    const body: Record<string, unknown> = { ...extra, paymentStatus }
    if (comment.trim()) { body.comment = comment.trim(); body.isCustomerFacing = facing }

    const res = await fetch(`/api/cases/${caseId}/cs-update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setBusy(false)
    if (res.ok) { setComment(''); router.refresh() }
    else { const b = await res.json(); setError(b.error ?? 'Failed') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionTitle>Invoice & Payment</SectionTitle>

      <div style={{ padding: '12px 14px', background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--border-muted)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>Invoice number</div>
        <div className="mono" style={{ fontSize: 13, color: invoice?.invoiceNumber ? 'var(--text)' : 'var(--text-faint)' }}>
          {invoice?.invoiceNumber ?? 'Not provided'}
        </div>
      </div>

      <div>
        <label>Payment status</label>
        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} disabled={busy}>
          {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <Divider />
      <SectionTitle>Add Comment</SectionTitle>

      <textarea
        rows={4}
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Add a note about this case…"
        style={{ resize: 'vertical' }}
      />

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 0, cursor: 'pointer' }}>
        <input type="checkbox" checked={facing} onChange={e => setFacing(e.target.checked)}
          style={{ width: 'auto' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Customer-facing</span>
      </label>

      {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}

      <Btn variant="secondary" size="sm" disabled={busy} onClick={() => send()}>
        Save note & payment status
      </Btn>

      {status === 'AWAITING_CS' || status === 'DISPUTED' ? (
        <>
          <Divider />
          <SectionTitle>Decision</SectionTitle>
          <Btn variant="success" disabled={busy} onClick={() => send({ approveForMechanic: true })}>
            ✓ Approve — send to mechanic
          </Btn>
          <Btn variant="danger" size="sm" disabled={busy} onClick={() => send({ markDisputed: true })}>
            Flag as disputed
          </Btn>
        </>
      ) : null}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {children}
    </div>
  )
}
function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-muted)' }} />
}
