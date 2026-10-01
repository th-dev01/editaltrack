import { NavLink, useLocation } from 'react-router-dom'
import { navigationItems } from '../lib/navigation'

export function MobileNavigation() {
  const { pathname } = useLocation()

  return (
    <nav className="mobile-navigation" aria-label="Navegação principal">
      {navigationItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end || (to === '/editais' && pathname === '/editais/novo')}
          aria-label={label}
          className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''} ${to === '/editais/novo' ? 'mobile-nav-create' : ''}`}
        >
          <span className="mobile-nav-icon"><Icon size={21} aria-hidden="true" /></span>
          <span>{label === 'Novo edital' ? 'Novo' : label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
