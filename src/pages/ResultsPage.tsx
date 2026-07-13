import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { api } from '../services/api'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../hooks/useAuth'

export function ResultsPage() {
  const { user } = useAuth()
  const elections = useQuery({ queryKey: ['elections'], queryFn: api.elections })
  const [selectedElectionId, setSelectedElectionId] = useState('')
  const effectiveId = selectedElectionId || undefined
  const results = useQuery({
    queryKey: ['results', effectiveId],
    queryFn: () => api.results(effectiveId),
  })

  if (elections.isLoading || results.isLoading) return <Spinner />
  if (!results.data?.election) return <EmptyState title="No election results are available yet." />
  if (user?.role === 'member' && results.data.election.status !== 'closed' && !results.data.election.showResultsBeforeEnd) {
    return <EmptyState title="Results will be available to members after the election closes." />
  }

  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  function handleExport() {
    if (!results.data) return
    const rows = results.data.results.flatMap((position) => {
      return position.candidates.map((candidate) => ({
        Position: position.name,
        Candidate: candidate.fullname,
        Votes: candidate.votes,
        Percentage: `${candidate.percentage}%`,
        Winner: candidate.isWinner ? 'Yes' : '',
        'Total Votes': position.totalVotes,
      }))
    })
    const header = Object.keys(rows[0] ?? {})
    const csv = [header.join(','), ...rows.map((row) => header.map((key) => esc(row[key as keyof typeof row])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(results.data.election?.title ?? 'results').replace(/\s+/g, '_')}_results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Results Module</p>
          <h2 className="text-2xl font-bold text-slate-900">{results.data.election.title}</h2>
        </div>
        <div className="flex items-end gap-3">
          {elections.data?.elections.length ? (
            <select
              className="field-input max-w-64"
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
            >
              <option value="">{user?.role === 'admin' ? 'Latest election' : 'Latest closed election'}</option>
              {elections.data.elections
                .filter((e) => user?.role === 'admin' || e.status === 'closed')
                .map((election) => (
                <option key={election._id} value={election._id}>
                  {election.title}
                </option>
              ))}
            </select>
          ) : null}
          <button className="btn-secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <div className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            Turnout: {results.data.voterTurnout}%
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {results.data.results.map((position) => (
          <section key={position.positionId} className="surface p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{position.name}</h3>
                <span className="text-sm text-slate-500">{position.totalVotes} votes cast</span>
              </div>
            <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {position.candidates
                .sort((a, b) => b.votes - a.votes)
                .map((candidate) => (
                <div key={candidate.candidateId} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{candidate.fullname}</span>
                    {candidate.isWinner && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Winner</span>
                    )}
                  </div>
                  <span className="text-slate-600">{candidate.votes} votes · {candidate.percentage}%</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
