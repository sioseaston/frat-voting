import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
  UsersRound,
  Vote,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3 },
  { to: '/admin/elections', label: 'Elections', icon: CalendarDays },
  { to: '/admin/positions', label: 'Positions', icon: Trophy },
  { to: '/admin/candidates', label: 'Candidates', icon: UserRoundCheck },
  { to: '/admin/members', label: 'Members', icon: UsersRound },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
  { to: '/results', label: 'Results', icon: BarChart3 },
]

const memberLinks = [
  { to: '/member', label: 'Dashboard', icon: BarChart3 },
  { to: '/member/vote', label: 'Vote', icon: Vote },
  { to: '/results', label: 'Results', icon: Trophy },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const links = user?.role === 'admin' ? adminLinks : memberLinks

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-slate-950 text-white transition lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-100">Fraternity</p>
              <p className="text-lg font-bold">Voting System</p>
            </div>
          </div>
          <button type="button" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-6 space-y-1 px-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin' || link.to === '/member'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-brand-500 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open ? <button type="button" className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay" /> : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="text-slate-600 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{user?.role}</p>
              <h1 className="text-lg font-semibold text-slate-900">{user?.fullname}</h1>
            </div>
          </div>
          <button type="button" className="btn-secondary px-3" onClick={handleLogout} title="Log out">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
