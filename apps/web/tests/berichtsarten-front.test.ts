/**
 * Die Berichtsarten im Frontend sind dieselben wie im Server.
 *
 * **Warum es diesen Wächter zusätzlich gibt.** Der Server hat schon einen
 * (``test_berichtsarten.py``): Er hält die CHECK-Bedingung der Datenbank, das Pydantic-
 * Literal und die deutschen Etiketten zusammen. Drei Stellen. Es gibt aber fünf — die
 * TypeScript-Vereinigung und ihre Etiketten liegen in einem anderen Verzeichnis und einer
 * anderen Sprache, und kein Python-Test kommt dort hin.
 *
 * **Was passiert, wenn diese fünfte Stelle fehlt.** Nichts Laut es. Die API liefert eine Art,
 * die das Frontend nicht kennt; `TYPE_META[...]` greift ins Leere und fällt auf die
 * Vorgabefarbe zurück, `REPORT_TYPE_LABELS` hat keinen Eintrag. Kein Absturz, keine rote
 * Zeile — nur ein Bericht, der aussieht wie ein anderer. Genau die Bauart Fehler, die
 * monatelang liegen bleibt (siehe ``partner`` und das Freigabe-Element).
 *
 * Der Test liest die Wahrheit dort, wo sie steht: im Pydantic-Literal des Servers.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPORT_TYPE_LABELS } from '@/types'

const hier = dirname(fileURLToPath(import.meta.url))
const SCHEMA = readFileSync(
  resolve(hier, '../../../services/api/app/schemas/report.py'), 'utf-8',
)
const TYPES = readFileSync(resolve(hier, '../src/types/index.ts'), 'utf-8')

/** Die Arten, die der Server kennt — aus `ReportType = Literal[…]`. */
function ausDemServer(): string[] {
  const m = SCHEMA.match(/ReportType\s*=\s*Literal\[([\s\S]*?)\]/)
  if (!m) throw new Error('ReportType-Literal in report.py nicht gefunden')
  return [...m[1].matchAll(/"([a-z_]+)"/g)].map(t => t[1])
}

/**
 * Die Arten, die das Frontend kennt — aus `export type ReportType = …`.
 *
 * Bis zur naechsten `export`-Zeile, nicht bis zur naechsten Leerzeile: Die Vereinigungen in
 * dieser Datei stehen ohne Zwischenraum untereinander, und ein zu weiter Griff holt sich
 * `ReportStatus` mit dazu. Der Test war deshalb einmal rot — aus dem richtigen Grund, nur
 * am falschen Ort.
 */
function ausDemFrontend(): string[] {
  const m = TYPES.match(/export type ReportType =([\s\S]*?)(?=^export )/m)
  if (!m) throw new Error('ReportType in types/index.ts nicht gefunden')
  // Kommentarzeilen raus: Sie duerfen Wörter in Anführungszeichen enthalten.
  const ohneKommentar = m[1].replace(/\/\/.*$/gm, '')
  return [...ohneKommentar.matchAll(/'([a-z_]+)'/g)].map(t => t[1])
}

describe('Berichtsarten', () => {
  it('findet ueberhaupt etwas auf beiden Seiten', () => {
    // Ohne diese Schranke prueft der Test nichts und bleibt trotzdem gruen - dieselbe
    // Bauart Fehler, gegen die er geschrieben ist.
    expect(ausDemServer().length).toBeGreaterThan(5)
    expect(ausDemFrontend().length).toBeGreaterThan(5)
  })

  it('Server und Frontend kennen dieselben Arten', () => {
    expect([...ausDemFrontend()].sort()).toEqual([...ausDemServer()].sort())
  })

  it('jede Art hat ein deutsches Etikett', () => {
    // Ohne Etikett steht in der Liste bei allen Arten dasselbe Wort.
    expect(Object.keys(REPORT_TYPE_LABELS).sort()).toEqual([...ausDemServer()].sort())
    for (const [art, wort] of Object.entries(REPORT_TYPE_LABELS)) {
      expect(wort.length, art).toBeGreaterThan(3)
    }
  })
})
