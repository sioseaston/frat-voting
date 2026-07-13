import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { CandidateCard } from '../components/CandidateCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import { fallbackPhoto } from '../lib/constants'
import { api } from '../services/api'
import type { Candidate } from '../types'

const schema = z.object({
  electionId: z.string().min(1),
  positionId: z.string().min(1),
  fullname: z.string().min(3),
  photo: z.string().url().or(z.literal('')),
  platform: z.string().min(5),
  biography: z.string().min(5),
})

type FormValues = z.infer<typeof schema>

export function CandidatesPage() {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [editing, setEditing] = useState<Candidate | null>(null)
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Candidate | null>(null)
  const [filterElectionId, setFilterElectionId] = useState('')
  const elections = useQuery({ queryKey: ['elections'], queryFn: api.elections })
  const selectedElectionId = editing?.electionId || elections.data?.elections[0]?._id || ''
  const effectiveFilter = filterElectionId || undefined
  const positions = useQuery({
    queryKey: ['positions', selectedElectionId],
    queryFn: () => api.positions(selectedElectionId),
    enabled: Boolean(selectedElectionId),
  })
  const candidates = useQuery({
    queryKey: ['candidates', effectiveFilter],
    queryFn: () => api.candidates(effectiveFilter),
  })

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? api.updateCandidate(editing._id, values) : api.createCandidate(values),
    onSuccess: async () => {
      notify('Candidate saved.')
      setOpen(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['candidates'] })
      await queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'Unable to save candidate', 'error'),
  })

  const remove = useMutation({
    mutationFn: api.deleteCandidate,
    onSuccess: async () => {
      notify('Candidate removed.')
      await queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
  })

  if (elections.isLoading || candidates.isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Candidate Module</p>
          <h2 className="text-2xl font-bold text-slate-900">Candidates</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="field-input max-w-56"
            value={filterElectionId}
            onChange={(e) => setFilterElectionId(e.target.value)}
          >
            <option value="">All elections</option>
            {elections.data?.elections.map((election) => (
              <option key={election._id} value={election._id}>{election.title}</option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add candidate
          </button>
        </div>
      </div>

      {candidates.data?.candidates.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {candidates.data.candidates.map((candidate) => (
            <div key={candidate._id} className="space-y-3">
              <CandidateCard candidate={candidate} />
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => { setEditing(candidate); setOpen(true) }}>
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button className="btn-danger px-3" onClick={() => setConfirmDelete(candidate)} aria-label={`Delete ${candidate.fullname}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No candidates yet" />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete candidate"
        message={`Are you sure you want to delete "${confirmDelete?.fullname}"? This cannot be undone.`}
        onConfirm={() => { remove.mutate(confirmDelete!._id); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
        loading={remove.isPending}
      />

      {open ? (
        <Modal title={editing ? 'Edit candidate' : 'Add candidate'} onClose={() => { setOpen(false); setEditing(null) }}>
          <CandidateForm
            candidate={editing}
            elections={elections.data?.elections ?? []}
            positions={positions.data?.positions ?? []}
            onElectionChange={(id) => queryClient.invalidateQueries({ queryKey: ['positions', id] })}
            onSubmit={(values) => save.mutate(values)}
            loading={save.isPending}
          />
        </Modal>
      ) : null}
    </div>
  )
}

function CandidateForm({
  candidate,
  elections,
  positions,
  onSubmit,
  loading,
}: {
  candidate: Candidate | null
  elections: { _id: string; title: string }[]
  positions: { _id: string; name: string }[]
  onElectionChange: (id: string) => void
  onSubmit: (values: FormValues) => void
  loading: boolean
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      electionId: candidate?.electionId ?? elections[0]?._id ?? '',
      positionId: candidate?.positionId ?? positions[0]?._id ?? '',
      fullname: candidate?.fullname ?? '',
      photo: candidate?.photo ?? fallbackPhoto,
      platform: candidate?.platform ?? '',
      biography: candidate?.biography ?? '',
    },
  })

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="field-label">Election</span>
          <select className="field-input" {...register('electionId')}>
            {elections.map((election) => <option key={election._id} value={election._id}>{election.title}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label">Position</span>
          <select className="field-input" {...register('positionId')}>
            {positions.map((position) => <option key={position._id} value={position._id}>{position.name}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="field-label">Full Name</span>
        <input className="field-input" {...register('fullname')} />
        {errors.fullname ? <span className="text-sm text-rose-600">{errors.fullname.message}</span> : null}
      </label>
      <label className="block">
        <span className="field-label">Photo URL</span>
        <input className="field-input" {...register('photo')} />
      </label>
      {watch('photo') ? (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <img src={watch('photo')} alt="Preview" className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="text-xs text-slate-500 truncate flex-1">{watch('photo')}</div>
        </div>
      ) : null}
      <label className="block">
        <span className="field-label">Platform</span>
        <textarea className="field-input min-h-24" {...register('platform')} />
      </label>
      <label className="block">
        <span className="field-label">Biography</span>
        <textarea className="field-input min-h-24" {...register('biography')} />
      </label>
      <button className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save candidate'}</button>
    </form>
  )
}
