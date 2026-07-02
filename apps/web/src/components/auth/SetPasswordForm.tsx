import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Passwort-festlegen-Formular für eingeladene Nutzer (und Passwort-Reset).
 * Setzt das Passwort, entfernt den `needs_password`-Marker aus den Metadaten
 * und leitet je nach `pending_role` in den Fachpersonen-Bereich (sonst App).
 */
export default function SetPasswordForm({ variant = 'invite' }: { variant?: 'invite' | 'recovery' }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pendingRole = session?.user?.user_metadata?.pending_role
  const dest = pendingRole === 'professional' ? '/professional/register' : '/app'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen haben.'); return }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return }
    setSubmitting(true)
    try {
      // needs_password bewusst zurücksetzen → OnboardingGate schließt sich.
      const { error } = await supabase.auth.updateUser({ password, data: { needs_password: false } })
      if (error) throw error
      navigate(dest, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg.includes('at least') || msg.includes('Password')
          ? 'Das Passwort ist zu kurz oder unsicher.'
          : 'Speichern fehlgeschlagen. Bitte erneut versuchen.',
      )
      setSubmitting(false)
    }
  }

  const heading = variant === 'recovery' ? 'Neues Passwort festlegen' : 'Zugang aktivieren'
  const intro =
    variant === 'recovery'
      ? 'Wähle ein neues Passwort für deinen Zugang.'
      : 'Lege ein Passwort fest, um deinen Zugang zu aktivieren. Damit meldest du dich künftig an.'

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-navy">{heading}</h1>
      <p className="mb-6 text-xs text-brand-muted">{intro}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="np-1" className="mb-1.5 block text-sm font-medium text-brand-text">Passwort</label>
          <input
            id="np-1" type="password" required autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindestens 8 Zeichen"
            className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label htmlFor="np-2" className="mb-1.5 block text-sm font-medium text-brand-text">Passwort bestätigen</label>
          <input
            id="np-2" type="password" required autoComplete="new-password"
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
          {submitting ? 'Bitte warten …' : variant === 'recovery' ? 'Passwort speichern' : 'Zugang aktivieren'}
        </button>
      </form>
    </>
  )
}
