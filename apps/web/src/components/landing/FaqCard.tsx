import { useState } from 'react'

/**
 * Aufklappbare FAQ-Karte im EchoB-Stil – dieselbe Anmutung wie auf der Startseite.
 *
 * Bewusst ein <button> statt <details>: Das Auf- und Zuklappen ist damit über die
 * Tastatur bedienbar und meldet seinen Zustand per aria-expanded, ohne dass wir uns auf
 * das uneinheitliche Verhalten von <summary> verlassen.
 */
export default function FaqCard({
  q, a, defaultOpen = false,
}: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      aria-expanded={open}
      className="card text-left w-full hover:border-accent/40 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[0.98rem] font-semibold text-navy leading-snug">{q}</p>
        <span
          className={`text-accent text-xl leading-none shrink-0 mt-0.5 transition-transform ${open ? 'rotate-45' : ''}`}
          aria-hidden="true"
        >
          +
        </span>
      </div>
      <p className={`text-sm text-brand-muted leading-[1.7] ${open ? 'mt-3 border-t border-brand-border pt-3' : 'hidden'}`}>
        {a}
      </p>
    </button>
  )
}
