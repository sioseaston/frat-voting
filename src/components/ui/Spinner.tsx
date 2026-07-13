import { Loader2 } from 'lucide-react'

export function Spinner() {
  return (
    <div className="grid min-h-48 place-items-center">
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
    </div>
  )
}
