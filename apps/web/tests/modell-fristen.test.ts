/**
 * Jeder Aufruf, der ein Modell anstößt, setzt eine eigene Frist.
 *
 * **Was passiert ist.** Der Traumbeziehungs-Vergleich ging ohne eigene Frist hinaus und lief
 * damit in die Vorgabe des Clients: 15 Sekunden. Richtig für eine gewöhnliche Anfrage, viel
 * zu kurz für einen Modellaufruf. Der Browser bricht ab, **der Server schreibt weiter** —
 * der Bericht entsteht, das Monatskontingent wird verbraucht, und auf dem Schirm steht ein
 * Netzwerkfehler. Nichts davon sieht aus wie das, was passiert ist.
 *
 * **Warum das ein Wächter sein muss und keine Sorgfalt.** Es gibt keinen Fehler zur Bauzeit,
 * keinen roten Test und keine Warnung — es gibt einen Knopf, der bei kurzen Antworten
 * funktioniert und bei langen nicht. In der Entwicklung antwortet der Mock in 50
 * Millisekunden; der Fehler entsteht erst am echten Modell. Ein Dutzend Aufrufe im
 * Verzeichnis macht es richtig; man muss nur wissen, dass man daran denken muss.
 *
 * **Was der Wächter NICHT prüft, und warum.** Nur `post`, und nur wenn das Erkennungswort im
 * Pfad des Aufrufs selbst steht. Ein `put` auf `…/reports/{id}` speichert bearbeitete
 * Abschnitte und ruft kein Modell; wer es mitzählte, bekäme eine Liste, die man wegklickt —
 * und ein Wächter, den man wegklickt, ist keiner. Die erste Fassung dieses Tests hat genau
 * das getan: Sie las vier Zeilen weit und griff sich dabei den Pfad des nächsten Aufrufs.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const API = resolve(dirname(fileURLToPath(import.meta.url)), '../src/api')

/**
 * Pfadbestandteile, hinter denen ein Modell arbeitet.
 *
 * Verben, nicht Gegenstände: `/generate` erzeugt etwas, `/portrait` ist ein Ding, das auch
 * bloß gespeichert werden kann. Die Liste ist aus dem abgeleitet, was im Verzeichnis schon
 * eine Frist gesetzt bekommt — nicht geraten.
 */
const MODELL_PFADE = [
  '/generate', '/vergleich/', '/vorschlaege', '/ai-evaluate', '/didactics',
  '/assist', '/master-solution', '/echo/chat', '/echo/summar', '/reports',
  '/rephrase', '/draft',
]

/** Kürzer als das ist für einen Modellaufruf keine Frist, sondern ein Abbruch. */
const MINDESTFRIST = 45_000

/**
 * Ein `post`-Aufruf: der Pfad als erstes Argument, danach der Rest bis zur schließenden
 * Klammer. Eine Ebene Klammern darin ist erlaubt (`{ a: b }`, `${x}` sind schon im Pfad).
 */
const AUFRUF = /\.post\s*<[^>]*>\s*\(\s*(`[^`]*`|'[^']*')((?:[^()]|\([^()]*\))*)\)/g

interface Fund {
  datei: string
  pfad: string
  frist: number | null
}

function modellAufrufe(): Fund[] {
  const funde: Fund[] = []
  for (const name of readdirSync(API).filter(f => f.endsWith('.ts'))) {
    const text = readFileSync(resolve(API, name), 'utf-8')
    for (const t of text.matchAll(AUFRUF)) {
      const pfad = t[1]
      if (!MODELL_PFADE.some(p => pfad.includes(p))) continue
      const frist = t[2].match(/timeout:\s*([\d_]+)/)
      funde.push({
        datei: name,
        pfad: pfad.slice(1, -1),
        frist: frist ? Number(frist[1].replace(/_/g, '')) : null,
      })
    }
  }
  return funde
}

describe('Fristen fuer Modellaufrufe', () => {
  it('findet ueberhaupt Modellaufrufe', () => {
    // Ohne diese Schranke prueft der Test nichts und bleibt trotzdem gruen - dieselbe
    // Bauart Fehler, gegen die er geschrieben ist.
    expect(modellAufrufe().length).toBeGreaterThan(10)
  })

  it('erkennt den Vergleich, um den es ging', () => {
    // Der Wächter darf nicht an dem Fall vorbeigehen, der ihn ausgelöst hat.
    const v = modellAufrufe().find(f => f.pfad.includes('/vergleich/'))
    expect(v, 'der Traumbeziehungs-Vergleich wird nicht erkannt').toBeTruthy()
    expect(v!.frist).toBeGreaterThanOrEqual(MINDESTFRIST)
  })

  it('jeder Modellaufruf setzt eine eigene Frist', () => {
    const ohne = modellAufrufe().filter(f => f.frist === null)
    expect(
      ohne.map(f => `${f.datei}  ${f.pfad}`),
      'Diese Aufrufe laufen in die 15-Sekunden-Vorgabe',
    ).toEqual([])
  })

  it('und die Frist ist lang genug, um eine Antwort abzuwarten', () => {
    const zuKurz = modellAufrufe().filter(f => f.frist !== null && f.frist < MINDESTFRIST)
    expect(
      zuKurz.map(f => `${f.datei}  ${f.pfad} = ${f.frist}ms`),
      `Kuerzer als ${MINDESTFRIST}ms ist keine Frist, sondern ein Abbruch`,
    ).toEqual([])
  })
})
