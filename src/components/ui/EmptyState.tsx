import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'

export function EmptyState({ title, action, icon }: { title: string; action?: ReactNode; icon?: LucideIcon }) {
  const Icon = icon ?? Inbox
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Icon className="mx-auto h-10 w-10 text-slate-400" />
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
