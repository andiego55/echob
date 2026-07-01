/**
 * Entwicklungsphasen-Hinweis: erscheint beim ersten Aufruf der Seite
 * und nach jedem neuen Browser-Start (sessionStorage), bis er bestätigt wird.
 */
import { useState } from 'react'

const STORAGE_KEY = 'echob_dev_notice_v1'

export default function DevNoticeModal() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'dismissed'
    } catch {
      return true
    }
  })

  if (!visible) return null

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, 'dismissed') } catch { /* egal */ }
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">
            🚧
          </span>
          <h2 className="text-lg font-bold text-navy leading-snug">
            EchoB befindet sich im Aufbau
          </h2>
        </div>

        <p className="text-sm text-brand-muted leading-relaxed mb-3">
          Diese Plattform ist in der <strong className="text-navy">Entwicklungsphase</strong>.
          Du kannst alles ausprobieren – aber bitte:
        </p>

        <ul className="space-y-2 mb-4">
          <li className="flex gap-2 text-sm text-brand-muted">
            <span className="text-amber-500 font-bold flex-shrink-0">!</span>
            <span><strong className="text-navy">Keine Klarnamen und keine echten Daten Dritter</strong> – auch nicht von der anderen Person. Nutze Pseudonyme und verfremdete Beispiele statt realer Namen, Orte oder Kontaktdaten.</span>
          </li>
          <li className="flex gap-2 text-sm text-brand-muted">
            <span className="text-amber-500 font-bold flex-shrink-0">!</span>
            <span>Daten können während der Entwicklung jederzeit zurückgesetzt werden.</span>
          </li>
          <li className="flex gap-2 text-sm text-brand-muted">
            <span className="text-amber-500 font-bold flex-shrink-0">!</span>
            <span>Funktionen können sich ändern oder zeitweise nicht verfügbar sein.</span>
          </li>
        </ul>

        <p className="text-xs text-brand-muted/80 mb-5">
          Fragen oder Feedback? <a href="mailto:kontakt@echo-b.de" className="text-accent font-medium">kontakt@echo-b.de</a>
        </p>

        <button onClick={dismiss} className="btn-primary w-full">
          Verstanden – weiter zur Seite
        </button>
      </div>
    </div>
  )
}
