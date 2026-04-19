type HistoryEntry = {
  id:         string
  fromStatus: string | null
  toStatus:   string
  reason:     string | null
  createdAt:  string | Date
  changedBy:  { name: string; role: string }
}

const STATUS_LABELS: Record<string, string> = {
  AWAITING_CS:          'Awaiting CS Review',
  WAITING_FOR_MECHANIC: 'Waiting for Mechanic',
  IN_REPAIR:            'In Repair',
  QUALITY_CONTROL:      'Quality Control',
  QC_FAILED:            'QC Failed',
  READY_TO_SHIP:        'Ready to Ship',
  DISPATCHED:           'Dispatched',
  BGRADE_RECORDED:      'B-Grade Recorded',
  DISPUTED:             'Disputed',
  CANCELLED:            'Cancelled',
}

const STATUS_COLOURS: Record<string, string> = {
  AWAITING_CS:          'var(--purple)',
  WAITING_FOR_MECHANIC: 'var(--accent)',
  IN_REPAIR:            'var(--accent)',
  QUALITY_CONTROL:      'var(--green)',
  QC_FAILED:            'var(--red)',
  READY_TO_SHIP:        'var(--green)',
  DISPATCHED:           'var(--green)',
  BGRADE_RECORDED:      'var(--amber)',
  DISPUTED:             'var(--red)',
  CANCELLED:            'var(--red)',
}

export default function StatusTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* vertical line */}
      <div style={{
        position:   'absolute',
        left:       11,
        top:        12,
        bottom:     12,
        width:      2,
        background: 'var(--border)',
      }} />

      {history.map((entry, i) => {
        const colour = STATUS_COLOURS[entry.toStatus] ?? 'var(--text-faint)'
        const label  = STATUS_LABELS[entry.toStatus]  ?? entry.toStatus.replace(/_/g, ' ')
        const isLast = i === history.length - 1

        return (
          <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: isLast ? 0 : 20, position: 'relative' }}>
            {/* dot */}
            <div style={{
              width:        24,
              height:       24,
              borderRadius: '50%',
              background:   isLast ? colour : 'var(--bg-raised)',
              border:       `2px solid ${colour}`,
              flexShrink:   0,
              zIndex:       1,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
            }}>
              {isLast && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
              )}
            </div>

            {/* content */}
            <div style={{ paddingTop: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                {label}
              </div>
              {entry.reason && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {entry.reason}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
                {entry.changedBy.name} · {new Date(entry.createdAt).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
