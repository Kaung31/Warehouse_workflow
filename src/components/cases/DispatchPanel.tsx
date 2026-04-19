'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/ui/Btn'

type Props = { caseId: string; repairId: string; status: string }

export default function DispatchPanel({ caseId, repairId, status }: Props) {
  const router  = useRouter()
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')
  const [tracking, setTracking] = useState<string | null>(null)

  async function generateLabel() {
    setBusy(true); setError('')
    const res = await fetch(`/api/repairs/${repairId}/ship`, { method: 'POST' })
    setBusy(false)
    if (res.ok) {
      const { data } = await res.json()
      if (data.trackingNumber) setTracking(data.trackingNumber)
      // Open label PDF
      if (data.labelPdf) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.labelPdf), c => c.charCodeAt(0))],
          { type: 'application/pdf' }
        )
        window.open(URL.createObjectURL(blob), '_blank')
      }
      router.refresh()
    } else {
      const b = await res.json()
      setError(b.error ?? 'Failed to generate DPD label')
    }
  }

  if (status === 'DISPATCHED') {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
        <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: 14 }}>Dispatched</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>Case closed</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        padding: '14px 16px', borderRadius: 'var(--radius)',
        background: 'var(--green-bg)', border: '1px solid var(--green)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>
          ✓ QC Passed
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Ready to generate shipping label and dispatch.
        </div>
      </div>

      {tracking && (
        <div style={{ padding: '10px 14px', background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 2 }}>Tracking number</div>
          <div className="mono" style={{ color: 'var(--accent)', fontSize: 13 }}>{tracking}</div>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--red)' }}>
          {error}
        </div>
      )}

      <Btn variant="primary" disabled={busy} onClick={generateLabel}>
        {busy ? 'Generating label…' : '⎙ Generate DPD label & dispatch'}
      </Btn>
    </div>
  )
}
