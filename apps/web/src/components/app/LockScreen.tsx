/**
 * Vollbild-Sperrschicht. Liegt über der gesamten App, wenn die PIN-Sperre aktiv
 * und verriegelt ist. Bietet PIN-Eingabe und Schnell-Verlassen.
 */
import { useState, type FormEvent } from 'react'
import { useLock } from '@/contexts/LockContext'
import { quickExit } from './QuickExit'

export default function LockScreen() {
  const { enabled, locked, unlock } = useLock()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  if (!enabled || !locked) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!pin) return
    setChecking(true)
    const ok = await unlock(pin)
    setChecking(false)
    if (ok) {
      setPin('')
      setError(false)
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy px-6">
      <div className="w-full max-w-xs text-center">
        <div className="text-2xl font-extrabold tracking-[-0.02em] text-white mb-1">
          Echo<span className="text-accent">B</span>
        </div>
        <p className="text-sm text-white/55 mb-7">Gesperrt – bitte PIN eingeben</p>

        <form onSubmit={submit}>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false) }}
            placeholder="••••"
            className="w-full rounded-brand border border-white/20 bg-white/[0.06] px-4 py-3 text-center text-lg tracking-[0.4em] text-white outline-none transition focus:border-accent placeholder:text-white/30"
          />
          {error && <p className="mt-2 text-xs text-red-300">Falsche PIN. Bitte erneut versuchen.</p>}
          <button
            type="submit"
            disabled={checking || !pin}
            className="btn-primary w-full mt-4 disabled:opacity-40"
          >
            {checking ? 'Prüfe …' : 'Entsperren'}
          </button>
        </form>

        <button
          type="button"
          onClick={quickExit}
          className="mt-7 text-xs text-white/45 hover:text-white transition-colors"
          title="Sofort verlassen – oder Esc zweimal drücken"
        >
          ↪ Schnell verlassen
        </button>
      </div>
    </div>
  )
}
