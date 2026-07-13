import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { request } from '../services/api'

const schema = z.object({ password: z.string().min(6) })
type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      setError('')
      await request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password: values.password }) })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto flex max-w-md items-center justify-center px-4 py-20">
          <div className="w-full rounded-lg bg-white p-8 text-center shadow-soft">
            <h2 className="text-2xl font-bold text-slate-900">Invalid link</h2>
            <p className="mt-3 text-sm text-slate-600">This password reset link is missing or invalid.</p>
            <Link className="btn-primary mt-6" to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto flex max-w-md items-center justify-center px-4 py-20">
          <div className="w-full rounded-lg bg-white p-8 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" />
            <h2 className="mt-5 text-2xl font-bold text-slate-900">Password reset</h2>
            <p className="mt-3 text-sm text-slate-600">Your password has been updated. Sign in with your new password.</p>
            <Link className="btn-primary mt-6" to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex max-w-md items-center justify-center px-4 py-20">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full rounded-lg bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-900">Set new password</h2>
          <p className="mt-2 text-sm text-slate-500">Choose a strong password for your account.</p>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="field-label">New password</span>
              <input className="field-input" type="password" autoComplete="new-password" {...register('password')} />
              {errors.password ? <span className="mt-1 block text-sm text-rose-600">{errors.password.message}</span> : null}
            </label>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          <button type="submit" className="btn-primary mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  )
}
