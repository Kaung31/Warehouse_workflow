type Props = {
  label:   string
  value:   string | number
  sub?:    string
  accent?: boolean
  warn?:   boolean
}

export default function StatCard({ label, value, sub, accent, warn }: Props) {
  const borderColor = accent ? 'var(--accent)' : warn ? 'var(--amber)' : 'var(--border)'
  const valueColor  = accent ? 'var(--accent)'  : warn ? 'var(--amber)'  : 'var(--text)'

  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      padding:      '16px 18px',
      transition:   'border-color 0.15s',
    }}>
      <div style={{
        fontSize:      11,
        fontWeight:    600,
        color:         'var(--text-faint)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom:  10,
      }}>
        {label}
      </div>
      <div style={{
        fontSize:   26,
        fontWeight: 600,
        color:      valueColor,
        lineHeight: 1,
        fontFamily: 'var(--font-mono)',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>{sub}</div>
      )}
    </div>
  )
}