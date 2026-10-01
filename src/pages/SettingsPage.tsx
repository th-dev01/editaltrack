import { Bell, CalendarDays, Globe2, Moon, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { PhaseNotice } from '../components/PhaseNotice'

export function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="DO SEU JEITO" title="Configurações" description="Um espaço para suas preferências, sua conta e suas integrações." />
      <div className="settings-grid">
        <section className="panel" aria-labelledby="preferences-title">
          <div className="panel-heading"><h2 id="preferences-title">Preferências</h2></div>
          <div className="settings-row"><Moon size={20} aria-hidden="true" /><div><h3>Aparência</h3><p>Tema escuro, para focar no que importa.</p></div><span className="subtle-badge">Escuro</span></div>
          <div className="settings-row"><Globe2 size={20} aria-hidden="true" /><div><h3>Fuso horário</h3><p>Será configurável nas suas preferências.</p></div><span className="phase-tag">Fase 9</span></div>
          <div className="settings-row"><Bell size={20} aria-hidden="true" /><div><h3>Lembretes padrão</h3><p>Escolha com quanta antecedência quer lembrar.</p></div><span className="phase-tag">Fase 9</span></div>
        </section>
        <section className="panel" aria-labelledby="integrations-title">
          <div className="panel-heading"><h2 id="integrations-title">Integrações</h2><span className="phase-tag">Fases 10–11</span></div>
          <div className="integration-content"><span className="step-icon"><CalendarDays size={23} aria-hidden="true" /></span><h3>Google Calendar</h3><p>Suas etapas e lembretes em um calendário dedicado ao EditalTrack.</p><span className="connection-label"><span className="status-dot neutral" /> Integração ainda não disponível</span></div>
        </section>
      </div>
      <section className="helper-card"><UserRound size={22} aria-hidden="true" /><div className="flex-1"><h2>Sua conta</h2><p>Login, cadastro e recuperação de senha serão ativados na Fase 2.</p><Link to="/login" className="text-link mt-2">Conhecer a tela de acesso →</Link></div></section>
      <PhaseNotice>O tema escuro já está aplicado. Preferências salvas e integrações serão habilitadas nas fases indicadas.</PhaseNotice>
    </>
  )
}
