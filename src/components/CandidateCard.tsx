import { CheckCircle2 } from 'lucide-react'
import type { Candidate } from '../types'
import { fallbackPhoto } from '../lib/constants'

export function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: Candidate
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group overflow-hidden rounded-lg border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${
        selected ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'
      }`}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={candidate.photo || fallbackPhoto}
          alt={candidate.fullname}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{candidate.fullname}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{candidate.platform}</p>
          </div>
          {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" /> : null}
        </div>
        <p className="mt-3 line-clamp-3 text-sm text-slate-500">{candidate.biography}</p>
      </div>
    </button>
  )
}
