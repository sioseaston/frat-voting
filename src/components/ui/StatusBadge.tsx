import type { ElectionStatus, UserStatus } from '../../types'

const variants: Record<string, string> = {
  open: 'bg-brand-100 text-brand-700',
  active: 'bg-brand-100 text-brand-700',
  closed: 'bg-slate-200 text-slate-700',
  draft: 'bg-amber-100 text-amber-700',
  inactive: 'bg-rose-100 text-rose-700',
}

export function StatusBadge({ status }: { status: ElectionStatus | UserStatus | 'admin' | 'member' | 'none' }) {
  const className = variants[status] ?? 'bg-blue-100 text-blue-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>{status}</span>
}
