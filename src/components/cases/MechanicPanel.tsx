'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/ui/Btn'

type Part = { id: string; name: string; sku: string; barcode: string | null; stockQty: number; unitCost: unknown }
type RepairPart = { quantity: number; part: Part }

type Props = {
  caseId:     string
  status:     string
  startedAt:  string | null
  repairParts: RepairPart[]
  userRole:   string
}

export default function MechanicPanel({ caseId, status, startedAt, repairParts, userRole }: Props) {
  const router = useRouter()
  const [diagnosis,   setDiagnosis]   = useState('')
  const [resolution,  setResolution]  = useState('')
  const [repairNotes, setRepairNotes] = useState('')
  const [barcode,     setBarcode]     = useState('')
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState('')

  const isInRepair = status === 'IN_REPAIR'
  const canAct     = ['ADMIN', 'MANAGER', 'MECHANIC'].includes(userRole)

  async function startRepair() {
    setBusy(true); setError('')
    const res = await fetch(`/api/cases/${caseId}/start-repair`, { method: 'POST' })
    setBusy(false)
    if (res.ok) router.refresh()
    else { const b = await res.json(); setError(b.error ?? 'Failed to start repair') }
  }

  async function completeRepair() {
    if (!diagnosis.trim()) { setError('Diagnosis is required before completing'); return }
    setBusy(true); setError('')
    const res = await fetch(`/api/cases/${caseId}/complete-repair`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosis: diagnosis.trim(), resolution: resolution.trim() || undefined, repairNotes: repairNotes.trim() || undefined }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
    else { const b = await res.json(); setError(b.error ?? 'Failed to complete repair') }
  }

  async function addPart() {
    if (!barcode.trim()) return
    setBusy(true); setError('')
    // look up part by barcode or SKU
    const res = await fetch(`/api/repairs/${caseId}/parts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: barcode.trim(), quantity: 1 }),
    })
    setBusy(false)
    if (res.ok) { setBarcode(''); router.refresh() }
    else { const b = await res.json(); setError(b.error ?? 'Part not found') }
  }

  // Live timer display
  const elapsed = startedAt
    ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Timer */}
      {isInRepair && elapsed !== null && (
        <div style={{ padding: '12px 16px', background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--border-focus)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>Repair timer</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {Math.floor(elapsed / 60)}h {elapsed % 60}m
          </div>
        </div>
      )}

      {/* Start repair button */}
      {!isInRepair && canAct && (
        <Btn variant="primary" disabled={busy} onClick={startRepair}>
          {busy ? 'Starting…' : '▶ Start Repair'}
        </Btn>
      )}

      {/* Parts used */}
      {isInRepair && (
        <>
          <SectionTitle>Parts used</SectionTitle>
          {repairParts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
              {repairParts.map((rp, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text)' }}>{rp.part.name}</span>
                  <span className="mono" style={{ color: 'var(--text-muted)' }}>×{rp.quantity}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPart()}
              placeholder="Scan barcode or enter SKU…"
              style={{ flex: 1 }}
              autoComplete="off"
            />
            <Btn variant="secondary" size="sm" disabled={busy || !barcode.trim()} onClick={addPart}>
              Add
            </Btn>
          </div>

          <Divider />
          <SectionTitle>Repair notes</SectionTitle>

          <div>
            <label>Diagnosis <Required /></label>
            <textarea rows={3} value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
              placeholder="What was the root cause?" style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label>Resolution</label>
            <textarea rows={2} value={resolution} onChange={e => setResolution(e.target.value)}
              placeholder="What was done to fix it?" style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label>Additional repair notes</label>
            <textarea rows={2} value={repairNotes} onChange={e => setRepairNotes(e.target.value)}
              placeholder="Any other notes…" style={{ resize: 'vertical' }} />
          </div>
        </>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}

      {/* Complete repair */}
      {isInRepair && canAct && (
        <Btn variant="success" disabled={busy} onClick={completeRepair}>
          {busy ? 'Saving…' : '✓ Complete Repair — send to QC'}
        </Btn>
      )}
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
function Required() {
  return <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>
}
