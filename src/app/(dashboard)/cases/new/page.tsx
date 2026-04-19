'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Btn from '@/components/ui/Btn'

const ERROR_CODES = [
  { value: 'E01', label: 'E01 — No power' },
  { value: 'E02', label: 'E02 — Battery fault' },
  { value: 'E03', label: 'E03 — Motor fault' },
  { value: 'E04', label: 'E04 — Controller fault' },
  { value: 'E05', label: 'E05 — Throttle fault' },
  { value: 'E06', label: 'E06 — Brake fault' },
  { value: 'E07', label: 'E07 — Display fault' },
  { value: 'E08', label: 'E08 — Charger fault' },
  { value: 'E09', label: 'E09 — Wheel fault' },
  { value: 'E10', label: 'E10 — Light fault' },
  { value: 'PHYSICAL_CRACK',    label: 'Physical — Crack/Frame damage' },
  { value: 'PHYSICAL_BATTERY',  label: 'Physical — Battery swelling/damage' },
  { value: 'PHYSICAL_WHEEL',    label: 'Physical — Wheel/Tyre damage' },
  { value: 'PHYSICAL_BRAKE',    label: 'Physical — Brake damage' },
  { value: 'PHYSICAL_DISPLAY',  label: 'Physical — Display/Screen damage' },
  { value: 'OTHER',             label: 'Other — see description' },
]

type ScooterHistory = {
  id: string; orderNumber: string; status: string; faultDescription: string; createdAt: string
}

export default function NewCasePage() {
  const router     = useRouter()
  const serialRef  = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    serialNumber:     '',
    brand:            '',
    model:            '',
    caseType:         '' as 'WARRANTY' | 'BGRADE' | '',
    customerName:     '',
    customerPostcode: '',
    customerPhone:    '',
    invoiceNumber:    '',
    faultDescription: '',
    internalNotes:    '',
    priority:         'NORMAL',
  })
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])
  const [history,  setHistory]  = useState<ScooterHistory[]>([])
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  // Auto-focus serial number on mount
  useEffect(() => { serialRef.current?.focus() }, [])

  // Debounced serial number lookup
  useEffect(() => {
    if (form.serialNumber.length < 4) { setHistory([]); return }
    const t = setTimeout(async () => {
      setLookingUp(true)
      const res = await fetch(`/api/scooters?search=${encodeURIComponent(form.serialNumber)}&pageSize=1`)
      const d   = await res.json()
      const found = d.data?.scooters?.[0]
      if (found && found.serialNumber.toLowerCase() === form.serialNumber.toLowerCase()) {
        // Load repair history for this scooter
        const r2 = await fetch(`/api/repairs?scooterId=${found.id}&pageSize=5`)
        const d2 = await r2.json()
        setHistory(d2.data?.repairs ?? [])
        if (found.brand) setForm(f => ({ ...f, brand: found.brand, model: found.model }))
      } else {
        setHistory([])
      }
      setLookingUp(false)
    }, 400)
    return () => clearTimeout(t)
  }, [form.serialNumber])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleCode(code: string) {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.caseType) { setError('Select WARRANTY or B-GRADE'); return }
    if (selectedCodes.length === 0) { setError('Select at least one error code'); return }
    setBusy(true); setError('')

    const res = await fetch('/api/cases/intake', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serialNumber:     form.serialNumber.trim().toUpperCase(),
        brand:            form.brand.trim(),
        model:            form.model.trim(),
        caseType:         form.caseType,
        customerName:     form.customerName.trim() || undefined,
        customerPostcode: form.customerPostcode.trim() || undefined,
        customerPhone:    form.customerPhone.trim() || undefined,
        invoiceNumber:    form.invoiceNumber.trim() || undefined,
        errorCodes:       selectedCodes,
        faultDescription: form.faultDescription.trim(),
        internalNotes:    form.internalNotes.trim() || undefined,
        priority:         form.priority,
      }),
    })

    setBusy(false)
    if (res.ok) {
      const { data } = await res.json()
      router.push(`/cases/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Failed to create case')
    }
  }

  const isWarranty  = form.caseType === 'WARRANTY'
  const isBgrade    = form.caseType === 'BGRADE'

  return (
    <div className="fade-up">
      <PageHeader
        title="New case intake"
        sub="Scan or enter serial number to begin"
        action={<Link href="/cases"><Btn variant="ghost" size="sm">← Back</Btn></Link>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'flex-start' }}>
        {/* ─── Main form ─── */}
        <form onSubmit={submit}>
          <div className="card" style={{ padding: '24px 24px 8px' }}>

            {/* Serial number — big, scanner-friendly */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'block' }}>
                Serial number <Required />
              </label>
              <input
                ref={serialRef}
                value={form.serialNumber}
                onChange={e => set('serialNumber', e.target.value)}
                placeholder="Scan barcode or type serial number…"
                required
                style={{
                  fontSize:   18,
                  padding:    '14px 16px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.05em',
                }}
                autoComplete="off"
                autoCapitalize="characters"
              />
              {lookingUp && (
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>Looking up…</div>
              )}
            </div>

            {/* Brand + Model */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <Field label="Brand *">
                <input list="brands" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Pure, Xiaomi…" required />
                <datalist id="brands">
                  {['Pure','Xiaomi','Segway','Apollo','Kaabo','Vsett','Dualtron'].map(b => <option key={b} value={b} />)}
                </datalist>
              </Field>
              <Field label="Model *">
                <input list="models" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Pure Air, M365…" required />
                <datalist id="models">
                  {['Pure Air','Pure Air Pro','Xiaomi M365','Ninebot Max','Apollo City'].map(m => <option key={m} value={m} />)}
                </datalist>
              </Field>
            </div>

            <Divider />

            {/* Case type */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, display: 'block' }}>
                Case type <Required />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'WARRANTY', label: '🔒 WARRANTY', desc: 'Customer submitted with invoice', colour: 'var(--accent)' },
                  { key: 'BGRADE',   label: '♻ B-GRADE',   desc: 'Pre-owned / refurb grading',    colour: 'var(--amber)' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => set('caseType', opt.key)}
                    style={{
                      padding:      '16px',
                      border:       `2px solid ${form.caseType === opt.key ? opt.colour : 'var(--border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      background:   form.caseType === opt.key ? opt.colour + '18' : 'var(--bg-raised)',
                      cursor:       'pointer',
                      textAlign:    'left',
                      transition:   'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, color: form.caseType === opt.key ? opt.colour : 'var(--text)', marginBottom: 4 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Customer details (required for WARRANTY) */}
            {(isWarranty || isBgrade) && (
              <>
                <Divider />
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, display: 'block' }}>
                    Customer {isWarranty ? <Required /> : <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <Field label={isWarranty ? 'Full name *' : 'Full name'}>
                      <input value={form.customerName} onChange={e => set('customerName', e.target.value)}
                        placeholder="John Smith" required={isWarranty} />
                    </Field>
                    <Field label={isWarranty ? 'Postcode *' : 'Postcode'}>
                      <input value={form.customerPostcode} onChange={e => set('customerPostcode', e.target.value.toUpperCase())}
                        placeholder="SW1A 1AA" required={isWarranty} style={{ fontFamily: 'var(--font-mono)' }} />
                    </Field>
                    <Field label="Phone">
                      <input value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} placeholder="07700 900000" />
                    </Field>
                  </div>
                </div>
              </>
            )}

            {/* Invoice number */}
            {isWarranty && (
              <div style={{ marginBottom: 20 }}>
                <Field label="Invoice / ticket number *">
                  <input value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)}
                    placeholder="INV-00123" required style={{ fontFamily: 'var(--font-mono)' }} />
                </Field>
              </div>
            )}

            <Divider />

            {/* Error codes — multi-select chips */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, display: 'block' }}>
                Error codes <Required />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ERROR_CODES.map(ec => {
                  const sel = selectedCodes.includes(ec.value)
                  return (
                    <button
                      key={ec.value}
                      type="button"
                      onClick={() => toggleCode(ec.value)}
                      style={{
                        padding:      '5px 12px',
                        fontSize:     12,
                        border:       `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 20,
                        background:   sel ? 'var(--accent-dim)' : 'transparent',
                        color:        sel ? '#fff' : 'var(--text-muted)',
                        cursor:       'pointer',
                        transition:   'all 0.1s',
                        fontFamily:   'var(--font-sans)',
                      }}
                    >
                      {ec.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fault description */}
            <Field label="Problem description *">
              <textarea rows={4} value={form.faultDescription} onChange={e => set('faultDescription', e.target.value)}
                placeholder="Describe the fault or issue reported by the customer in detail…"
                required style={{ resize: 'vertical' }} />
            </Field>

            {/* Priority + internal notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, marginBottom: 8 }}>
              <Field label="Priority">
                <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </Field>
              <Field label="Internal notes">
                <input value={form.internalNotes} onChange={e => set('internalNotes', e.target.value)}
                  placeholder="Visible to staff only…" />
              </Field>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 24 }}>
              <Link href="/cases"><Btn variant="secondary">Cancel</Btn></Link>
              <Btn variant="primary" type="submit" disabled={busy}>
                {busy ? 'Creating…' : '+ Create case'}
              </Btn>
            </div>
          </div>
        </form>

        {/* ─── History panel ─── */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              Scooter history
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                {form.serialNumber.length >= 4
                  ? 'No previous cases — new scooter'
                  : 'Enter serial number to check history'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.map(r => (
                  <Link key={r.id} href={`/cases/${r.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '10px 12px', background: 'var(--bg-raised)', borderRadius: 'var(--radius)', border: '1px solid var(--border-muted)', cursor: 'pointer' }}>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{r.orderNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.faultDescription.slice(0, 50)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString('en-GB')}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-muted)', margin: '4px 0 20px' }} />
}
function Required() {
  return <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>
}
