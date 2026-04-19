'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/ui/Btn'

type Part = {
  id: string
  quantity: number
  part: { name: string; sku: string; stockQty: number }
}

type Props = {
  repairId: string
  parts:    Part[]
  canEdit:  boolean
}

export default function RepairPartsPanel({ repairId, parts, canEdit }: Props) {
  const router   = useRouter()
  const [scanning, setScanning] = useState(false)
  const [barcode,  setBarcode]  = useState('')
  const [qty,      setQty]      = useState(1)
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')

  async function addPart() {
    if (!barcode.trim()) return
    setBusy(true); setError('')

    // First look up the part by barcode
    const lookupRes = await fetch(`/api/parts?search=${encodeURIComponent(barcode)}&pageSize=1`)
    const { data }  = await lookupRes.json()
    const part      = data?.parts?.[0]

    if (!part) {
      setError(`No part found with barcode: ${barcode}`)
      setBusy(false)
      return
    }

    const res = await fetch(`/api/repairs/${repairId}/parts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ partId: part.id, quantity: qty }),
    })
    setBusy(false)

    if (res.ok) {
      setBarcode(''); setQty(1); setScanning(false)
      router.refresh()
    } else {
      const body = await res.json()
      setError(body.error ?? 'Failed to add part')
    }
  }

  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding:      '16px 18px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Parts used ({parts.length})
        </div>
        {canEdit && (
          <Btn size="sm" onClick={() => setScanning(!scanning)}>
            {scanning ? 'Cancel' : '⊕ Scan part'}
          </Btn>
        )}
      </div>

      {/* Scanner input */}
      {scanning && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            autoFocus
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPart()}
            placeholder="Scan barcode or type SKU..."
            style={{
              flex: 1, minWidth: 180,
              background: 'var(--bg-raised)', border: '1px solid var(--accent)',
              borderRadius: 'var(--radius)', padding: '7px 10px',
              color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
          <input
            type="number" min={1} max={99} value={qty}
            onChange={e => setQty(parseInt(e.target.value) || 1)}
            style={{
              width: 60,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '7px 10px',
              color: 'var(--text)', fontSize: 13, textAlign: 'center',
              fontFamily: 'var(--font-sans)', outline: 'none',
            }}
          />
          <Btn variant="primary" size="sm" onClick={addPart} disabled={busy}>
            {busy ? '...' : 'Add'}
          </Btn>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</div>
      )}

      {/* Parts list */}
      {parts.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '8px 0' }}>No parts added yet</div>
      ) : (
        <table className="data-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Part</th>
              <th>SKU</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id}>
                <td>{p.part.name}</td>
                <td><span className="mono">{p.part.sku}</span></td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}