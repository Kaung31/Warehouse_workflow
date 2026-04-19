'use client'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?:    'sm' | 'md' | 'lg'
}

export default function Btn({
  variant = 'secondary', size = 'md',
  children, style, disabled, ...props
}: Props) {
  const sizes = {
    sm: { padding: '5px 12px', fontSize: 12 },
    md: { padding: '7px 16px', fontSize: 13 },
    lg: { padding: '10px 20px', fontSize: 14 },
  }

  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--accent-dim)', color: '#fff',           border: '1px solid var(--accent-dim)' },
    secondary: { background: 'var(--bg-raised)',  color: 'var(--text)',    border: '1px solid var(--border)' },
    ghost:     { background: 'transparent',       color: 'var(--text-muted)', border: '1px solid transparent' },
    danger:    { background: 'var(--red-bg)',     color: 'var(--red)',     border: '1px solid var(--red)' },
    success:   { background: 'var(--green-bg)',   color: 'var(--green)',   border: '1px solid var(--green)' },
  }

  return (
    <button
      disabled={disabled}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          6,
        borderRadius: 'var(--radius)',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        fontFamily:   'var(--font-sans)',
        fontWeight:   500,
        transition:   'all 0.1s',
        opacity:      disabled ? 0.5 : 1,
        whiteSpace:   'nowrap',
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}