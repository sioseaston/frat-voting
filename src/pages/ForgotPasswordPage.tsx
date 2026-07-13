import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, MailQuestion } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { request } from '../services/api'

const schema = z.object({ email: z.string().email() })
type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      setError('')
      await request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto flex max-w-md items-center justify-center px-4 py-20">
          <div className="w-full rounded-lg bg-white p-8 text-center shadow-soft">
            <MailQuestion className="mx-auto h-12 w-12 text-brand-600" />
            <h2 className="mt-5 text-2xl font-bold text-slate-900">Check your email</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If an account with that email exists, you will receive a password reset link shortly.
            </p>
            <Link className="btn-primary mt-6" to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex max-w-md items-center justify-center px-4 py-20">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full rounded-lg bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-900">Forgot password</h2>
          <p className="mt-2 text-sm text-slate-500">Enter your email and we will send you a reset link.</p>
          <div className="mt-6 space-y-4">
            {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
            <label className="block">
              <span className="field-label">Email</span>
              <input className="field-input" type="email" autoComplete="email" {...register('email')} />
              {errors.email ? <span className="mt-1 block text-sm text-rose-600">{errors.email.message}</span> : null}
            </label>
          </div>
          <button type="submit" className="btn-primary mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
          <div className="mt-4 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
