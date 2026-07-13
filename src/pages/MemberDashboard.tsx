import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock, History, Info, Vote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../lib/format'
import { Spinner } from '../components/ui/Spinner'

export function MemberDashboard() {
  const { user } = useAuth()
  const elections = useQuery({ queryKey: ['elections'], queryFn: api.elections })
  const activeElection = elections.data?.elections.find((election) => election.status === 'open')
  const closedElections = elections.data?.elections.filter((election) => election.status === 'closed') ?? []
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!activeElection || !activeElection.endDate) { setCountdown(''); return }
    const end = activeElection.endDate
    function tick() {
      const diff = new Date(end).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Ended'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${d}d ${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeElection?.endDate])

  if (elections.isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Member Dashboard</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Your voting status</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-100 text-brand-700">
              <Vote className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Election</p>
              <h3 className="text-xl font-bold text-slate-900">{activeElection?.title ?? 'No open election'}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {activeElection?.description ??
              'When an administrator opens an election, your ballot will appear here with one required selection per position.'}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-100 p-4">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <p className="mt-2 text-xs font-semibold uppercase text-slate-500">Starts</p>
              <p className="text-sm font-semibold text-slate-800">{formatDate(activeElection?.startDate)}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <CalendarDays className="h-5 w-5 text-brand-600" />
              <p className="mt-2 text-xs font-semibold uppercase text-slate-500">Ends</p>
              <p className="text-sm font-semibold text-slate-800">{formatDate(activeElection?.endDate)}</p>
            </div>
          </div>
          {countdown && countdown !== 'Ended' ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Clock className="h-4 w-4" />
              Closes in {countdown}
            </div>
          ) : null}
          <Link
            to="/member/vote"
            className={`btn-primary mt-6 ${!activeElection || user?.hasVoted ? 'pointer-events-none opacity-60' : ''}`}
          >
            {user?.hasVoted ? 'Ballot submitted' : 'Start voting'}
          </Link>
        </section>
        <section className="surface p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className={user?.hasVoted ? 'h-8 w-8 text-brand-600' : 'h-8 w-8 text-slate-400'} />
            <div>
              <p className="text-sm text-slate-500">Voting Status</p>
              <h3 className="text-xl font-bold text-slate-900">{user?.hasVoted ? 'Submitted' : 'Not submitted'}</h3>
            </div>
          </div>
          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <Info className="mb-2 h-5 w-5 text-blue-600" />
            Select exactly one candidate for every position. Your ballot is final after confirmation and cannot be edited.
          </div>
        </section>
      </div>

      {closedElections.length ? (
        <section className="surface p-6">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-slate-500" />
            <h3 className="text-lg font-bold text-slate-900">Past elections</h3>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {closedElections.map((election) => (
              <div key={election._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">{election.title}</p>
                  <p className="text-xs text-slate-500">Ended {formatDate(election.endDate)}</p>
                </div>
                <Link className="btn-secondary px-3 text-xs" to={`/results?electionId=${election._id}`}>View results</Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
