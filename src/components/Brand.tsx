import { FileCheck2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="EditalTrack — início">
      <span className="brand-mark"><FileCheck2 size={22} aria-hidden="true" /></span>
      <span>Edital<span className="text-accent">Track</span></span>
    </Link>
  )
}
