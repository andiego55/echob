import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { validatePassword, PASSWORD_HINT } from '@/utils/validatePassword'

/**
 * Einstellungs-Karte: Passwort ändern. Nutzt die aktive Supabase-Session
 * (supabase.auth.updateUser) – die Sitzung bleibt danach gültig.
 */
export default function PasswordCard() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(false)
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setPassword('')
      setConfirm('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg.includes('same as the old') || msg.includes('should be different')
          ? 'Das neue Passwort muss sich vom bisherigen unterscheiden.'
          : msg.includes('at least') || msg.includes('Password')
            ? 'Das Passwort ist zu kurz oder unsicher.'
            : 'Ändern fehlgeschlagen. Bitte erneut versuchen.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 card">
      <h2 className="text-lg font-semibold text-navy">Passwort ändern</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Wähle ein neues Passwort. Du bleibst angemeldet; beim nächsten Login gilt das neue Passwort.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 max-w-sm space-y-4">
        <div>
          <label htmlFor="pw-new" className="mb-1.5 block text-sm font-medium text-brand-text">Neues Passwort</label>
          <input
            id="pw-new" type="password" required autoComplete="new-password"
            value={password} onChange={(e) => { setPassword(e.target.value); setDone(false) }}
            placeholder="Neues Passwort"
            className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <p className="mt-1 text-[11px] text-brand-muted">{PASSWORD_HINT}</p>
        </div>
        <div>
          <label htmlFor="pw-confirm" className="mb-1.5 block text-sm font-medium text-brand-text">Passwort bestätigen</label>
          <input
            id="pw-confirm" type="password" required autoComplete="new-password"
            value={confirm} onChange={(e) => { setConfirm(e.target.value); setDone(false) }}
            placeholder="Passwort wiederholen"
            className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit" disabled={submitting || !password || !confirm}
            className="text-sm font-semibold px-4 py-2 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? 'Wird geändert …' : 'Passwort ändern'}
          </button>
          {done && <span className="text-sm text-green-700">Passwort geändert ✓</span>}
        </div>
      </form>
    </div>
  )
}
