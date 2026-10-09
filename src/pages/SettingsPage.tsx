import { useEffect, useState, type FormEvent } from 'react'
import { Bell, CalendarDays, CheckCircle2, Globe2, LoaderCircle, Moon, UserRound, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../features/auth/auth-context'
import { SignOutButton } from '../features/auth/SignOutButton'
import { DEFAULT_REMINDER_LABELS, DEFAULT_REMINDER_VALUES, DEFAULT_USER_PREFERENCES, SUPPORTED_TIMEZONES, TIMEZONE_LABELS, type DefaultReminder, type SupportedTimezone, type UserPreferences } from '../types/user-preferences'
import { userPreferencesSchema } from '../features/settings/user-preferences-schema'
import { getUserPreferences, saveUserPreferences } from '../services/user-preferences.service'
import { formatDate, setConfiguredTimezone } from '../lib/date'
import { disconnectGoogle, getGoogleConnectionStatus, startGoogleOAuth } from '../services/google-calendar.service'
import { DISCONNECTED_GOOGLE_STATUS, type GoogleConnectionStatus } from '../types/google-calendar'

function getOAuthCallbackNotice(): string | null {
  const query = new URLSearchParams(window.location.search)
  switch (query.get('google')) {
    case 'error': {
      const messages: Record<string, string> = {
        invalid_client: 'As credenciais OAuth do Supabase não correspondem. Confira o Client ID e o Client Secret da mesma credencial Web no Google Cloud.',
        invalid_grant: 'O código de autorização expirou ou já foi usado. Inicie a conexão novamente.',
        unauthorized_client: 'O cliente OAuth não está autorizado. Confira a credencial Web e a configuração do consentimento Google.',
        invalid_request: 'O Google rejeitou a solicitação OAuth. Confira o redirect URI e tente novamente.',
        unsupported_grant_type: 'O Google rejeitou o tipo de autorização. Confira a configuração do cliente OAuth.',
        missing_state: 'A tentativa de autorização perdeu o state de segurança. Inicie a conexão novamente.',
        invalid_state: 'A tentativa de autorização expirou ou já foi usada. Inicie a conexão novamente.',
        missing_authorization_code: 'O Google não devolveu um código de autorização. Inicie a conexão novamente e aceite as permissões.',
        missing_access_token: 'O Google não devolveu um token de acesso. Tente conectar novamente.',
        userinfo_failed: 'Não foi possível obter o e-mail autorizado do Google. Confira as permissões e tente novamente.',
        profile_incomplete: 'O Google não retornou um perfil verificado para a conta selecionada.',
        missing_refresh_token: 'O Google não forneceu autorização offline. Remova a permissão anterior do EditalTrack na conta Google e conecte novamente.',
        callback_internal_error: 'O backend não conseguiu salvar a conexão. Confira os logs da função google-oauth-callback no Supabase.',
        token_exchange_failed: 'O Google recusou a troca do código OAuth. Confira o Client ID e o Client Secret configurados no Supabase.',
        token_encryption_config: 'A chave de criptografia de tokens no Supabase está ausente ou inválida. Confira TOKEN_ENCRYPTION_KEY nos secrets das Edge Functions.',
        token_encryption_failed: 'O backend não conseguiu criptografar os tokens do Google. Confira TOKEN_ENCRYPTION_KEY nos secrets do Supabase.',
        connection_lookup_failed: 'O backend não conseguiu consultar a conexão Google no banco. Confira as migrations e permissões Supabase.',
        profile_network_failed: 'O backend não conseguiu consultar o perfil Google. Verifique a conexão com a API do Google e tente novamente.',
      }
      const reason = query.get('google_error') ?? ''
      if (/^database_\d{3}$/.test(reason)) return 'O Supabase recusou uma operação no banco durante a conexão. Confira as permissões e os logs da função.'
      return messages[reason] ?? 'Não foi possível conectar sua conta Google.'
    }
    case 'cancelled': return 'Você cancelou a autorização.'
    case 'connected': return 'Conta Google conectada com sucesso.'
    default: return null
  }
}

export function SettingsPage() {
  const { user } = useAuth()
  const [timezone, setTimezone] = useState<SupportedTimezone>(DEFAULT_USER_PREFERENCES.timezone)
  const [reminders, setReminders] = useState<DefaultReminder[]>([...DEFAULT_REMINDER_VALUES])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionStatus>(DISCONNECTED_GOOGLE_STATUS)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleNotice, setGoogleNotice] = useState<string | null>(getOAuthCallbackNotice)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  useEffect(() => {
    let active = true
    getUserPreferences().then((preferences) => {
      if (!active) return
      setTimezone(preferences.timezone)
      setReminders(preferences.default_reminders)
      setConfiguredTimezone(preferences.timezone)
    }).catch(() => {
      if (active) setError('Não foi possível carregar suas preferências.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const query = new URLSearchParams(window.location.search)
    const callbackResult = query.get('google')
    if (callbackResult) {
      query.delete('google')
      query.delete('google_error')
      const cleanUrl = new URL(window.location.href)
      cleanUrl.search = query.toString()
      window.history.replaceState(window.history.state, '', cleanUrl)
    }
    getGoogleConnectionStatus().then((status) => {
      if (active) setGoogleConnection(status)
    }).catch(() => {
      if (active) setGoogleError('Não foi possível verificar a conexão com o Google.')
    }).finally(() => {
      if (active) setGoogleLoading(false)
    })
    return () => { active = false }
  }, [])

  async function connectGoogle() {
    setGoogleError(null)
    setGoogleBusy(true)
    try {
      const url = await startGoogleOAuth()
      window.location.assign(url)
    } catch {
      setGoogleError('Não foi possível iniciar a conexão com o Google.')
      setGoogleBusy(false)
    }
  }

  async function confirmGoogleDisconnect() {
    setGoogleError(null)
    setGoogleBusy(true)
    try {
      await disconnectGoogle()
      setGoogleConnection(DISCONNECTED_GOOGLE_STATUS)
      setGoogleNotice(null)
      setConfirmDisconnect(false)
    } catch {
      setGoogleError('Não foi possível desconectar sua conta Google. Tente novamente.')
    } finally {
      setGoogleBusy(false)
    }
  }

  function toggleReminder(value: DefaultReminder) {
    setReminders((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value])
    setSuccess(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    const validation = userPreferencesSchema.safeParse({ timezone, default_reminders: reminders })
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Revise suas preferências.')
      return
    }
    setSaving(true)
    try {
      const saved: UserPreferences = await saveUserPreferences(validation.data)
      setTimezone(saved.timezone)
      setReminders(saved.default_reminders)
      setConfiguredTimezone(saved.timezone)
      setSuccess(true)
    } catch {
      setError('Não foi possível salvar suas preferências. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const name = user?.user_metadata.name

  return (
    <>
      <PageHeader eyebrow="DO SEU JEITO" title="Configurações" description="Gerencie sua conta e as preferências do EditalTrack." />
      <div className="settings-grid">
        <section className="panel" aria-labelledby="preferences-title">
          <div className="panel-heading"><h2 id="preferences-title">Preferências</h2></div>
          <div className="settings-row"><Moon size={20} aria-hidden="true" /><div><h3>Aparência</h3><p>Tema escuro, para focar no que importa.</p></div><span className="subtle-badge">Escuro</span></div>
          <form className="preferences-form" onSubmit={handleSubmit} aria-busy={loading || saving}>
            <div className="settings-row settings-row--form">
              <Globe2 size={20} aria-hidden="true" />
              <div><label htmlFor="preferences-timezone">Fuso horário</label><p>Usado para exibir e interpretar suas datas.</p></div>
              <select id="preferences-timezone" value={timezone} onChange={(event) => { setTimezone(event.target.value as SupportedTimezone); setSuccess(false) }} disabled={loading || saving}>
                {SUPPORTED_TIMEZONES.map((value) => <option key={value} value={value}>{TIMEZONE_LABELS[value]}</option>)}
              </select>
            </div>
            <fieldset className="settings-row settings-row--form reminder-settings" disabled={loading || saving}>
              <Bell size={20} aria-hidden="true" />
              <div><legend>Lembretes padrão</legend><p>Preferências para uma integração futura. Nenhuma notificação será enviada.</p></div>
              <div className="reminder-options">
                {DEFAULT_REMINDER_VALUES.map((value) => <label key={value} className="reminder-option">
                  <input type="checkbox" checked={reminders.includes(value)} onChange={() => toggleReminder(value)} />
                  <span>{DEFAULT_REMINDER_LABELS[value]}</span>
                </label>)}
              </div>
            </fieldset>
            <div className="preferences-actions">
              {error && <p role="alert" className="field-error">{error}</p>}
              {success && <p role="status" className="preferences-success"><CheckCircle2 size={16} /> Preferências salvas.</p>}
              <button type="submit" className="button button-primary" disabled={loading || saving}>{loading ? 'Carregando...' : saving ? 'Salvando...' : 'Salvar preferências'}</button>
            </div>
          </form>
        </section>

        <section className="panel" aria-labelledby="integrations-title">
          <div className="panel-heading"><h2 id="integrations-title">Integrações</h2></div>
          <div className="integration-content"><span className="step-icon"><CalendarDays size={23} aria-hidden="true" /></span><h3>Google Calendar</h3>
            {googleLoading ? <p className="connection-label"><LoaderCircle size={15} className="animate-spin" /> Verificando conexão...</p> : googleConnection.connected ? <>
              <span className="connection-label"><span className="status-dot" /> {googleConnection.reauthRequired ? 'Conexão expirada ou revogada.' : 'Conectado'}</span>
              {googleConnection.email && <p>Conectado como: <strong>{googleConnection.email}</strong></p>}
              {googleConnection.connectedAt && <p>Conectado em: {formatDate(googleConnection.connectedAt)}</p>}
              {googleConnection.reauthRequired && <p className="google-warning">Reconecte para autorizar novamente.</p>}
              <div className="google-connection-actions">
                {googleConnection.reauthRequired && <button type="button" className="button button-primary" onClick={connectGoogle} disabled={googleBusy}>{googleBusy ? 'Conectando...' : 'Reconectar'}</button>}
                <button type="button" className="button button-secondary" onClick={() => setConfirmDisconnect(true)} disabled={googleBusy}>Desconectar</button>
              </div>
            </> : <>
              <p>Autorize o EditalTrack a gerenciar eventos do seu calendário Google quando a sincronização estiver disponível.</p>
              <span className="connection-label"><span className="status-dot neutral" /> Não conectado</span>
              <button type="button" className="button button-primary" onClick={connectGoogle} disabled={googleBusy}>{googleBusy ? 'Conectando...' : 'Conectar Google Calendar'}</button>
            </>}
            {googleNotice && <p className="google-notice" role="status">{googleNotice}</p>}
            {googleError && <p className="field-error" role="alert">{googleError}</p>}
          </div>
        </section>
      </div>
      <section className="helper-card" aria-labelledby="account-title"><UserRound size={22} aria-hidden="true" /><div className="min-w-0 flex-1"><h2 id="account-title">Conta</h2><p className="break-words">{typeof name === 'string' ? name : 'Conta EditalTrack'}</p><p className="break-words">{user?.email}</p><SignOutButton /></div></section>
      {confirmDisconnect && <div className="evento-form-overlay" onClick={() => setConfirmDisconnect(false)}><div className="panel google-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="google-disconnect-title" onClick={(event) => event.stopPropagation()}><div className="panel-heading"><h2 id="google-disconnect-title">Desconectar Google Calendar?</h2><button type="button" className="button button-ghost" aria-label="Fechar" onClick={() => setConfirmDisconnect(false)}><X size={18} /></button></div><div className="google-confirm-content"><p>A autorização Google será removida. Seus editais e eventos internos do EditalTrack permanecerão intactos.</p><div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setConfirmDisconnect(false)} disabled={googleBusy}>Cancelar</button><button type="button" className="button button-primary" onClick={confirmGoogleDisconnect} disabled={googleBusy}>{googleBusy ? 'Desconectando...' : 'Confirmar desconexão'}</button></div></div></div></div>}
    </>
  )
}
