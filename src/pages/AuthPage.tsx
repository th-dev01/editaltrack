import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, UserRoundPlus, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

const content = {
  login: { title: 'Seu próximo passo começa aqui.', description: 'Entre no seu espaço e mantenha suas oportunidades por perto.', icon: LogIn },
  signup: { title: 'Novas possibilidades esperam por você.', description: 'Crie sua conta para começar a organizar seus editais.', icon: UserRoundPlus },
  recovery: { title: 'Vamos recuperar seu acesso.', description: 'Um espaço para redefinir sua senha com segurança.', icon: KeyRound },
} as const

interface AuthPageProps {
  mode: keyof typeof content
}

export function AuthPage({ mode }: AuthPageProps) {
  const { title, description, icon: Icon } = content[mode]

  useEffect(() => { document.title = `${mode === 'login' ? 'Login' : mode === 'signup' ? 'Cadastro' : 'Recuperar senha'} | EditalTrack` }, [mode])

  return (
    <div className="auth-layout">
      <header className="auth-header"><Brand /><Link to="/" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao início</Link></header>
      <main className="auth-main">
        <section className="auth-card">
          <span className="empty-icon mb-6"><Icon size={25} aria-hidden="true" /></span>
          <p className="eyebrow mb-3">SUAS OPORTUNIDADES, ORGANIZADAS</p>
          <h1>{title}</h1>
          <p className="page-description">{description}</p>
          <div className="auth-notice"><strong>Autenticação em preparação</strong><p>O acesso seguro com e-mail e senha será conectado ao Supabase na Fase 2. Nenhum dado pessoal é solicitado nesta prévia.</p></div>
          <Link to="/" className="button button-primary w-full">Explorar a interface <ArrowRight size={17} aria-hidden="true" /></Link>
          <nav className="auth-links" aria-label="Acesso à conta">
            {mode !== 'login' && <Link to="/login">Entrar</Link>}
            {mode !== 'signup' && <Link to="/cadastro">Criar conta</Link>}
            {mode !== 'recovery' && <Link to="/recuperar-senha">Recuperar senha</Link>}
          </nav>
        </section>
        <p className="auth-tagline">Um passo de cada vez. Uma oportunidade de cada vez.</p>
      </main>
    </div>
  )
}
