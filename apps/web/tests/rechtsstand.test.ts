/**
 * Steht unter jedem Rechtstext eine nachweisbare Fassung — oder die Uhr?
 *
 * **Was hier bewacht wird.** Bis zum 04.10.2026 trugen Datenschutzerklärung, AGB und
 * Widerrufsbelehrung `Stand: {new Date()...}`. Jedes Dokument behauptete damit, in diesem
 * Monat aktuell zu sein, und niemand konnte belegen, WELCHE Fassung jemand gesehen hat, als
 * er zugestimmt hat. Der Nachweis einer Einwilligung (Art. 7 Abs. 1 DSGVO) ist nur so gut
 * wie die Angabe, worauf sie sich bezog.
 *
 * **Warum es ein Test sein muss und kein Kommentar.** Ein dynamisches Datum ist der bequeme
 * Griff: Es sieht immer frisch aus und man muss nie daran denken. Genau deshalb kommt es
 * zurück, sobald jemand eine Seite umbaut — und zwar ohne Fehler, ohne roten Test, ohne
 * Spur. Nur mit einem Dokument, das lügt.
 *
 * Geprüft wird an den Seiten selbst, nicht am Modul: Das Modul kann vorbildlich sein und
 * die Seite es trotzdem nicht benutzen.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { RECHTSSTAND } from '../src/lib/rechtsstand'

const WURZEL = join(__dirname, '..', 'src', 'pages')

/** Die Rechtstexte und ihr Schlüssel im Modul. */
const SEITEN: ReadonlyArray<[keyof typeof RECHTSSTAND, string]> = [
  ['datenschutz', 'DatenschutzPage.tsx'],
  ['agb', 'AGBPage.tsx'],
  ['widerruf', 'WiderrufPage.tsx'],
]

function quelle(datei: string): string {
  return readFileSync(join(WURZEL, datei), 'utf-8')
}

describe('Rechtsstand', () => {
  it.each(SEITEN)('%s nimmt den Stand nicht aus der Uhr', (_key, datei) => {
    const text = quelle(datei)
    expect(text).not.toContain('new Date()')
    expect(text).not.toContain('toLocaleDateString')
  })

  it.each(SEITEN)('%s zeigt Datum und Fassung aus dem Modul', (key, datei) => {
    const text = quelle(datei)
    expect(text).toContain(`RECHTSSTAND.${key}.stand`)
    expect(text).toContain(`RECHTSSTAND.${key}.fassung`)
  })

  it('jede Fassung trägt ihren Dokumentnamen und ein Jahr-Monat', () => {
    for (const [key, eintrag] of Object.entries(RECHTSSTAND)) {
      // `agb-2026-10` oder `agb-2026-10b` — der Buchstabe für eine zweite Fassung im
      // selben Monat. Ohne ihn wären zwei Änderungen in einem Monat nicht unterscheidbar,
      // und genau darauf kommt es beim Nachweis an.
      // Der Schlüssel ist camelCase (`agbFachpersonen`), die Fassung lesbar mit
      // Bindestrichen (`agb-fachpersonen-2026-10`). Verglichen wird der umgewandelte
      // Schlüssel: Die Absicht ist, dass die Fassung IHR Dokument nennt — nicht, dass
      // zwei Schreibweisen gleich aussehen.
      const slug = key.replace(/[A-Z]/g, (b) => `-${b.toLowerCase()}`)
      expect(eintrag.fassung).toMatch(new RegExp(`^${slug}-\\d{4}-\\d{2}[a-z]?$`))
      expect(eintrag.stand).toMatch(/^\d{1,2}\. [A-Za-zä]+ \d{4}$/)
    }
  })

  it('Fassung und angezeigtes Datum gehören zum selben Monat', () => {
    // Sonst steht unter dem Dokument ein Datum, das die Fassung nicht kennt — und beim
    // Nachweis stimmt eines von beiden nicht.
    const MONATE = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
    ]
    for (const eintrag of Object.values(RECHTSSTAND)) {
      const [, jahr, monat] = eintrag.fassung.match(/-(\d{4})-(\d{2})/)!
      expect(eintrag.stand).toContain(MONATE[Number(monat) - 1])
      expect(eintrag.stand).toContain(jahr)
    }
  })
})
