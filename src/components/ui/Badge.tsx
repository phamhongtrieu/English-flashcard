import type { ReactNode } from 'react'
export function Badge({ children, subtle = false }: { children: ReactNode; subtle?: boolean }) {
  return <span className={`badge ${subtle ? 'badge-subtle' : ''}`}>{children}</span>
}
