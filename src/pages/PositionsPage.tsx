import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { defaultPositions } from '../lib/constants'
import { api } from '../services/api'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import type { Position } from '../types'

export function PositionsPage() {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const elections = useQuery({ queryKey: ['elections'], queryFn: api.elections })
  const activeElection = elections.data?.elections.find((election) => election.status !== 'closed')
  const [electionId, setElectionId] = useState('')
  const selectedElectionId = electionId || activeElection?._id || elections.data?.elections[0]?._id || ''
  const positions = useQuery({
    queryKey: ['positions', selectedElectionId],
    queryFn: () => api.positions(selectedElectionId),
    enabled: Boolean(selectedElectionId),
  })
  const [ordered, setOrdered] = useState<Position[]>([])
  const [name, setName] = useState(defaultPositions[0])
  const [confirmDelete, setConfirmDelete] = useState<Position | null>(null)
  const dragIndex = useRef<number | null>(null)
  const dropIndex = useRef<number | null>(null)
  const dragOverId = useRef<string | null>(null)

  useEffect(() => {
    if (positions.data?.positions) {
      setOrdered([...positions.data.positions].sort((a, b) => a.order - b.order))
    }
  }, [positions.data?.positions])

  const create = useMutation({
    mutationFn: () => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Position name is required')
      const exists = ordered.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
      if (exists) throw new Error(`"${trimmed}" already exists in this election`)
      const nextOrder = ordered.length + 1
      return api.createPosition({ electionId: selectedElectionId, name: trimmed, order: nextOrder })
    },
    onSuccess: async () => {
      notify('Position saved.')
      setName('')
      await queryClient.invalidateQueries({ queryKey: ['positions'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'Unable to save position', 'error'),
  })

  const remove = useMutation({
    mutationFn: api.deletePosition,
    onSuccess: async () => {
      notify('Position deleted.')
      await queryClient.invalidateQueries({ queryKey: ['positions'] })
    },
  })

  const reorder = useMutation({
    mutationFn: async (list: Position[]) => {
      const updates = list.map((pos, idx) => api.updatePosition(pos._id, { order: idx + 1 }))
      await Promise.all(updates)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['positions'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'Failed to reorder', 'error'),
  })

  function handleDragStart(index: number) {
    dragIndex.current = index
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault()
    dropIndex.current = index
    dragOverId.current = ordered[index]?._id ?? null
  }

  function handleDragLeave() {
    dragOverId.current = null
  }

  function handleDrop() {
    const from = dragIndex.current
    const to = dropIndex.current
    if (from === null || to === null || from === to) {
      dragIndex.current = null
      dropIndex.current = null
      dragOverId.current = null
      return
    }
    const list = [...ordered]
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    setOrdered(list)
    reorder.mutate(list)
    dragIndex.current = null
    dropIndex.current = null
    dragOverId.current = null
  }

  if (elections.isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Position Module</p>
        <h2 className="text-2xl font-bold text-slate-900">Positions</h2>
      </div>

      <section className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="field-label">Election</span>
            <select className="field-input" value={selectedElectionId} onChange={(event) => setElectionId(event.target.value)}>
              {elections.data?.elections.map((election) => (
                <option key={election._id} value={election._id}>{election.title}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Position Name</span>
            <input className="field-input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={() => create.mutate()} disabled={!selectedElectionId || create.isPending}>
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Drag to reorder
        </div>
        {ordered.length ? (
          <div className="divide-y divide-slate-100">
            {ordered.map((position, idx) => (
              <div
                key={position._id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={() => { dragIndex.current = null; dragOverId.current = null }}
                className={`flex items-center gap-3 px-5 py-3 transition ${
                  dragOverId.current === position._id ? 'bg-brand-50 ring-2 ring-brand-200' : 'hover:bg-slate-50'
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-500">
                  {idx + 1}
                </span>
                <span className="cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing">
                  <GripVertical className="h-5 w-5" />
                </span>
                <span className="flex-1 font-medium text-slate-900">{position.name}</span>
                <button
                  className="btn-danger px-3"
                  onClick={() => setConfirmDelete(position)}
                  aria-label={`Delete ${position.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-slate-500">No positions added yet.</div>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete position"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        onConfirm={() => { remove.mutate(confirmDelete!._id); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
        loading={remove.isPending}
      />
    </div>
  )
}
