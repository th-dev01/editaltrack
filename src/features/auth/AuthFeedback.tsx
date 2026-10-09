import { CircleAlert, CircleCheck } from 'lucide-react'

export function AuthFeedback({ message, success = false }: { message?: string | null; success?: boolean }) {
  if (!message) return null
  const Icon = success ? CircleCheck : CircleAlert
  return (
    <div className={`auth-feedback ${success ? 'is-success' : 'is-error'}`} role={success ? 'status' : 'alert'}>
      <Icon size={18} aria-hidden="true" /><p>{message}</p>
    </div>
  )
}
