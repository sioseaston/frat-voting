import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Edit, Plus, Search, Trash2, Upload } from 'lucide-react'
import Papa from 'papaparse'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useToast } from '../hooks/useToast'
import { api, getStoredToken } from '../services/api'
import type { User } from '../types'

const schema = z.object({
  membershipNumber: z.string().min(2),
  fullname: z.string().min(3),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(['admin', 'member']),
  status: z.enum(['active', 'inactive']),
})

type FormValues = z.infer<typeof schema>

export function MembersPage() {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [editing, setEditing] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const members = useQuery({ queryKey: ['members'], queryFn: api.members })
  const filtered = (members.data?.members ?? []).filter(
    (m) => !search || m.fullname.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()),
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? api.updateMember(editing._id, values) : api.createMember(values),
    onSuccess: async () => {
      notify('Member saved.')
      setOpen(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['members'] })
      await queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'Unable to save member', 'error'),
  })

  const remove = useMutation({
    mutationFn: api.deleteMember,
    onSuccess: async () => {
      notify('Member deleted.')
      await queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const importRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    try {
      const token = getStoredToken()
      const response = await fetch('/api/members/export', { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'members.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Export failed', 'error')
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
      const result = await api.importMembers(data as Record<string, string>[])
      notify(`Imported ${result.imported} members.`)
      await queryClient.invalidateQueries({ queryKey: ['members'] })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Import failed', 'error')
    }
    if (importRef.current) importRef.current.value = ''
  }

  if (members.isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Member Management</p>
          <h2 className="text-2xl font-bold text-slate-900">Members</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="field-input max-w-56 pl-9" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </label>
          <button className="btn-secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button className="btn-secondary" onClick={() => importRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Create member
          </button>
        </div>
      </div>
      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Voted</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((member) => (
                <tr key={member._id}>
                  <td className="px-5 py-4"><p className="font-semibold text-slate-900">{member.fullname}</p><p className="text-xs text-slate-500">{member.membershipNumber}</p></td>
                  <td className="px-5 py-4 text-slate-700">{member.email}</td>
                  <td className="px-5 py-4"><StatusBadge status={member.role} /></td>
                  <td className="px-5 py-4"><StatusBadge status={member.status} /></td>
                  <td className="px-5 py-4 text-slate-700">{member.hasVoted ? 'Yes' : 'No'}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary px-3" onClick={() => { setEditing(member); setOpen(true) }} aria-label={`Edit ${member.fullname}`}>
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="btn-danger px-3" onClick={() => setConfirmDelete(member)} aria-label={`Delete ${member.fullname}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {filtered.length > pageSize ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{filtered.length} members</span>
          <div className="flex gap-2">
            <button className="btn-secondary px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="flex items-center px-2">{page} / {totalPages}</span>
            <button className="btn-secondary px-3" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete member"
        message={`Are you sure you want to delete "${confirmDelete?.fullname}" (${confirmDelete?.email})? This cannot be undone.`}
        onConfirm={() => { remove.mutate(confirmDelete!._id); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
        loading={remove.isPending}
      />

      {open ? (
        <Modal title={editing ? 'Edit member' : 'Create member'} closeOnOverlay={false} onClose={() => { setOpen(false); setEditing(null) }}>
          <MemberForm member={editing} loading={save.isPending} onSubmit={(values) => save.mutate(values)} />
        </Modal>
      ) : null}
    </div>
  )
}

function MemberForm({ member, onSubmit, loading }: { member: User | null; onSubmit: (values: FormValues) => void; loading: boolean }) {
  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      membershipNumber: member?.membershipNumber ?? '',
      fullname: member?.fullname ?? '',
      email: member?.email ?? '',
      password: '',
      role: member?.role ?? 'member',
      status: member?.status ?? 'active',
    },
  })

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="field-label">Membership Number</span><input className="field-input" {...register('membershipNumber')} /></label>
        <label><span className="field-label">Full Name</span><input className="field-input" {...register('fullname')} /></label>
      </div>
      <label className="block"><span className="field-label">Email</span><input className="field-input" type="email" {...register('email')} /></label>
      <label className="block"><span className="field-label">Password</span><input className="field-input" type="password" placeholder={member ? 'Leave blank to keep current password' : ''} {...register('password')} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="field-label">Role</span><select className="field-input" {...register('role')}><option value="member">Member</option><option value="admin">Admin</option></select></label>
        <label><span className="field-label">Status</span><select className="field-input" {...register('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      </div>
      <button className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save member'}</button>
    </form>
  )
}
