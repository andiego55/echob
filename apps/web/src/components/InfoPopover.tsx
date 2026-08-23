/**
 * Ein Fragezeichen im Echo-Design – erklärt auf Zuruf, kostet keinen Platz.
 *
 * **Warum es das gibt.** Der Paarraum trug zwei Karten mit reiner Information mit sich:
 * die fünf Grundregeln und den Sicherheitshinweis. Beide sind wichtig, beide stehen
 * dauerhaft da, und beide haben dem eigentlichen Inhalt Platz weggenommen – im Chat sogar
 * eine ganze Spalte. Statische Information verdient keine Spalte.
 *
 * Jetzt: ein Zeichen, das man anfährt oder antippt. Öffnet bei Hover und bei Fokus (also
 * auch per Tastatur), schließt mit Escape und beim Verlassen. Auf Touch-Geräten gibt es
 * kein Hover – deshalb schaltet ein Tippen dieselbe Fläche um.
 *
 * Das Zeichen selbst ist die Echo-Welle mit einem Fragezeichen, kein geliehenes Icon.
*
 * **Lag bis zur Angleichung im Paarraum.** Der Nutzerbereich erklaert viel und hat die
 * Erklaerung dauerhaft auf der Seite stehen — man liest sie einmal und ueberblaettert sie
 * danach fuer immer, Platz kostet sie trotzdem jeden Tag. Weil der Baustein nichts ueber
 * den Paarraum weiss, gehoert er hierher.
 */
import { useEffect, useId, useRef, useState } from 'react'

export default function InfoPopover({
  label, title, children, align = 'right',
}: {
  /** Was das Zeichen erklärt – für Screenreader und als Titel im Panel. */
  label: string
  title?: string
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  const [offen, setOffen] = useState(false)
  const huelle = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!offen) return
    const zu = (e: KeyboardEvent) => { if (e.key === 'Escape') setOffen(false) }
    const daneben = (e: MouseEvent) => {
      if (huelle.current && !huelle.current.contains(e.target as Node)) setOffen(false)
    }
    document.addEventListener('keydown', zu)
    document.addEventListener('mousedown', daneben)
    return () => {
      document.removeEventListener('keydown', zu)
      document.removeEventListener('mousedown', daneben)
    }
  }, [offen])

  return (
    <div
      ref={huelle}
      className="relative inline-block"
      onMouseEnter={() => setOffen(true)}
      onMouseLeave={() => setOffen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={offen}
        aria-controls={id}
        onClick={() => setOffen(o => !o)}
        onFocus={() => setOffen(true)}
        className={`grid h-7 w-7 place-items-center rounded-full border transition-colors ${
          offen
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-brand-border text-brand-muted hover:border-accent/50 hover:text-accent'
        }`}
      >
        {/* Echo-Welle mit Fragezeichen – dasselbe Zeichen wie im Barometer, nur klein. */}
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
          <circle cx="5.5" cy="10" r="2" fill="currentColor" />
          <path d="M9.4 6.6 A 5 5 0 0 1 9.4 13.4" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" />
          <path d="M12.6 4.4 A 8 8 0 0 1 12.6 15.6" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="round" opacity=".5" />
        </svg>
      </button>

      {offen && (
        <div
          id={id}
          role="dialog"
          aria-label={label}
          /* z-[55]: ueber JEDER Leiste, unter jedem Vollbild-Fenster.
             Mit z-30 lag der Popover gleichauf mit der klebenden Paar-Navigation —
             und weil die spaeter im Dokument steht, gewann sie. Der Kasten war halb
             verdeckt, ohne dass an ihm etwas falsch gewesen waere. Leisten gehen bis
             z-50, Vollbild-Fenster beginnen bei z-[60]. */
          className={`absolute top-9 z-[55] w-[min(22rem,calc(100vw-2.5rem))] rounded-brand border border-brand-border bg-white p-4 shadow-brand-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {title && <p className="card-title">{title}</p>}
          <div className={title ? 'mt-2' : ''}>{children}</div>
        </div>
      )}
    </div>
  )
}
