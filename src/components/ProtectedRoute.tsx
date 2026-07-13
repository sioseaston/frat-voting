import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100">
        <Loader2 className="h-9 w-9 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'admin' ? '/admin' : '/member'} replace />

  return <Outlet />
}
