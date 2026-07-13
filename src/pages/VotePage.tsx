import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Eye, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { api } from '../services/api'
import { fallbackPhoto } from '../lib/constants'
import type { Candidate } from '../types'

export function VotePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { notify } = useToast()
  const elections = useQuery({ queryKey: ['elections'], queryFn: api.elections })
  const activeElection = elections.data?.elections.find((election) => election.status === 'open')
  const positions = useQuery({
    queryKey: ['positions', activeElection?._id],
    queryFn: () => api.positions(activeElection?._id),
    enabled: Boolean(activeElection?._id),
  })
  const candidates = useQuery({
    queryKey: ['candidates', activeElection?._id],
    queryFn: () => api.candidates(activeElection?._id),
    enabled: Boolean(activeElection?._id),
  })
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [reviewing, setReviewing] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null)

  const allPositions = positions.data?.positions ?? []
  const allCandidates = candidates.data?.candidates ?? []

  const candidatesByPosition = useMemo(() => {
    const map: Record<string, Candidate[]> = {}
    for (const c of allCandidates) {
      if (!map[c.positionId]) map[c.positionId] = []
      map[c.positionId].push(c)
    }
    return map
  }, [allCandidates])

  function allPositionsComplete() {
    return allPositions.every((p) => Boolean(choices[p._id]))
  }

  function handleSelect(positionId: string, candidateId: string) {
    setChoices((prev) => {
      if (prev[positionId] === candidateId) {
        const next = { ...prev }
        delete next[positionId]
        return next
      }
      return { ...prev, [positionId]: candidateId }
    })
  }

  const submit = useMutation({
    mutationFn: () =>
      api.submitVote({
        electionId: activeElection?._id ?? '',
        votes: allPositions
          .filter((position) => Boolean(choices[position._id]))
          .map((position) => ({
            positionId: position._id,
            candidateId: choices[position._id] ?? '',
          })),
      }),
    onSuccess: async () => {
      await refreshUser()
      navigate('/member/vote/success')
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'Unable to submit ballot', 'error'),
  })

  const completeCount = allPositions.filter((p) => Boolean(choices[p._id])).length

  if (elections.isLoading || positions.isLoading || candidates.isLoading) return <Spinner />
  if (user?.hasVoted) return <EmptyState title="Your ballot has already been submitted." />
  if (!activeElection) return <EmptyState title="No election is currently open." />
  if (!allPositions.length) return <EmptyState title="No positions have been configured for this election." />

  if (reviewing) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Review Ballot</p>
          <h2 className="text-2xl font-bold text-slate-900">{activeElection.title}</h2>
        </div>

        {!allPositionsComplete() ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
            <strong>Incomplete ballot.</strong> Some positions have no selection. You can still submit, but votes will only count for
            positions you have filled.
          </div>
        ) : null}

        <section className="surface divide-y divide-slate-100">
          {allPositions.map((position) => {
            const cid = choices[position._id]
            const candidate = cid ? allCandidates.find((item) => item._id === cid) : null
            return (
              <div key={position._id} className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{position.name}</p>
                  {candidate ? (
                    <p className="mt-1 font-medium text-slate-900">{candidate.fullname}</p>
                  ) : (
                    <p className="mt-1 text-sm text-rose-500">No selection</p>
                  )}
                </div>
                {candidate ? (
                  <img src={candidate.photo || fallbackPhoto} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100" />
                ) : null}
              </div>
            )
          })}
        </section>
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary" onClick={() => setReviewing(false)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button className="btn-primary" disabled={submit.isPending} onClick={() => setConfirmSubmit(true)}>
            {submit.isPending ? 'Submitting...' : 'Submit ballot'}
          </button>
        </div>
        <ConfirmDialog
          open={confirmSubmit}
          title="Submit ballot"
          message={
            <>
              <p>Once submitted, your votes <strong>cannot be changed</strong>.</p>
              <p className="mt-2">
                You have selected candidates for <strong>{completeCount}</strong> of <strong>{allPositions.length}</strong> positions.
              </p>
              <p className="mt-2">Are you sure you want to submit?</p>
            </>
          }
          confirmLabel="Submit"
          variant="warning"
          onConfirm={() => { setConfirmSubmit(false); submit.mutate() }}
          onCancel={() => setConfirmSubmit(false)}
          loading={submit.isPending}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Ballot</p>
          <h2 className="text-2xl font-bold text-slate-900">{activeElection.title}</h2>
          <p className="mt-1 text-sm text-slate-500">Select one candidate for each position</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{completeCount} / {allPositions.length} positions complete</span>
          </div>
          <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${(completeCount / allPositions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {allPositions.map((position) => {
        const pool = candidatesByPosition[position._id] ?? []
        const selected = choices[position._id]

        if (!pool.length) return null

        return (
          <section key={position._id} className="surface overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{position.name}</h3>
                  <p className="text-sm text-slate-500">Choose one candidate</p>
                </div>
                {selected ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Selected
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not selected</span>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {pool.map((candidate) => (
                <div
                  key={candidate._id}
                  className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition hover:bg-slate-50 ${
                    selected === candidate._id ? 'bg-brand-50' : ''
                  }`}
                  onClick={() => handleSelect(position._id, candidate._id)}
                >
                  <img
                    src={candidate.photo || fallbackPhoto}
                    alt={candidate.fullname}
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{candidate.fullname}</p>
                      <button
                        type="button"
                        className="text-brand-600 hover:text-brand-800"
                        onClick={(e) => { e.stopPropagation(); setDetailCandidate(candidate) }}
                        aria-label={`View details for ${candidate.fullname}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="truncate text-sm text-slate-500">{candidate.platform}</p>
                  </div>
                  <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                    selected === candidate._id ? 'border-brand-600 bg-brand-600' : 'border-slate-300'
                  }`}>
                    {selected === candidate._id ? (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <div className="flex justify-end gap-3">
        <button className="btn-primary" onClick={() => setReviewing(true)}>
          Review ballot
          <ArrowLeft className="h-4 w-4 rotate-180" />
        </button>
      </div>

      {detailCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={() => setDetailCandidate(null)} aria-label="Close" />
          <div className="relative mx-auto w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="pr-4 text-lg font-bold text-slate-900">{detailCandidate.fullname}</h2>
              <button type="button" className="text-slate-400 hover:text-slate-900" onClick={() => setDetailCandidate(null)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <img
                src={detailCandidate.photo || fallbackPhoto}
                alt={detailCandidate.fullname}
                className="mx-auto h-40 w-40 rounded-full object-cover ring-4 ring-slate-100"
              />
              {detailCandidate.platform ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</p>
                  <p className="text-sm leading-6 text-slate-700">{detailCandidate.platform}</p>
                </div>
              ) : null}
              {detailCandidate.biography ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Biography</p>
                  <p className="text-sm leading-6 text-slate-700">{detailCandidate.biography}</p>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button type="button" className="btn-primary" onClick={() => setDetailCandidate(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
