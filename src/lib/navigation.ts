import { CalendarDays, House, Plus, Settings2, Files } from 'lucide-react'

export const navigationItems = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/editais', label: 'Editais', icon: Files, end: false },
  { to: '/editais/novo', label: 'Novo edital', icon: Plus, end: true },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays, end: false },
  { to: '/configuracoes', label: 'Configurações', icon: Settings2, end: false },
] as const

export function getPageLabel(pathname: string): string {
  if (pathname === '/editais/novo') return 'Novo edital'
  if (/^\/editais\/[^/]+\/editar\/?$/.test(pathname)) return 'Editar edital'
  if (/^\/editais\/[^/]+\/?$/.test(pathname)) return 'Detalhes do edital'
  return navigationItems.find((item) => item.to === pathname)?.label ?? 'EditalTrack'
}
