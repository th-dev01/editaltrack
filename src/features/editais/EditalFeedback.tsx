import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'

export function EditalFeedback({ message, success = false }: { message: string | null; success?: boolean }) {
  if (!message) return null
  const Icon = success ? CircleCheck : CircleAlert
  return <div className={`edital-feedback ${success ? 'is-success' : 'is-error'}`} role={success ? 'status' : 'alert'}><Icon size={18} aria-hidden="true" /><p>{message}</p></div>
}

export function EditalLoading({ message = 'Carregando edital…' }: { message?: string }) {
  return <div className="edital-loading" role="status"><LoaderCircle size={22} className="animate-spin" aria-hidden="true" /><p>{message}</p></div>
}
