import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'emerald',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  accent?: 'emerald' | 'blue' | 'amber' | 'rose'
}) {
  const colors = {
    emerald: 'bg-brand-100 text-brand-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-lg ${colors[accent]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
