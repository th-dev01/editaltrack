import { ExternalLink } from 'lucide-react'

interface ExternalLinkButtonProps {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
}

export function ExternalLinkButton({ href, label, variant = 'secondary' }: ExternalLinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`button button-${variant}`}
    >
      <ExternalLink size={16} aria-hidden="true" />
      {label}
    </a>
  )
}
