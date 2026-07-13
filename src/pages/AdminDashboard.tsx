import { useQuery } from '@tanstack/react-query'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Legend, LinearScale, Tooltip } from 'chart.js'
import { CalendarCheck2, CheckCircle2, Trophy, UserRoundCheck, UsersRound, Vote } from 'lucide-react'
import { api } from '../services/api'
import { Spinner } from '../components/ui/Spinner'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export function AdminDashboard() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats })
  const results = useQuery({ queryKey: ['results'], queryFn: () => api.results() })

  if (stats.isLoading || results.isLoading) return <Spinner />

  const firstResult = results.data?.results[0]
  const chartLabels = firstResult?.candidates.map((candidate) => candidate.fullname) ?? []
  const chartVotes = firstResult?.candidates.map((candidate) => candidate.votes) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Admin Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Election command center</h2>
        </div>
        <StatusBadge status={stats.data?.stats.electionStatus ?? 'none'} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Members" value={stats.data?.stats.totalMembers ?? 0} icon={UsersRound} />
        <StatCard label="Total Candidates" value={stats.data?.stats.totalCandidates ?? 0} icon={UserRoundCheck} accent="blue" />
        <StatCard label="Total Positions" value={stats.data?.stats.totalPositions ?? 0} icon={Trophy} accent="amber" />
        <StatCard label="Votes Cast" value={stats.data?.stats.votesCast ?? 0} icon={Vote} accent="blue" />
        <StatCard label="Voter Turnout" value={`${stats.data?.stats.voterTurnout ?? 0}%`} icon={CheckCircle2} />
        <StatCard label="Election Status" value={stats.data?.stats.electionStatus ?? 'none'} icon={CalendarCheck2} accent="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="surface p-5">
          <h3 className="text-lg font-semibold text-slate-900">Result chart</h3>
          <div className="mt-6 h-80">
            {chartLabels.length ? (
              <Bar
                data={{
                  labels: chartLabels,
                  datasets: [{ label: firstResult?.name ?? 'Votes', data: chartVotes, backgroundColor: '#10b981' }],
                }}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-500">No ballots submitted yet.</div>
            )}
          </div>
        </section>
        <section className="surface p-5">
          <h3 className="text-lg font-semibold text-slate-900">Voter turnout</h3>
          <div className="mt-6 h-80">
            <Doughnut
              data={{
                labels: ['Voted', 'Remaining'],
                datasets: [
                  {
                    data: [
                      stats.data?.stats.votesCast ?? 0,
                      Math.max((stats.data?.stats.totalMembers ?? 0) - (stats.data?.stats.votesCast ?? 0), 0),
                    ],
                    backgroundColor: ['#10b981', '#dbeafe'],
                  },
                ],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </section>
      </div>

      <section className="surface p-5">
        <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p>Members registered: {stats.data?.stats.totalMembers ?? 0}</p>
          <p>Ballots submitted: {stats.data?.stats.votesCast ?? 0}</p>
          <p>Current election: {results.data?.election?.title ?? 'No active or closed election yet'}</p>
        </div>
      </section>
    </div>
  )
}
