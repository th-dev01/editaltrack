import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PhaseNoticeProps {
  children: React.ReactNode
}

export function PhaseNotice({ children }: PhaseNoticeProps) {
  return (
    <div className="phase-notice">
      <Info size={17} className="shrink-0" aria-hidden="true" />
      <p>{children} <Link to="/sobre" className="inline-link">Ver etapas</Link></p>
    </div>
  )
}
