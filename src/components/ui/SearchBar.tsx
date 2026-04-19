'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function SearchBar({ placeholder = 'Search...' }: { placeholder?: string }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [val, setVal] = useState(searchParams.get('search') ?? '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setVal(v)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (v) params.set('search', v)
      else params.delete('search')
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <input
      value={val}
      onChange={handleChange}
      placeholder={placeholder}
      style={{
        background:   'var(--bg-raised)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding:      '8px 12px',
        color:        'var(--text)',
        fontSize:     13,
        width:        260,
        outline:      'none',
        fontFamily:   'var(--font-sans)',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--border-light)'}
      onBlur={e  => e.target.style.borderColor = 'var(--border)'}
    />
  )
}