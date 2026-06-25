import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { supabase } from '@/lib/supabase'
import { pseudonymousApi, type PseudonymousRegisterResult } from '@/api/pseudonymous'
import { isValidHandle } from '@/lib/pseudonym'
import { clearPendingInvite } from '@/lib/pendingInvite'

/**
 * Pseudonyme Anmeldung über eine gültige Einladung: Pseudonym + Passwort, ohne
 * echte E-Mail. Nach dem Anlegen wird der einmalige Wiederherstellungs-Code
 * angezeigt (ohne ihn gibt es keinen Zugang zurück), danach automatischer Login.
 */
function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const s = error.response?.status
    if (s === 409) {
      const d = error.response?.data?.detail
      return typeof d === 'string' ? d : 'Pseudonym vergeben oder Einladung bereits verwendet.'
    }
    if (s === 404) return 'Einladung nicht gefunden.'
    if (s === 410) return 'Diese Einladung ist abgelaufen.'
    if (s === 422) return 'Pseudonym ungültig (3–30 Zeichen: a–z, 0–9, . _ -).'
    if (!error.response) return 'Keine Verbindung zum Server. Bitte später erneut versuchen.'
  }
  return 'Konto konnte nicht angelegt werden. Bitte erneut versuchen.'
}

export default function PseudonymousSignup({ token }: { token: string }) {
  const navigate = useNavigate()
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [result, setResult] = useState<PseudonymousRegisterResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const valid = isValidHandle(handle) && password.length >= 8 && password === password2

  const register = useMutation({
    mutationFn: () => pseudonymousApi.register({ token, handle: handle.trim(), password }),
    onSuccess: (res) => setResult(res),
  })

  const finish = async () => {
    if (!result) return
    setLoginError(null); setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: result.login_email, password,
    })
    setLoggingIn(false)
    if (error) {
      setLoginError(
        'Konto angelegt, aber automatische Anmeldung fehlgeschlagen. Melde dich mit Pseudonym und Passwort an.',
      )
      return
    }
    clearPendingInvite()
    navigate('/app', { replace: true })
  }

  // ── Schritt 2: Wiederherstellungs-Code sichern, dann Login ──────────────────
  if (result) {
    return (
      <div className="rounded-brand border border-accent/40 bg-accent/[0.04] p-5 text-left">
        <p className="text-sm font-semibold text-navy">✓ Pseudonymes Konto angelegt</p>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Es gibt <strong>keine E-Mail</strong> zur Wiederherstellung. Notiere dir diese drei Dinge
          jetzt sicher – ohne sie kommst du nicht mehr in dein Konto:
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3 rounded-brand border border-brand-border bg-white px-3 py-2">
            <dt className="text-brand-muted">Pseudonym</dt>
            <dd className="font-mono font-semibold text-navy">{handle.trim().toLowerCase()}</dd>
          </div>
          <div className="flex justify-between gap-3 rounded-brand border border-brand-border bg-white px-3 py-2">
            <dt className="text-brand-muted">Passwort</dt>
            <dd className="text-navy">dein gewähltes Passwort</dd>
          </div>
          <div className="rounded-brand border border-accent/40 bg-white px-3 py-2">
            <dt className="text-brand-muted">Wiederherstellungs-Code</dt>
            <dd className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-base font-bold tracking-wider text-navy">{result.recovery_code}</span>
              <button type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(result.recovery_code); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* noop */ }
                }}
                className="shrink-0 rounded-brand border border-brand-border px-2.5 py-1 text-xs font-medium text-brand-text hover:border-accent/50 hover:text-accent">
                {copied ? '✓ Kopiert' : 'Kopieren'}
              </button>
            </dd>
          </div>
        </dl>

        <label className="mt-4 flex items-start gap-2.5 text-sm text-brand-text">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
          Ich habe Pseudonym, Passwort und Wiederherstellungs-Code sicher notiert.
        </label>

        {loginError && <p className="mt-3 text-sm text-red-600">{loginError}{' '}
          <Link to="/pseudonym" className="underline">Zur Anmeldung</Link></p>}

        <button onClick={finish} disabled={!saved || loggingIn}
          className="btn-primary mt-4 w-full disabled:opacity-50">
          {loggingIn ? 'Anmeldung läuft …' : 'Weiter zu EchoB'}
        </button>
      </div>
    )
  }

  // ── Schritt 1: Pseudonym + Passwort wählen ──────────────────────────────────
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) register.mutate() }}
      className="rounded-brand border border-brand-border bg-white p-5 text-left">
      <p className="text-sm font-semibold text-navy">Pseudonym beitreten – ohne deine E-Mail</p>
      <p className="mt-1 mb-4 text-xs leading-relaxed text-brand-muted">
        EchoB speichert dann keinen Klarnamen. Nur deine Fachperson kennt dich. Hinweis: Das ist
        pseudonyme, keine vollständig anonyme Nutzung – die Inhalte bleiben geschützt, aber
        personenbezogen.
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="ps-handle" className="mb-1 block text-xs font-medium text-brand-text">Pseudonym</label>
          <input id="ps-handle" value={handle} onChange={(e) => setHandle(e.target.value)}
            autoCapitalize="none" placeholder="z. B. blauer_falke"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent" />
          <p className="mt-1 text-[11px] text-brand-muted">3–30 Zeichen: a–z, 0–9, Punkt, Unterstrich, Bindestrich. Wähle etwas, das dich nicht verrät.</p>
        </div>
        <div>
          <label htmlFor="ps-pw" className="mb-1 block text-xs font-medium text-brand-text">Passwort</label>
          <input id="ps-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" placeholder="Mindestens 8 Zeichen"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent" />
        </div>
        <div>
          <label htmlFor="ps-pw2" className="mb-1 block text-xs font-medium text-brand-text">Passwort bestätigen</label>
          <input id="ps-pw2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password" placeholder="Passwort wiederholen"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent" />
          {password2.length > 0 && password !== password2 && (
            <p className="mt-1 text-[11px] text-red-600">Die Passwörter stimmen nicht überein.</p>
          )}
        </div>
      </div>

      {register.isError && <p className="mt-3 text-sm text-red-600">{errorMessage(register.error)}</p>}

      <button type="submit" disabled={!valid || register.isPending}
        className="btn-primary mt-4 w-full disabled:opacity-50">
        {register.isPending ? 'Wird angelegt …' : 'Pseudonym anlegen'}
      </button>
    </form>
  )
}
