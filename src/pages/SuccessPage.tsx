import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SuccessPage() {
  return (
    <div className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center shadow-soft">
      <CheckCircle2 className="mx-auto h-16 w-16 text-brand-600" />
      <h2 className="mt-5 text-2xl font-bold text-slate-900">Ballot submitted</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Your vote has been securely recorded. Results will be available when the election is closed.
      </p>
      <Link className="btn-primary mt-6" to="/member">Return to dashboard</Link>
    </div>
  )
}
