/**
 * Nachfragen, bevor etwas nicht mehr rückgängig zu machen ist.
 *
 * **Was hier vorher stand.** Einundzwanzigmal im Produkt öffnete sich `window.confirm` —
 * der graue Systemdialog des Browsers. Er sieht in jedem Browser anders aus, kennt EchoBs
 * Schrift und Farben nicht, lässt sich nicht gestalten, und er stellt eine Frage („Diese
 * Szene wirklich löschen?"), ohne die Folge zu benennen. Ausgerechnet an den Stellen, an
 * denen es kein Zurück gibt, war das die schwächste Oberfläche im ganzen Produkt.
 *
 * **Warum ein Versprechen statt eines Zustands.** Die naheliegende Bauweise wäre ein
 * Dialog-Baustein, den jede Komponente selbst rendert — das hieße an 21 Stellen je zwei
 * Eingriffe und einen Zustand mehr. Hier hängt der Dialog EINMAL in der App, und die
 * Aufrufstelle bleibt so kurz wie vorher:
 *
 *     if (await bestaetigen({ titel: …, text: …, knopf: … })) loeschen.mutate()
 *
 * **Was der Dialog anders macht als `confirm`:**
 *
 *   * Er benennt die FOLGE, nicht nur die Frage. „Danach kann niemand mehr schreiben"
 *     sagt mehr als „Sind Sie sicher?".
 *   * Der harmlose Knopf hat den Fokus. Wer aus Gewohnheit Enter drückt, bricht ab.
 *   * Escape bricht ab, ein Klick daneben ebenso.
 *   * `role="alertdialog"` und `aria-describedby`, damit Screenreader die Folge mitlesen.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export interface Nachfrage {
  titel: string
  /** Die Folge, nicht die Frage. Was ist danach anders? */
  text?: string
  /** Beschriftung des bestätigenden Knopfs — ein Verb, kein „OK". */
  knopf?: string
  abbrechen?: string
  /** Rot statt Akzentfarbe: für endgültiges Löschen. */
  gefahr?: boolean
}

type Frager = (n: Nachfrage) => Promise<boolean>

const Kontext = createContext<Frager | null>(null)

/**
 * Liefert die Nachfrage-Funktion.
 *
 * Ohne Provider fällt sie bewusst auf `window.confirm` zurück, statt zu werfen: Eine
 * fehlende Umhüllung darf niemals dazu führen, dass eine Löschung ohne Nachfrage durchgeht.
 */
export function useBestaetigen(): Frager {
  const frager = useContext(Kontext)
  return frager ?? (async (n) => window.confirm([n.titel, n.text].filter(Boolean).join('\n\n')))
}

export function BestaetigungProvider({ children }: { children: React.ReactNode }) {
  const [offen, setOffen] = useState<Nachfrage | null>(null)
  const antwort = useRef<((ok: boolean) => void) | null>(null)
  const abbrechenRef = useRef<HTMLButtonElement>(null)

  const fragen = useCallback<Frager>((n) => {
    setOffen(n)
    return new Promise<boolean>(resolve => { antwort.current = resolve })
  }, [])

  const schliessen = useCallback((ok: boolean) => {
    setOffen(null)
    antwort.current?.(ok)
    antwort.current = null
  }, [])

  // Der harmlose Knopf bekommt den Fokus: Wer aus Gewohnheit Enter drückt, bricht ab.
  useEffect(() => {
    if (offen) abbrechenRef.current?.focus()
  }, [offen])

  useEffect(() => {
    if (!offen) return
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') schliessen(false) }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [offen, schliessen])

  return (
    <Kontext.Provider value={fragen}>
      {children}
      {offen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 px-4 py-8 backdrop-blur-[2px]"
          onClick={e => { if (e.target === e.currentTarget) schliessen(false) }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bestaetigung-titel"
            aria-describedby={offen.text ? 'bestaetigung-text' : undefined}
            className="beitrag-neu w-full max-w-[440px] rounded-brand-lg border border-brand-border bg-white p-6 shadow-brand-lg"
          >
            <h2 id="bestaetigung-titel" className="card-title-lg">{offen.titel}</h2>
            {offen.text && (
              <p id="bestaetigung-text" className="mt-2 text-sm leading-relaxed text-brand-muted">
                {offen.text}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <button
                ref={abbrechenRef}
                onClick={() => schliessen(false)}
                className="btn-quiet !py-2 !px-4 !text-sm"
              >
                {offen.abbrechen ?? 'Abbrechen'}
              </button>
              <button
                onClick={() => schliessen(true)}
                className={`btn !py-2 !px-5 !text-sm text-white ${
                  offen.gefahr
                    ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
                    : 'btn-primary'
                }`}
              >
                {offen.knopf ?? 'Ja, weiter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Kontext.Provider>
  )
}
