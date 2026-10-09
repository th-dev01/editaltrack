import type { EditalStatus } from '../../types/edital'
import { STATUS_LABELS } from './edital-options'

interface EditalStatusBadgeProps {
  status: EditalStatus
}

export function EditalStatusBadge({ status }: EditalStatusBadgeProps) {
  return (
    <span className="edital-status-badge">
      {STATUS_LABELS[status]}
    </span>
  )
}
