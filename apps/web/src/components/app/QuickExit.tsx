/**
 * Schnell-Verlassen ("Quick Exit"): verlässt EchoB sofort auf eine neutrale Seite.
 * Standard-Schutzmuster, wenn jemand unbeobachtet sein muss.
 * Auslöser: sichtbarer Button oder Escape zweimal kurz hintereinander.
 */
import { useEffect } from 'react'

const QUICK_EXIT_URL = 'https://www.wetter.com'

/** Verlässt die Seite sofort und ersetzt den History-Eintrag (Zurück kehrt nicht zurück). */
export function quickExit() {
  try {
    window.location.replace(QUICK_EXIT_URL)
  } catch {
    window.location.href = QUICK_EXIT_URL
  }
}

/** Globaler Hotkey: Escape zweimal innerhalb 600 ms → sofort verlassen. */
export function QuickExitHotkey() {
  useEffect(() => {
    let last = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const now = Date.now()
      if (now - last < 600) quickExit()
      last = now
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}

export default function QuickExitButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={quickExit}
      title="Sofort verlassen – oder Esc zweimal drücken"
      className={`inline-flex items-center gap-1 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white/70 hover:border-red-500 hover:bg-red-600 hover:text-white transition-colors ${className}`}
    >
      ↪ Verlassen
    </button>
  )
}
