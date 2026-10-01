import { useEffect, useRef } from 'react'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { getPageLabel } from '../lib/navigation'
import { Brand } from './Brand'
import { DesktopSidebar } from './DesktopSidebar'
import { MobileNavigation } from './MobileNavigation'

export function AppLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const pageLabel = getPageLabel(pathname)

  useEffect(() => {
    document.title = `${pageLabel} | EditalTrack`
    if (previousPath.current !== pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      mainRef.current?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
  }, [pageLabel, pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <DesktopSidebar />
      <div className="app-body">
        <header className="topbar">
          <div className="mobile-brand"><Brand /></div>
          <div className="desktop-breadcrumb" aria-hidden="true">
            <span>Meu espaço</span><ChevronRight size={14} /><span className="text-text">{pageLabel}</span>
          </div>
          <Link to="/sobre" className="preview-label">Prévia do projeto <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </header>
        <main ref={mainRef} id="main-content" tabIndex={-1} className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer"><span>EditalTrack</span><span>Mais organização. Novas possibilidades.</span></footer>
      </div>
      <MobileNavigation />
    </div>
  )
}
