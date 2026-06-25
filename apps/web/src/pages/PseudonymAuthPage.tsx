import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { pseudonymousApi } from '@/api/pseudonymous'
import { handleToEmail } from '@/lib/pseudonym'

/**
 * Anmeldung & Wiederherstellung für pseudonyme Konten (/pseudonym). Login per
 * Pseudonym + Passwort (intern synthetische E-Mail). Ohne E-Mail-Reset: das
 * Passwort wird über den Wiederherstellungs-Code zurückgesetzt.
 */
type Mode = 'login' | 'recover'

export default function PseudonymAuthPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)

  if (session) return <Navigate to="/app" replace />

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: handleToEmail(handle), password,
    })
    setLoading(false)
    if (err) { setError('Pseudonym oder Passwort ist nicht korrekt.'); return }
    navigate('/app', { replace: true })
  }

  const recover = useMutation({
    mutationFn: () => pseudonymousApi.recover({
      handle: handle.trim(), recovery_code: recoveryCode, new_password: newPassword,
    }),
    onSuccess: (res) => setNewCode(res.recovery_code),
  })

  const finishRecover = async () => {
    setError(null); setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: handleToEmail(handle), password: newPassword,
    })
    setLoading(false)
    if (err) { setError('Anmeldung nach Wiederherstellung fehlgeschlagen. Bitte normal anmelden.'); return }
    navigate('/app', { replace: true })
  }

  function recoverError(e: unknown): string {
    if (isAxiosError(e)) {
      if (e.response?.status === 401) return 'Pseudonym oder Wiederherstellungs-Code ist nicht korrekt.'
      if (!e.response) return 'Keine Verbindung zum Server.'
    }
    return 'Wiederherstellung fehlgeschlagen. Bitte erneut versuchen.'
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <header className="border-b border-white/[0.07] bg-navy px-6 py-4">
        <Link to="/" className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="card">
            <span className="label mb-2 inline-block">Pseudonyme Anmeldung</span>

            {/* Nach Wiederherstellung: neuen Code sichern */}
            {newCode ? (
              <>
                <h1 className="mb-1 text-xl font-bold text-navy">Passwort geändert</h1>
                <p className="text-sm text-brand-muted">
                  Dein <strong>neuer</strong> Wiederherstellungs-Code (der alte gilt nicht mehr) –
                  notiere ihn sicher:
                </p>
                <p className="my-4 rounded-brand border border-accent/40 bg-accent/[0.05] px-3 py-2 text-center font-mono text-base font-bold tracking-wider text-navy">
                  {newCode}
                </p>
                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
                <button onClick={finishRecover} disabled={loading} className="btn-primary w-full disabled:opacity-50">
                  {loading ? 'Anmeldung läuft …' : 'Weiter zu EchoB'}
                </button>
              </>
            ) : mode === 'login' ? (
              <>
                <h1 className="mb-1 text-xl font-bold text-navy">Mit Pseudonym anmelden</h1>
                <p className="mb-6 text-xs text-brand-muted">
                  Du hast dich über eine Fachperson pseudonym registriert? Melde dich mit deinem
                  Pseudonym und Passwort an.
                </p>
                <form onSubmit={login} className="space-y-4">
                  <Field label="Pseudonym" id="pl-handle" value={handle} onChange={setHandle}
                    placeholder="z. B. blauer_falke" autoCapitalize="none" />
                  <Field label="Passwort" id="pl-pw" type="password" value={password} onChange={setPassword}
                    placeholder="••••••••" autoComplete="current-password" />
                  {error && <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
                  <button type="submit" disabled={loading || !handle.trim() || !password} className="btn-primary w-full disabled:opacity-50">
                    {loading ? 'Anmelden …' : 'Anmelden'}
                  </button>
                </form>
                <button onClick={() => { setMode('recover'); setError(null) }}
                  className="mt-4 text-sm text-accent hover:underline">
                  Passwort vergessen? Mit Wiederherstellungs-Code zurücksetzen
                </button>
              </>
            ) : (
              <>
                <h1 className="mb-1 text-xl font-bold text-navy">Passwort wiederherstellen</h1>
                <p className="mb-6 text-xs text-brand-muted">
                  Gib dein Pseudonym, deinen Wiederherstellungs-Code und ein neues Passwort ein.
                </p>
                <form onSubmit={(e) => { e.preventDefault(); if (handle.trim() && recoveryCode.trim() && newPassword.length >= 8) recover.mutate() }} className="space-y-4">
                  <Field label="Pseudonym" id="pr-handle" value={handle} onChange={setHandle}
                    placeholder="z. B. blauer_falke" autoCapitalize="none" />
                  <Field label="Wiederherstellungs-Code" id="pr-code" value={recoveryCode} onChange={setRecoveryCode}
                    placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" />
                  <Field label="Neues Passwort" id="pr-pw" type="password" value={newPassword} onChange={setNewPassword}
                    placeholder="Mindestens 8 Zeichen" autoComplete="new-password" />
                  {recover.isError && <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{recoverError(recover.error)}</p>}
                  <button type="submit" disabled={recover.isPending || !handle.trim() || !recoveryCode.trim() || newPassword.length < 8} className="btn-primary w-full disabled:opacity-50">
                    {recover.isPending ? 'Wird zurückgesetzt …' : 'Passwort zurücksetzen'}
                  </button>
                </form>
                <button onClick={() => { setMode('login'); setError(null) }}
                  className="mt-4 text-sm text-accent hover:underline">
                  ← Zurück zur Anmeldung
                </button>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-brand-muted">
            Mit E-Mail anmelden?{' '}
            <Link to="/auth" className="text-accent hover:underline">Zur normalen Anmeldung</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

function Field({ label, id, value, onChange, type = 'text', placeholder, autoComplete, autoCapitalize }: {
  label: string; id: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; autoComplete?: string; autoCapitalize?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-brand-text">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete} autoCapitalize={autoCapitalize}
        className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent" />
    </div>
  )
}
