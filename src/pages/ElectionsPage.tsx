import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Edit, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { compactDate } from '../lib/format'
import { api } from '../services/api'
import type { Election } from '../types'

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  status: z.enum(['draft', 'open', 'closed']),
  showResultsBeforeEnd: z.boolean().optional(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
})

type FormValues = z.infer<typeof schema>

export function ElectionsPage() {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [editing, setEditing] = useState<Election | null>(null)
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Election | null>(null)
  const [search, setSearch] = useState('')
  const elections = useQuery({ queryKey: ['elections'], queryFn: api.elections })
  const filtered = elections.data?.elections.filter(
    (e) => !search || e.title.toLowerCase().includes(search.toLowerCase()),
  )

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? api.updateElection(editing._id, values) : api.createElection(values),
    onSuccess: async () => {
      notify('Election saved.')
      setOpen(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['elections'] })
      await queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'Unable to save election', 'error'),
  })

  const remove = useMutation({
    mutationFn: api.deleteElection,
    onSuccess: async () => {
      notify('Election deleted.')
      await queryClient.invalidateQueries({ queryKey: ['elections'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'Unable to delete election', 'error'),
  })

  const toggleResults = useMutation({
    mutationFn: ({ id, showResultsBeforeEnd }: { id: string; showResultsBeforeEnd: boolean }) =>
      api.updateElection(id, { showResultsBeforeEnd }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['elections'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'Failed to update visibility', 'error'),
  })

  function startCreate() {
    setEditing(null)
    setOpen(true)
  }

  if (elections.isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Election Module</p>
          <h2 className="text-2xl font-bold text-slate-900">Elections</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="field-input max-w-56 pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <button type="button" className="btn-primary" onClick={startCreate}>
            <CalendarPlus className="h-4 w-4" />
            Create election
          </button>
        </div>
      </div>

      {filtered?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((election) => (
            <article key={election._id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{election.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{election.description}</p>
                </div>
                <StatusBadge status={election.status} />
              </div>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-slate-100 p-3">
                  <p className="font-semibold text-slate-500">Start</p>
                  <p className="mt-1 text-slate-900">{compactDate(election.startDate)}</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-3">
                  <p className="font-semibold text-slate-500">End</p>
                  <p className="mt-1 text-slate-900">{compactDate(election.endDate)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <label className="relative inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={election.showResultsBeforeEnd ?? false}
                    onChange={() => toggleResults.mutate({ id: election._id, showResultsBeforeEnd: !(election.showResultsBeforeEnd ?? false) })}
                  />
                  <div className="h-5 w-9 rounded-full bg-slate-300 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-600 peer-checked:after:translate-x-4" />
                  <span className="text-slate-600">
                    {election.showResultsBeforeEnd ? 'Results visible to members' : 'Results hidden until closed'}
                  </span>
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(election)
                    setOpen(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button type="button" className="btn-danger" onClick={() => setConfirmDelete(election)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No elections yet" action={<button className="btn-primary" onClick={startCreate}>Create election</button>} />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete election"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This cannot be undone.`}
        onConfirm={() => { remove.mutate(confirmDelete!._id); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
        loading={remove.isPending}
      />

      {open ? (
        <Modal title={editing ? 'Edit election' : 'Create election'} onClose={() => setOpen(false)}>
          <ElectionForm election={editing} onSubmit={(values) => save.mutate(values)} loading={save.isPending} />
        </Modal>
      ) : null}
    </div>
  )
}

function toDateInput(value?: string) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 16)
}

function ElectionForm({
  election,
  onSubmit,
  loading,
}: {
  election: Election | null
  onSubmit: (values: FormValues) => void
  loading: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: election?.title ?? '',
      description: election?.description ?? '',
      startDate: toDateInput(election?.startDate),
      endDate: toDateInput(election?.endDate),
      status: election?.status ?? 'draft',
      showResultsBeforeEnd: election?.showResultsBeforeEnd ?? false,
    },
  })

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <label className="block">
        <span className="field-label">Title</span>
        <input className="field-input" {...register('title')} />
        {errors.title ? <span className="text-sm text-rose-600">{errors.title.message}</span> : null}
      </label>
      <label className="block">
        <span className="field-label">Description</span>
        <textarea className="field-input min-h-28" {...register('description')} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Start Date</span>
          <input className="field-input" type="datetime-local" {...register('startDate')} />
        </label>
        <label className="block">
          <span className="field-label">End Date</span>
          <input className="field-input" type="datetime-local" {...register('endDate')} />
          {errors.endDate ? <span className="text-sm text-rose-600">{errors.endDate.message}</span> : null}
        </label>
      </div>
      <label className="block">
        <span className="field-label">Status</span>
        <select className="field-input" {...register('status')}>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" {...register('showResultsBeforeEnd')} />
        <span className="text-sm text-slate-700">Show results to members before election ends</span>
      </label>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Saving...' : 'Save election'}
      </button>
    </form>
  )
}
