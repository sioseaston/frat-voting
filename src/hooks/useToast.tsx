import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'

type ToastKind = 'success' | 'error'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const ToastContext = createContext<{ notify: (message: string, kind?: ToastKind) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now()
    setToasts((current) => [...current, { id, kind, message }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = toast.kind === 'success' ? CheckCircle2 : XCircle
          return (
            <div
              key={toast.id}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-soft"
            >
              <Icon className={toast.kind === 'success' ? 'h-5 w-5 text-brand-600' : 'h-5 w-5 text-rose-600'} />
              <p className="flex-1 font-medium text-slate-800">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
