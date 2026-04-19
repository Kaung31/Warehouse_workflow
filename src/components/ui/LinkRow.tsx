'use client'
import { useRouter } from 'next/navigation'

type Props = React.HTMLAttributes<HTMLTableRowElement> & { href: string }

export default function LinkRow({ href, children, style, ...props }: Props) {
  const router = useRouter()
  return (
    <tr
      onClick={() => router.push(href)}
      style={{ cursor: 'pointer', ...style }}
      {...props}
    >
      {children}
    </tr>
  )
}
