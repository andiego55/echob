/**
 * Die Eingabeform „Reihung" — was zuerst, was danach.
 *
 * **Die Reihenfolge ist die Aussage, nicht die Sortierung einer Liste.** Im Notfallplan
 * heißt das „der Reihe nach, und das Erste soll leicht sein"; in der Traumbeziehung heißt
 * es „was im Zweifel vorgeht". Beide Male ist die Ordnung das, was ein Mensch selbst nicht
 * ohne Hilfe hinschreibt — er hat eine Menge von Dingen im Kopf, keine Liste.
 *
 * **Immer ein Abschluss, nie ein Zugang.** Man ordnet, was schon gewählt wurde. Eine
 * Reihung als ersten Schritt zu zeigen hieße, jemanden nach der Rangfolge von Dingen zu
 * fragen, die er noch gar nicht benannt hat.
 *
 * **Warum Pfeile und kein Ziehen.** Drag-and-drop sieht besser aus und ist am Telefon
 * unbedienbar: Man trifft daneben, die Liste scrollt weg, und wer die Hand nicht ruhig hat,
 * kann es gar nicht. Zwei Pfeile kann jeder — mit dem Finger, mit der Tastatur und mit
 * einem Vorlesewerkzeug. Die Bewegung wird animiert, damit man sieht, was passiert ist.
 *
 * **Entstanden aus `KrisenplanPage`** (25.09.2026), und nur zur Hälfte von dort geholt:
 * Der Notfallplan ordnet Zeilen, die man noch TIPPT, diese Form ordnet Dinge, die schon
 * gewählt sind. Eine Komponente für beides bräuchte einen Schalter, und ein Schalter in
 * einer Eingabeform ist der Anfang von zwei Formen in einer Datei. Geteilt sind deshalb
 * `verschoben` und `Pfeil` — die benutzt der Notfallplan von hier aus mit.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'

export interface ReihungsPunkt {
  key: string
  label: string
  /** Optionaler Zusatz rechts — etwa ein Gewicht oder eine Zahl. */
  beiwerk?: ReactNode
}

/**
 * Verschiebt einen Eintrag um eine Stelle. Rein und getestet — die Seite, die sie benutzt,
 * muss sich über Randfälle keine Gedanken machen.
 */
export function verschoben<T>(liste: T[], von: number, richtung: 'hoch' | 'runter'): T[] {
  const nach = richtung === 'hoch' ? von - 1 : von + 1
  if (von < 0 || von >= liste.length || nach < 0 || nach >= liste.length) return liste
  const kopie = [...liste]
  ;[kopie[von], kopie[nach]] = [kopie[nach], kopie[von]]
  return kopie
}

export default function Reihung({
  punkte, onAendern, leerText,
}: {
  punkte: ReihungsPunkt[]
  onAendern: (keys: string[]) => void
  /** Was dasteht, solange nichts zu ordnen ist. */
  leerText?: string
}) {
  // Welcher Eintrag sich zuletzt bewegt hat.
  //
  // **Warum das Zustand braucht und keine CSS-Klasse genuegt.** Beim Umsortieren bleiben
  // die React-Schluessel gleich, die Zeile wird also nicht neu gebaut - eine Animation auf
  // dem Element feuert nie. Ohne Rueckmeldung sieht ein Klick auf den Pfeil aus wie nichts,
  // besonders auf dem Telefon, wo der Finger die Zeile verdeckt.
  const [zuletzt, setZuletzt] = useState<string | null>(null)

  const bewegen = (i: number, richtung: 'hoch' | 'runter') => {
    const neu = verschoben(punkte, i, richtung)
    if (neu === punkte) return
    setZuletzt(punkte[i].key)
    onAendern(neu.map(p => p.key))
  }

  if (punkte.length === 0) {
    return leerText ? <p className="text-sm text-brand-muted">{leerText}</p> : null
  }

  return (
    <ol className="space-y-2">
      {punkte.map((p, i) => (
        <li
          key={p.key}
          className={`flex items-center gap-3 rounded-brand border bg-white px-3.5 py-2.5 transition-colors ${
            p.key === zuletzt ? 'kompass-bewegt border-accent/50' : 'border-brand-border'
          }`}
        >
          {/* Die Nummer ist der Inhalt, nicht die Verzierung: Sie ist das, was sich ändert. */}
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 text-[0.8rem] font-bold tabular-nums text-accent">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 text-sm leading-snug text-brand-text">{p.label}</span>
          {p.beiwerk}
          {punkte.length > 1 && (
            <span className="flex shrink-0 flex-col">
              <Pfeil richtung="hoch" aus={i === 0}
                label={`${p.label} nach oben`} onKlick={() => bewegen(i, 'hoch')} />
              <Pfeil richtung="runter" aus={i === punkte.length - 1}
                label={`${p.label} nach unten`} onKlick={() => bewegen(i, 'runter')} />
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

/**
 * Eine Stelle nach oben oder unten.
 *
 * Klein und ohne Farbe: Es ist kein Vorgang, sondern eine Korrektur. Ausgeschaltet am Rand
 * statt zu verschwinden — sonst springen die übrigen Pfeile beim Sortieren hin und her, und
 * man trifft den falschen.
 */
export function Pfeil({ richtung, aus, label, onKlick }: {
  richtung: 'hoch' | 'runter'
  aus: boolean
  label: string
  onKlick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onKlick}
      disabled={aus}
      aria-label={label}
      className="rounded-brand-sm px-1.5 py-0.5 text-brand-muted transition-colors hover:bg-brand-bg hover:text-navy disabled:opacity-25 disabled:hover:bg-transparent"
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d={richtung === 'hoch' ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
      </svg>
    </button>
  )
}
