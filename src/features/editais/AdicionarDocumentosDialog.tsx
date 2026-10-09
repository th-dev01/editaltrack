import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { DOCUMENTO_SUGESTOES } from './documento-options'

interface AdicionarDocumentosDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (documentos: Array<{ nome: string; obrigatorio: boolean }>) => void
}

export function AdicionarDocumentosDialog({ open, onClose, onConfirm }: AdicionarDocumentosDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customNome, setCustomNome] = useState('')
  const [customObrigatorio, setCustomObrigatorio] = useState(true)
  const [search, setSearch] = useState('')

  if (!open) return null

  const filteredSugestoes = DOCUMENTO_SUGESTOES.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  )

  const totalSelecionados = selected.size + (customNome.trim() ? 1 : 0)

  const toggleSugestao = (nome: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(nome)) {
      newSelected.delete(nome)
    } else {
      newSelected.add(nome)
    }
    setSelected(newSelected)
  }

  const handleConfirm = () => {
    const documentos: Array<{ nome: string; obrigatorio: boolean }> = []

    selected.forEach(nome => {
      documentos.push({ nome, obrigatorio: true })
    })

    if (customNome.trim()) {
      documentos.push({ nome: customNome.trim(), obrigatorio: customObrigatorio })
    }

    if (documentos.length > 0) {
      onConfirm(documentos)
      onClose()
    }
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="adicionar-documentos-title">
      <div className="dialog dialog--large">
        <div className="dialog-header">
          <h2 id="adicionar-documentos-title">Adicionar documentos</h2>
          <button type="button" className="button button-ghost" onClick={onClose}>Fechar</button>
        </div>

        <div className="dialog-body">
          <div className="adicionar-documentos-section">
            <h3>Sugestões</h3>
            <div className="sugestoes-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="text"
                placeholder="Filtrar sugestões..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="sugestoes-list">
              {filteredSugestoes.map((sugestao) => (
                <label key={sugestao} className={`sugestao-item ${selected.has(sugestao) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(sugestao)}
                    onChange={() => toggleSugestao(sugestao)}
                  />
                  <span>{sugestao}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="adicionar-documentos-section">
            <h3>Documento personalizado</h3>
            <div className="form-field">
              <label htmlFor="custom-nome">Nome do documento *</label>
              <input
                id="custom-nome"
                type="text"
                value={customNome}
                onChange={(e) => setCustomNome(e.target.value)}
                placeholder="Ex: Declaração emitida pelo PPGCC"
              />
            </div>
            <div className="form-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={customObrigatorio}
                  onChange={(e) => setCustomObrigatorio(e.target.checked)}
                />
                Obrigatório
              </label>
            </div>
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleConfirm}
            disabled={totalSelecionados === 0}
          >
            <Plus size={16} aria-hidden="true" />
            {totalSelecionados === 1 ? 'Adicionar 1 documento' : `Adicionar ${totalSelecionados} documentos`}
          </button>
        </div>
      </div>
    </div>
  )
}