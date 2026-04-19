'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/ui/Btn'

type Template = { id: string; stepNumber: number; stepName: string; description: string | null }
type StepResult = { templateId: string; result: 'PASS' | 'FAIL' | 'NA'; notes: string }

export default function QCChecklistForm({
  caseId,
  templates,
}: {
  caseId:    string
  templates: Template[]
}) {
  const router  = useRouter()
  const [steps, setSteps] = useState<StepResult[]>(
    templates.map(t => ({ templateId: t.id, result: 'NA', notes: '' }))
  )
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const allAnswered = steps.every(s => s.result !== 'NA' || true) // NA is valid
  const hasPass     = steps.every(s => s.result === 'PASS' || s.result === 'NA')

  function setResult(idx: number, result: 'PASS' | 'FAIL' | 'NA') {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, result } : s))
  }
  function setNotes(idx: number, notes: string) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, notes } : s))
  }

  async function submit() {
    setBusy(true); setError('')
    const res = await fetch(`/api/cases/${caseId}/qc-submit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ results: steps }),
    })
    setBusy(false)
    if (res.ok) router.push(`/cases/${caseId}`)
    else { const b = await res.json(); setError(b.error ?? 'Failed to submit QC') }
  }

  const btnStyle = (active: boolean, colour: string): React.CSSProperties => ({
    padding:      '6px 14px',
    fontSize:     12,
    fontWeight:   active ? 600 : 400,
    border:       `1px solid ${active ? colour : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    background:   active ? colour + '22' : 'transparent',
    color:        active ? colour : 'var(--text-muted)',
    cursor:       'pointer',
    transition:   'all 0.1s',
    fontFamily:   'var(--font-sans)',
  })

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {templates.map((t, idx) => {
          const step = steps[idx]
          return (
            <div key={t.id} style={{
              padding:      '14px 0',
              borderBottom: '1px solid var(--border-muted)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Step number */}
                <div style={{
                  width:        28, height: 28, borderRadius: '50%',
                  background:   step.result === 'PASS' ? 'var(--green-bg)' :
                                step.result === 'FAIL' ? 'var(--red-bg)'   : 'var(--bg-raised)',
                  border:       `2px solid ${
                                  step.result === 'PASS' ? 'var(--green)' :
                                  step.result === 'FAIL' ? 'var(--red)'   : 'var(--border)'
                                }`,
                  display:      'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize:     11, fontWeight: 700,
                  color:        step.result === 'PASS' ? 'var(--green)' :
                                step.result === 'FAIL' ? 'var(--red)'   : 'var(--text-faint)',
                  flexShrink:   0,
                }}>
                  {t.stepNumber}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                    {t.stepName}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      {t.description}
                    </div>
                  )}

                  {/* PASS / FAIL / NA buttons — large, easy to tap */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: step.result === 'FAIL' ? 8 : 0 }}>
                    <button style={btnStyle(step.result === 'PASS', 'var(--green)')}
                      onClick={() => setResult(idx, 'PASS')}>✓ Pass</button>
                    <button style={btnStyle(step.result === 'FAIL', 'var(--red)')}
                      onClick={() => setResult(idx, 'FAIL')}>✗ Fail</button>
                    <button style={btnStyle(step.result === 'NA',   'var(--text-faint)')}
                      onClick={() => setResult(idx, 'NA')}>N/A</button>
                  </div>

                  {/* Note input — shown when FAIL */}
                  {step.result === 'FAIL' && (
                    <input
                      value={step.notes}
                      onChange={e => setNotes(idx, e.target.value)}
                      placeholder="Describe the failure..."
                      style={{ marginTop: 0 }}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{
          marginTop: 16, padding: '10px 14px',
          background: 'var(--red-bg)', border: '1px solid var(--red)',
          borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {steps.filter(s => s.result === 'PASS').length} passed ·{' '}
          {steps.filter(s => s.result === 'FAIL').length} failed ·{' '}
          {steps.filter(s => s.result === 'NA').length} N/A
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Btn
            variant={hasPass ? 'success' : 'danger'}
            disabled={busy}
            onClick={submit}
          >
            {busy ? 'Submitting…' : hasPass ? '✓ Submit QC — All Pass' : '✗ Submit QC — Has Failures'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
