/**
 * Entwürfe: Was jemand geschrieben hat, soll nicht verschwinden.
 *
 * **Das Problem.** Im ganzen Frontend gab es kein `beforeunload`, keinen Blocker und keinen
 * zwischengespeicherten Entwurf. Jemand schreibt eine Szene über etwas, das wehtut — ein
 * versehentliches Zurückwischen, ein Tab, den das Telefon aufräumt, und alles ist weg. Bei
 * einer Bestellmaske wäre das ärgerlich; hier ist es die Bitte, es noch einmal zu schreiben.
 *
 * **Warum Entwürfe und kein Blocker.** Die naheliegende Lösung wäre `useBlocker` aus
 * react-router — den gibt es aber nur in Data-Routern, und die App benutzt `<BrowserRouter>`.
 * Ein Entwurf ist ohnehin die bessere Antwort: Ein Blocker fragt „wirklich weg?", ein
 * Entwurf macht die Frage überflüssig. Für den einen Fall, den er nicht abdeckt — Tab
 * schließen, Seite neu laden —, hängt zusätzlich ein `beforeunload` daran.
 *
 * **Wiederherstellen wird ANGEBOTEN, nie automatisch getan.** Ein Formular, das sich beim
 * Öffnen von selbst mit altem Text füllt, ist schlimmer als ein leeres: Man merkt es
 * womöglich nicht und schickt etwas ab, das man so nicht schreiben wollte.
 *
 * **Zum Datenschutz.** Hier landet persönlicher Text unverschlüsselt im Browser-Speicher.
 * Das ist eine bewusste Abwägung: Der Text steht ohnehin gerade sichtbar auf dem Schirm,
 * und der Schutz vor dem Verlust wiegt hier schwerer. Damit er nicht bleibt, räumt
 * `alleEntwuerfeLoeschen()` beim Abmelden auf, und jeder Entwurf verfällt nach sieben Tagen
 * von selbst.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const PRAEFIX = 'echob.entwurf.'
const HALTBARKEIT_MS = 7 * 24 * 60 * 60 * 1000
const WARTEN_MS = 600

/**
 * Beim Schnellausstieg darf NICHTS mehr nachfragen.
 *
 * `beforeunload` blendet einen Browser-Dialog ein („Änderungen werden nicht gespeichert").
 * Genau das wäre hier gefährlich: Der Schnellausstieg existiert für jemanden, der gerade
 * unbeobachtet sein muss, und ein Dialog hält den Bildschirm mit EchoB darauf offen, bis
 * jemand ihn wegklickt. Der Schutz vor dem Verlust einer Notiz wiegt in diesem Moment
 * nichts gegen den Schutz der Person.
 */
let fluchtLaeuft = false

/** Von `quickExit()` gerufen: Nachfragen aus, Entwürfe weg. */
export function fluchtVorbereiten(): void {
  fluchtLaeuft = true
  alleEntwuerfeLoeschen()
}

interface Ablage<T> { gespeichert: number; wert: T }

/** Beim Abmelden und beim Schnellausstieg: alles weg, was jemand hier liegen ließ. */
export function alleEntwuerfeLoeschen(): void {
  try {
    const weg: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PRAEFIX)) weg.push(k)
    }
    for (const k of weg) localStorage.removeItem(k)
  } catch { /* Komfort, kein Muss */ }
}

function lesen<T>(schluessel: string): T | null {
  try {
    const roh = localStorage.getItem(PRAEFIX + schluessel)
    if (!roh) return null
    const a = JSON.parse(roh) as Ablage<T>
    if (!a?.gespeichert || Date.now() - a.gespeichert > HALTBARKEIT_MS) {
      localStorage.removeItem(PRAEFIX + schluessel)
      return null
    }
    return a.wert
  } catch { return null }
}

export interface Entwurf<T> {
  /** Ein liegengebliebener Entwurf, den die Person noch nicht gesehen hat. */
  gefunden: T | null
  /** Wie alt er ist – gehört in den Hinweis, damit klar ist, worum es geht. */
  alter: string | null
  /** Nach dem Übernehmen oder Verwerfen: Hinweis weg. */
  verwerfen: () => void
  /** Nach erfolgreichem Speichern: der Entwurf hat seine Aufgabe erfüllt. */
  loeschen: () => void
}

/**
 * Hält `wert` im Browser fest und meldet einen liegengebliebenen Entwurf.
 *
 * `istLeer` entscheidet, was überhaupt speicherwürdig ist — ohne diese Frage würde jedes
 * geöffnete Formular sofort einen leeren Entwurf anlegen und beim nächsten Mal anbieten.
 *
 * @param schluessel Eindeutig je Formular UND Bezug, etwa `szene-neu:<fallId>`.
 *                   `null` schaltet alles ab (etwa solange die Id noch fehlt).
 */
export function useEntwurf<T>(
  schluessel: string | null,
  wert: T,
  istLeer: (w: T) => boolean,
): Entwurf<T> {
  // Nur beim ersten Rendern nachsehen: Wer gerade tippt, soll nicht sein eigenes
  // Geschriebenes als „liegengebliebenen Entwurf" angeboten bekommen.
  const [gefunden, setGefunden] = useState<T | null>(() =>
    schluessel ? lesen<T>(schluessel) : null)
  const [alter] = useState<string | null>(() => {
    if (!schluessel) return null
    try {
      const roh = localStorage.getItem(PRAEFIX + schluessel)
      if (!roh) return null
      return alterAlsText((JSON.parse(roh) as Ablage<T>).gespeichert)
    } catch { return null }
  })

  const leer = useRef(istLeer)
  leer.current = istLeer

  useEffect(() => {
    if (!schluessel) return
    if (leer.current(wert)) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(PRAEFIX + schluessel,
          JSON.stringify({ gespeichert: Date.now(), wert } satisfies Ablage<T>))
      } catch { /* voller Speicher – dann eben nicht */ }
    }, WARTEN_MS)
    return () => clearTimeout(t)
  }, [schluessel, wert])

  // Deckt den einen Fall ab, den der Entwurf nicht abdecken kann: Tab schließen oder neu
  // laden, bevor die Wartezeit abgelaufen ist.
  useEffect(() => {
    if (!schluessel) return
    const fragen = (e: BeforeUnloadEvent) => {
      if (fluchtLaeuft || leer.current(wert)) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', fragen)
    return () => window.removeEventListener('beforeunload', fragen)
  }, [schluessel, wert])

  const loeschen = useCallback(() => {
    if (!schluessel) return
    try { localStorage.removeItem(PRAEFIX + schluessel) } catch { /* egal */ }
    setGefunden(null)
  }, [schluessel])

  return { gefunden, alter, verwerfen: () => setGefunden(null), loeschen }
}

function alterAlsText(zeitpunkt: number): string {
  const min = Math.round((Date.now() - zeitpunkt) / 60000)
  if (min < 2) return 'gerade eben'
  if (min < 60) return `vor ${min} Minuten`
  const std = Math.round(min / 60)
  if (std < 24) return `vor ${std} ${std === 1 ? 'Stunde' : 'Stunden'}`
  const tage = Math.round(std / 24)
  return `vor ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`
}
