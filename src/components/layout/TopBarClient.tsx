'use client'
import { UserButton } from '@clerk/nextjs'

type Props = { role: string; name: string }

export default function TopBarClient({ role, name }: Props) {
  return (
    <header style={{
      height: 52, display: 'flex', alignItems: 'center',
      justifyContent: 'flex-end', gap: 14,
      padding: '0 28px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
    }}>
      {role && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-faint)', textTransform: 'uppercase',
          letterSpacing: '0.1em',
          padding: '3px 8px', border: '1px solid var(--border)',
          borderRadius: 4,
        }}>
          {role}
        </span>
      )}
      <UserButton
        appearance={{
          variables: { colorBackground: '#1f1f1f', colorText: '#f0f0f0' },
        }}
      />
    </header>
  )
}