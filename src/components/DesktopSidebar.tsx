import { ArrowUpRight, Plus, Sprout } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { navigationItems } from '../lib/navigation'
import { Brand } from './Brand'

export function DesktopSidebar() {
  return (
    <aside className="desktop-sidebar">
      <Brand />
      <p className="sidebar-caption">SEU ESPAÇO DE OPORTUNIDADES</p>
      <Link to="/editais/novo" className="button button-primary w-full">
        <Plus size={18} aria-hidden="true" /> Novo edital
      </Link>
      <nav aria-label="Navegação principal" className="sidebar-nav">
        {navigationItems.filter((item) => item.to !== '/editais/novo').map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={20} aria-hidden="true" />
            <span>{label === 'Editais' ? 'Meus editais' : label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <Sprout size={21} className="text-accent" aria-hidden="true" />
          <p>Um passo de cada vez.</p>
          <span>Sua próxima oportunidade começa com organização.</span>
        </div>
        <Link className="sidebar-footer" to="/sobre">
          <span className="flex items-center gap-2"><span className="status-dot" /> Em construção · Fase 1</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  )
}
