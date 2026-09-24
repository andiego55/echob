/**
 * Eine Szene, aufgeschlagen — aus einer Belegkarte im Fall-FAQ.
 *
 * **Das Problem, das es löst.** Eine Antwort im Fall-FAQ stützt sich auf „Szene 7" und ein
 * Zitat von zehn Worten. Wer wissen will, ob das trägt, musste bisher den Anker anklicken,
 * und damit war er aus der FAQ heraus — in einer langen Szenenliste, und der Gedanke, den
 * er gerade prüfen wollte, war weg. Ein Beleg, dessen Prüfung den Zusammenhang kostet,
 * wird nicht geprüft.
 *
 * **Deshalb ein Fenster und kein Sprung.** Man liest die Szene, schließt sie und ist
 * wieder an derselben Stelle. Der Sprung zur Szene in der Liste steht trotzdem darin —
 * wer dort weiterarbeiten will, kommt hin.
 *
 * **Was hier NICHT steht: eine Zusammenfassung.** Es ist der Text, den die Klient:in
 * geschrieben hat, im Wortlaut. Eine Verdichtung an dieser Stelle wäre die zweite
 * Interpretationsschicht über einer ersten, die gerade überprüft werden soll.
 *
 * **Zurücktaste und Escape schließen.** Ein Fenster über einer Akte, aus dem man nur mit
 * der Maus herauskommt, ist im Gespräch mit einer Klient:in eine Falle.
 */
import { useEffect } from 'react'
import type { Scene } from '@/types'

//: Nur die beiden Stufen, die etwas bedeuten. „none" und „unclear" als Etikett neben
//: einer Szene zu setzen waere Laerm - und „unklar" liest sich wie ein Befund.
const SICHERHEIT: Record<string, string> = {
  elevated: 'Erhöhte Aufmerksamkeit',
  acute: 'Akutes Sicherheitsrisiko',
}

export default function SzeneFenster({ szene, onSchliessen, onZurSzene }: {
  szene: Scene | null
  onSchliessen: () => void
  onZurSzene?: (szene: Scene) => void
}) {
  useEffect(() => {
    if (!szene) return
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') onSchliessen() }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [szene, onSchliessen])

  if (!szene) return null

  const datum = szene.scene_date
    ? new Date(szene.scene_date).toLocaleDateString('de-DE',
        { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Szene ${szene.scene_no ?? ''}: ${szene.title}`}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/30 px-4 py-6 backdrop-blur-[2px] sm:items-center"
      onClick={onSchliessen}
    >
      <div
        className="max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-brand-lg bg-white shadow-brand-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-border px-6 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
              Szene {szene.scene_no ?? '—'}
              {datum && <span className="ml-2 text-brand-muted">{datum}</span>}
            </p>
            <h2 className="mt-1 text-[1.1rem] font-bold leading-snug text-navy">
              {szene.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onSchliessen}
            aria-label="Schließen"
            className="shrink-0 rounded-brand-sm p-1.5 text-brand-muted transition-colors hover:bg-brand-bg hover:text-navy"
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" className="h-4 w-4" aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {szene.description ? (
            <p className="whitespace-pre-wrap text-[0.92rem] leading-relaxed text-brand-text">
              {szene.description}
            </p>
          ) : (
            // Kein Leerzustand ohne Grund: Dass nichts dasteht, kann heissen, dass die
            // Szene knapp erfasst wurde - oder dass dieser Teil nicht freigegeben ist.
            <p className="text-[0.88rem] italic leading-relaxed text-brand-muted">
              Zu dieser Szene liegt kein Beschreibungstext vor.
            </p>
          )}

          {szene.user_reaction && (
            <div className="mt-4 border-l-2 border-accent/40 pl-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">
                Eigene Reaktion
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[0.9rem] leading-relaxed text-brand-text">
                {szene.user_reaction}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {szene.pattern_tags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent"
              >
                {tag}
              </span>
            ))}
            {szene.distress_score !== null && (
              <span className="text-[11px] text-brand-muted">
                Belastung {szene.distress_score}/5
              </span>
            )}
            {szene.safety_level && SICHERHEIT[szene.safety_level] && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                {SICHERHEIT[szene.safety_level]}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border bg-brand-bg/60 px-6 py-3">
          <p className="text-[11px] leading-relaxed text-brand-muted">
            Im Wortlaut, wie die Klient:in es geschrieben hat.
          </p>
          {onZurSzene && (
            <button
              type="button"
              onClick={() => { onZurSzene(szene); onSchliessen() }}
              className="text-[0.82rem] font-semibold text-accent transition-colors hover:underline"
            >
              In der Fallakte öffnen →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
