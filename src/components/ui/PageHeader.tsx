type Props = {
  title:     string
  sub?:      string
  action?:   React.ReactNode
}

export default function PageHeader({ title, sub, action }: Props) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'flex-start',
      justifyContent: 'space-between',
      marginBottom:   24,
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {sub && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}