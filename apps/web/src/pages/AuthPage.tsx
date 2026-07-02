import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { setPendingInvite } from '@/lib/pendingInvite'

type Tab    = 'login' | 'signup'
type Method = 'password' | 'magic'

export default function AuthPage() {
  const { session } = useAuth()
  const location    = useLocation()
  const [searchParams] = useSearchParams()
  const role        = searchParams.get('role')
  const isPro       = role === 'professional'
  const fromLoc     = (location.state as { from?: Location })?.from
  const defaultDest = role === 'professional' ? '/professional/register' : '/app'
  const from        = fromLoc ? `${fromLoc.pathname}${(fromLoc as Location & { search?: string }).search ?? ''}` : defaultDest

  const defaultTab = (location.state as { defaultTab?: Tab } | null)?.defaultTab ?? (role === 'professional' ? 'signup' : 'login')
  const [tab, setTab]         = useState<Tab>(defaultTab)
  const [method, setMethod]   = useState<Method>('password')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Optionalen Einladungscode merken (wird nach Login von PendingInviteHandler eingelöst).
  const persistInviteCode = () => {
    const code = inviteCode.trim()
    if (code && !isPro) setPendingInvite({ code })
  }

  // Supabase-Callback (Einladung / Passwort-Reset): die Tokens stehen im URL-Hash.
  // Einmalig beim Mounten auslesen – bevor der Client den Hash abräumt.
  const callbackType = useMemo<'invite' | 'recovery' | null>(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get('type')
    return t === 'invite' || t === 'recovery' ? t : null
  }, [])

  // Eingeladene Nutzer (und Passwort-Reset) haben noch kein Passwort → eigener Schritt.
  if (callbackType) return <CompleteInvite isPro={isPro} callbackType={callbackType} />

  // Bereits eingeloggt → weiterleiten
  if (session) return <Navigate to={from} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    persistInviteCode()

    try {
      if (method === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) throw error
        setMessage({ type: 'success', text: 'Magic Link gesendet – prüfe dein Postfach.' })
        return
      }

      if (tab === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ type: 'success', text: 'Bestätigungsmail gesendet – prüfe dein Postfach.' })
        return
      }

      // Login
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // Erfolg → AuthContext reagiert automatisch → Navigate greift
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
      setMessage({ type: 'error', text: translateError(msg) })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    persistInviteCode()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${from}` },
    })
    if (error) {
      setMessage({ type: 'error', text: 'Google-Login fehlgeschlagen.' })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Mini-Header */}
      <header className="bg-navy border-b border-white/[0.07] px-6 py-4">
        <Link to="/" className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Tab-Switcher */}
          <div className="mb-8 flex rounded-brand border border-brand-border bg-white overflow-hidden">
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setMessage(null) }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'bg-navy text-white'
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                {t === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          <div className="card">
            {isPro && <span className="label mb-2 inline-block">Für Fachpersonen</span>}
            <h1 className="mb-1 text-xl font-bold text-navy">
              {tab === 'login'
                ? 'Willkommen zurück'
                : isPro ? 'Als Fachperson registrieren' : 'Kostenlos 3 Tage testen'}
            </h1>
            {tab === 'signup' && (
              <p className="text-xs text-brand-muted mb-6">
                {isPro
                  ? 'Sie sehen ausschließlich von Klient:innen ausdrücklich freigegebene Inhalte.'
                  : 'Keine Kreditkarte · Keine Bindung · Jederzeit aufhören'}
              </p>
            )}
            {tab === 'login' && <div className="mb-6" />}

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm font-medium text-brand-text hover:bg-brand-bg transition-colors disabled:opacity-50"
            >
              <GoogleIcon />
              Mit Google {tab === 'login' ? 'anmelden' : 'registrieren'}
            </button>

            <div className="relative mb-4 flex items-center">
              <div className="flex-1 border-t border-brand-border" />
              <span className="mx-3 text-xs text-brand-muted">oder</span>
              <div className="flex-1 border-t border-brand-border" />
            </div>

            {/* Method Toggle (nur bei Login) */}
            {tab === 'login' && (
              <div className="mb-4 flex gap-2">
                {(['password', 'magic'] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMethod(m); setMessage(null) }}
                    className={`flex-1 rounded-brand border py-2 text-xs font-medium transition-all ${
                      method === m
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-brand-border text-brand-muted hover:border-accent/40'
                    }`}
                  >
                    {m === 'password' ? '🔑 Passwort' : '✉️ Magic Link'}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-brand-text">
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isPro ? 'name@praxis.de' : 'du@beispiel.de'}
                  className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {(tab === 'signup' || method === 'password') && (
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-brand-text">
                    Passwort
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'signup' ? 'Mindestens 6 Zeichen' : '••••••••'}
                    className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}

              {!isPro && (
                <div>
                  <label htmlFor="invite-code" className="mb-1.5 block text-sm font-medium text-brand-text">
                    Einladungscode <span className="font-normal text-brand-muted">(optional)</span>
                  </label>
                  <input
                    id="invite-code"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="z. B. ABCD-1234"
                    autoCapitalize="characters"
                    className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm uppercase tracking-wider text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <p className="mt-1 text-[11px] text-brand-muted">
                    Von einer Fachperson erhalten? Eintragen, um direkt verbunden zu werden.
                  </p>
                </div>
              )}

              {message && (
                <p
                  role={message.type === 'error' ? 'alert' : 'status'}
                  aria-live={message.type === 'error' ? 'assertive' : 'polite'}
                  className={`rounded-brand border px-4 py-2.5 text-sm ${
                    message.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Bitte warten…' : getSubmitLabel(tab, method)}
              </button>
            </form>
          </div>

          {!isPro && (
            <p className="mt-6 text-center text-xs text-brand-muted">
              Von einer Fachperson eingeladen?{' '}
              <Link to="/pseudonym" className="text-accent hover:underline">Mit Pseudonym anmelden</Link>
            </p>
          )}

          <p className="mt-3 text-center text-xs text-brand-muted">
            <Link to="/datenschutz" className="hover:underline">Datenschutz</Link>
            {' · '}
            <Link to="/impressum" className="hover:underline">Impressum</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

// ── Einladungs-/Reset-Callback ──────────────────────────────────────────────

/**
 * Verarbeitet den Supabase-Callback aus einer Einladungs- oder Passwort-Reset-
 * Mail. Die Session-Tokens stehen im URL-Hash (`#access_token=…&type=invite`).
 * Wir setzen die Session explizit (unabhängig von detectSessionInUrl), räumen
 * den Hash aus der Adresszeile und lassen die Person ein Passwort festlegen.
 */
function CompleteInvite({
  isPro, callbackType,
}: { isPro: boolean; callbackType: 'invite' | 'recovery' }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'establishing' | 'ready' | 'invalid'>('establishing')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dest = isPro ? '/professional/register' : '/app'

  // Session aus den Hash-Tokens etablieren (einmalig beim Mounten).
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1))
    const access_token = h.get('access_token')
    const refresh_token = h.get('refresh_token')

    const cleanHash = () =>
      window.history.replaceState(null, '', window.location.pathname + window.location.search)

    if (!access_token || !refresh_token) {
      // Kein Token im Hash – prüfen, ob schon eine Session besteht.
      supabase.auth.getSession().then(({ data }) => setPhase(data.session ? 'ready' : 'invalid'))
      return
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) { setPhase('invalid'); return }
        cleanHash()
        setPhase('ready')
      })
      .catch(() => setPhase('invalid'))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen haben.'); return }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      navigate(dest, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? translateError(err.message) : 'Speichern fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  const title = callbackType === 'recovery' ? 'Neues Passwort festlegen' : 'Zugang aktivieren'
  const intro =
    callbackType === 'recovery'
      ? 'Wähle ein neues Passwort für deinen Zugang.'
      : 'Willkommen bei EchoB. Lege ein Passwort fest, um deinen Zugang zu aktivieren.'

  return (
    <AuthShell>
      {isPro && <span className="label mb-2 inline-block">Für Fachpersonen</span>}
      <h1 className="mb-1 text-xl font-bold text-navy">{title}</h1>
      <p className="mb-6 text-xs text-brand-muted">{intro}</p>

      {phase === 'establishing' && (
        <p className="text-sm text-brand-muted">Einladung wird geprüft …</p>
      )}

      {phase === 'invalid' && (
        <div className="space-y-4">
          <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            Dieser Link ist ungültig oder abgelaufen. Bitte fordere eine neue Einladung an.
          </p>
          <Link to={isPro ? '/auth?role=professional' : '/auth'} className="btn-primary inline-block">
            Zur Anmeldung
          </Link>
        </div>
      )}

      {phase === 'ready' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-brand-text">
              Passwort
            </label>
            <input
              id="new-password" type="password" required autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-brand-text">
              Passwort bestätigen
            </label>
            <input
              id="confirm-password" type="password" required autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Passwort wiederholen"
              className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Bitte warten …' : callbackType === 'recovery' ? 'Passwort speichern' : 'Zugang aktivieren'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-navy border-b border-white/[0.07] px-6 py-4">
        <Link to="/" className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md card">{children}</div>
      </main>
    </div>
  )
}

// ── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getSubmitLabel(tab: Tab, method: Method): string {
  if (tab === 'signup')           return 'Konto erstellen'
  if (method === 'magic')         return 'Magic Link senden'
  return 'Anmelden'
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-Mail oder Passwort ist falsch.'
  if (msg.includes('Email not confirmed'))        return 'Bitte bestätige zuerst deine E-Mail.'
  if (msg.includes('User already registered'))    return 'Diese E-Mail ist bereits registriert.'
  if (msg.includes('Password should be'))         return 'Das Passwort muss mindestens 6 Zeichen haben.'
  return msg
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
