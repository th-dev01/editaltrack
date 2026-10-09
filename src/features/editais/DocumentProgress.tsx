interface DocumentProgressProps {
  providenciados: number
  total: number
  enviados: number
}

export function DocumentProgress({ providenciados, total, enviados }: DocumentProgressProps) {
  const percentage = total > 0 ? Math.round((providenciados / total) * 100) : 0

  return (
    <div className="document-progress">
      <div className="progress-header">
        <span className="progress-label">Documentos obrigatórios</span>
        <span className="progress-count">{providenciados}/{total} providenciados</span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percentage}% dos documentos obrigatórios providenciados`}
        />
      </div>
      <div className="progress-details">
        <span className="progress-detail">
          <span className="detail-icon">✓</span>
          {providenciados}/{total} providenciados
        </span>
        <span className="progress-detail">
          <span className="detail-icon">✉</span>
          {enviados} enviados
        </span>
      </div>
    </div>
  )
}