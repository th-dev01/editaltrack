import type { InputHTMLAttributes } from 'react'

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
  hint?: string
  ref?: React.Ref<HTMLInputElement>
}

export function AuthField({ label, id, error, hint, ...props }: AuthFieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
      {hint && !error && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  )
}
