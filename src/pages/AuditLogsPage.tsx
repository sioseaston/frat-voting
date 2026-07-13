import { useQuery } from '@tanstack/react-query'
import { Search, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { request } from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

interface AuditEntry {
  _id: string
  userId: { _id: string; fullname: string; email: string } | null
  role: string
  action: string
  resource: string
  resourceId: string
  details: string
  createdAt: string
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const logs = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => request<{ logs: AuditEntry[] }>('/api/audit-logs'),
  })
  const filtered = logs.data?.logs.filter(
    (log) =>
      !search ||
      log.userId?.fullname?.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()),
  )

  if (logs.isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Audit Trail</p>
          <h2 className="text-2xl font-bold text-slate-900">Audit logs</h2>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="field-input max-w-56 pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {filtered?.length ? (
        <section className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Resource</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => (
                  <tr key={log._id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{log.userId?.fullname ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{log.userId?.email ?? ''}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                        log.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        log.role === 'member' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.role || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                        log.action === 'create' ? 'bg-green-100 text-green-700' :
                        log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'delete' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{log.resource}</td>
                    <td className="max-w-xs truncate px-5 py-4 text-slate-600">{log.details}</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState title="No audit logs yet" icon={ShieldAlert} />
      )}
    </div>
  )
}
