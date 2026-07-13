import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string | ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={onCancel} aria-label="Close" />
      <div className="relative mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            variant === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-title" className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</button>
          <button
            type="button"
            ref={confirmRef}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
