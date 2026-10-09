import { useEffect } from 'react'
import { ArrowLeft, KeyRound, UserRoundPlus, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../features/auth/auth-context'
import { AuthLoading } from '../features/auth/AuthLoading'
import { AuthFeedback } from '../features/auth/AuthFeedback'
import { LoginForm } from '../features/auth/LoginForm'
import { SignupForm } from '../features/auth/SignupForm'
import { ForgotPasswordForm } from '../features/auth/ForgotPasswordForm'
import { ResetPasswordForm } from '../features/auth/ResetPasswordForm'

const content = {
  login: { page: 'Login', title: 'Seu próximo passo começa aqui.', description: 'Entre no seu espaço e mantenha suas oportunidades por perto.', icon: LogIn, form: LoginForm },
  signup: { page: 'Cadastro', title: 'Novas possibilidades esperam por você.', description: 'Crie sua conta para começar a organizar seus editais.', icon: UserRoundPlus, form: SignupForm },
  recovery: { page: 'Recuperar senha', title: 'Vamos recuperar seu acesso.', description: 'Informe seu e-mail e enviaremos um link para escolher uma nova senha.', icon: KeyRound, form: ForgotPasswordForm },
  reset: { page: 'Redefinir senha', title: 'Um novo começo para seu acesso.', description: 'Escolha uma nova senha para sua conta EditalTrack.', icon: KeyRound, form: ResetPasswordForm },
} as const

export function AuthPage({ mode }: { mode: keyof typeof content }) {
  const { page, title, description, icon: Icon, form: Form } = content[mode]
  const { loading, error } = useAuth()

  useEffect(() => { document.title = `${page} | EditalTrack` }, [page])

  if (loading) return <AuthLoading />

  return (
    <div className="auth-layout">
      <a className="skip-link" href="#auth-content">Pular para o conteúdo</a>
      <header className="auth-header"><Brand /><Link to="/" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao início</Link></header>
      <main className="auth-main" id="auth-content" tabIndex={-1}>
        <section className="auth-card" aria-labelledby="auth-title">
          <span className="empty-icon mb-6"><Icon size={25} aria-hidden="true" /></span>
          <p className="eyebrow mb-3">SUAS OPORTUNIDADES, ORGANIZADAS</p>
          <h1 id="auth-title">{title}</h1>
          <p className="page-description">{description}</p>
          {!isSupabaseConfigured && (
            <div className="auth-notice" role="status"><strong>Configure o acesso ao Supabase</strong><p>Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local e reinicie o servidor. Use a URL raiz do projeto, sem /rest/v1/.</p></div>
          )}
          <AuthFeedback message={error} />
          <Form key={mode} />
          <nav className="auth-links" aria-label="Acesso à conta">
            {mode !== 'login' && <Link to="/login">Entrar</Link>}
            {mode === 'login' && <Link to="/cadastro">Criar conta</Link>}
          </nav>
        </section>
        <p className="auth-tagline">Um passo de cada vez. Uma oportunidade de cada vez.</p>
      </main>
    </div>
  )
}
