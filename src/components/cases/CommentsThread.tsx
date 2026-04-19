'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/ui/Btn'

type Comment = {
  id:              string
  content:         string
  isCustomerFacing: boolean
  createdAt:       string | Date
  author:          { name: string; role: string }
}

type Props = {
  caseId:    string
  comments:  Comment[]
  userRole:  string
  canComment: boolean
}

export default function CommentsThread({ caseId, comments, userRole, canComment }: Props) {
  const router = useRouter()
  const [text,    setText]    = useState('')
  const [facing,  setFacing]  = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')

  async function submit() {
    if (!text.trim()) return
    setBusy(true); setError('')
    const res = await fetch(`/api/cases/${caseId}/cs-update`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ comment: text.trim(), isCustomerFacing: facing }),
    })
    setBusy(false)
    if (res.ok) { setText(''); router.refresh() }
    else { const b = await res.json(); setError(b.error ?? 'Failed') }
  }

  const ROLE_COLOURS: Record<string, string> = {
    ADMIN:     'var(--red)',
    MANAGER:   'var(--amber)',
    CS:        'var(--purple)',
    MECHANIC:  'var(--accent)',
    WAREHOUSE: 'var(--green)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {comments.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '12px 0' }}>
          No comments yet
        </div>
      )}

      {comments.map((c) => {
        const roleColor = ROLE_COLOURS[c.author.role] ?? 'var(--text-faint)'
        return (
          <div key={c.id} style={{
            padding:      '12px 0',
            borderBottom: '1px solid var(--border-muted)',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{
                width:        28, height: 28, borderRadius: '50%',
                background:   'var(--bg-raised)',
                border:       `2px solid ${roleColor}`,
                display:      'flex', alignItems: 'center', justifyContent: 'center',
                fontSize:     10, fontWeight: 700, color: roleColor, flexShrink: 0,
              }}>
                {c.author.name.charAt(0)}
              </div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                  {c.author.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 6 }}>
                  {c.author.role}
                </span>
                {c.isCustomerFacing && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, padding: '1px 6px',
                    background: 'var(--blue-bg)', color: 'var(--accent)',
                    border: '1px solid var(--border-focus)', borderRadius: 10,
                  }}>
                    customer-facing
                  </span>
                )}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)' }}>
                {new Date(c.createdAt).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, paddingLeft: 36, whiteSpace: 'pre-wrap' }}>
              {c.content}
            </div>
          </div>
        )
      })}

      {canComment && (
        <div style={{ paddingTop: 14 }}>
          <textarea
            rows={3}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            style={{ resize: 'vertical', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={facing}
                onChange={e => setFacing(e.target.checked)}
                style={{ width: 'auto', marginBottom: 0 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Customer-facing</span>
            </label>
            <div style={{ marginLeft: 'auto' }}>
              <Btn variant="primary" size="sm" disabled={busy || !text.trim()} onClick={submit}>
                {busy ? 'Posting…' : 'Post comment'}
              </Btn>
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</div>}
        </div>
      )}
    </div>
  )
}
