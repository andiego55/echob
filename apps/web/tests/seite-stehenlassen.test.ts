/**
 * Eine geladene Seite bleibt stehen, wenn eine Nachfrage scheitert.
 *
 * **Der Fehler, den das hier verhindert.** Der Paarraum fragt alle zehn bis zwanzig
 * Sekunden nach, ob etwas Neues da ist. Schlug eine dieser Nachfragen fehl, prüften sechs
 * Stellen `isError || !data` und tauschten die ganze Seite gegen einen Leerzustand:
 * „Paarraum nicht gefunden — Dieser Raum existiert nicht oder wurde beendet." Der Raum
 * existierte, das Gespräch lief, und im Eingabefeld stand ein halber Satz.
 *
 * Gemeldet wurde es als „Unerlaubter Token, Gespräch lässt sich nicht öffnen" — der
 * Serversatz dazu heißt „Ungültiger oder abgelaufener Token", und er trifft jeden, dessen
 * Rechner eine Stunde geschlafen hat.
 *
 * **Zwei Regeln, zwei Prüfungen:**
 *
 * 1. Ein Leerzustand hängt an `!data`, nie an `isError` — wer schon Inhalt hat, behält ihn.
 * 2. Ein „gibt es nicht" sagt nur, wer 404/410 gesehen hat (`istEndgueltigWeg`). Alles
 *    andere heißt „gerade nicht".
 *
 * Geprüft wird an der Quelle und nicht am gerenderten Bild: Ein Test, der dafür React,
 * einen Router und einen falschen Server bräuchte, würde hier nie geschrieben werden — und
 * dann gäbe es gar keinen.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { istEndgueltigWeg } from '@/api/errors'

const SRC = join(__dirname, '..', 'src')

/** Die Seiten und Karten, die im Paarraum pollen — sie sind dem Fehler ausgesetzt. */
const POLLEND = [
  'pages/couple/CoupleMediationPage.tsx',
  'pages/couple/CoupleSessionPage.tsx',
  'components/couple/CoupleShell.tsx',
  'components/couple/CoupleDashboard.tsx',
  'components/couple/ImpulseBoard.tsx',
  'components/couple/QuestionsBoard.tsx',
]

describe('istEndgueltigWeg – „gibt es nicht" oder „gerade nicht"', () => {
  it('sagt nur bei 404 und 410, dass etwas weg ist', () => {
    expect(istEndgueltigWeg({ response: { status: 404 } })).toBe(true)
    expect(istEndgueltigWeg({ response: { status: 410 } })).toBe(true)
  })

  it('hält einen abgelaufenen Token NICHT für ein Verschwinden', () => {
    // Genau der gemeldete Fall.
    expect(istEndgueltigWeg({ response: { status: 401 } })).toBe(false)
  })

  it('hält auch Serverfehler und Funklöcher nicht dafür', () => {
    for (const status of [403, 422, 429, 500, 502, 503]) {
      expect(istEndgueltigWeg({ response: { status } }), String(status)).toBe(false)
    }
    // Kein `response` = die Anfrage kam nie an. Ein Funkloch ist kein Löschen.
    expect(istEndgueltigWeg({ code: 'ERR_NETWORK' })).toBe(false)
    expect(istEndgueltigWeg(undefined)).toBe(false)
  })
})

describe('Paarraum – ein Fehler tauscht keine Seite aus', () => {
  for (const datei of POLLEND) {
    it(`${datei} hängt seinen Leerzustand nicht an isError`, () => {
      const quelle = readFileSync(join(SRC, datei), 'utf8')
      // `isError || !data`, `isError || !room`, … — die Form, die den Inhalt wegwirft.
      expect(quelle).not.toMatch(/isError\s*\|\|/)
    })
  }
})
