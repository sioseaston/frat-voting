import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type LoginForm = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { notify } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  async function onSubmit(values: LoginForm) {
    try {
      const user = await login(values.email, values.password)
      notify('Welcome back.')
      navigate(user.role === 'admin' ? '/admin' : '/member')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Login failed', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:block">
          <img
            src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1600&q=85"
            alt="Members gathered for an election"
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-brand-900/80" />
          <div className="relative flex h-full flex-col justify-end p-12 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-100">Secure ballots</p>
            <h1 className="mt-4 max-w-2xl text-5xl font-bold leading-tight">Fraternity Voting System</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-200">
              Manage elections, verify eligibility, and publish transparent results from one Vercel-deployable app.
            </p>
          </div>
        </section>
        <section className="flex items-center justify-center px-4 py-10">
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded-lg bg-white p-8 shadow-soft">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Use your registered fraternity account.</p>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="field-label">Email</span>
                <input className="field-input" type="email" autoComplete="email" {...register('email')} />
                {errors.email ? <span className="mt-1 block text-sm text-rose-600">{errors.email.message}</span> : null}
              </label>
              <label className="block">
                <span className="field-label">Password</span>
                <input className="field-input" type="password" autoComplete="current-password" {...register('password')} />
                {errors.password ? <span className="mt-1 block text-sm text-rose-600">{errors.password.message}</span> : null}
              </label>
            </div>
            <div className="mt-2 text-right">
              <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" className="btn-primary mt-4 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
            <p className="mt-5 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
              Seed the database with `npm run seed`, then sign in as `admin@fraternity.test` using `Admin123!`.
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}
