import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Link } from 'react-router-dom'

type Tab    = 'login' | 'signup'
type Method = 'password' | 'magic'

export default function AuthPage() {
  const { session } = useAuth()
  const location    = useLocation()
  const fromLoc     = (location.state as { from?: Location })?.from
  const from        = fromLoc ? `${fromLoc.pathname}${(fromLoc as Location & { search?: string }).search ?? ''}` : '/app'

  const [tab, setTab]         = useState<Tab>('login')
  const [method, setMethod]   = useState<Method>('password')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Bereits eingeloggt → weiterleiten
  if (session) return <Navigate to={from} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
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
            <h1 className="mb-6 text-xl font-bold text-navy">
              {tab === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
            </h1>

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
                  placeholder="du@beispiel.de"
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

          <p className="mt-6 text-center text-xs text-brand-muted">
            <Link to="/datenschutz" className="hover:underline">Datenschutz</Link>
            {' · '}
            <Link to="/impressum" className="hover:underline">Impressum</Link>
          </p>
        </div>
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
