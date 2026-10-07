/**
 * Stehen Name und Anschrift in der Widerrufsbelehrung — oder nur ein Verweis darauf?
 *
 * **Warum ein Verweis nicht genügt.** Bis zum 07.10.2026 stand in der Widerrufsbelehrung
 * „uns (Anbieter, Anschrift siehe Impressum)" und im Muster-Widerrufsformular „An:
 * [Anbieter – Name und Anschrift siehe Impressum]". Das liest sich vernünftig und ist es
 * nicht: Das gesetzliche Muster (Anlage 1 und 2 zu Art. 246a § 1 Abs. 2 EGBGB) verlangt
 * die **eingefügten** Angaben. Eine Abweichung kostet die Gesetzlichkeitsfiktion nach
 * Art. 246a § 1 Abs. 2 S. 2 EGBGB (BGH; OLG Hamm 18 U 34/22).
 *
 * **Und die Folge ist nicht nur eine Abmahnung.** Ist die Belehrung fehlerhaft, beginnt
 * die Widerrufsfrist nach § 356 Abs. 3 BGB nicht zu laufen; sie endet erst **zwölf Monate
 * und vierzehn Tage** nach dem regulären Fristbeginn. Aus vierzehn Tagen wird ein Jahr,
 * in dem jeder Kauf widerrufen werden kann.
 *
 * **Warum die Angaben aus einem Modul kommen müssen und nicht dreimal im JSX stehen.**
 * Sie werden an drei Stellen gebraucht (Impressum, Belehrung, Formular). Sobald die UG
 * eingetragen ist, ändern sich Name, Rechtsform und Anschrift — bei drei Kopien bleiben
 * zwei stehen. Ein Rechtstext, der zwei verschiedene Anbieter nennt, ist schlimmer als
 * einer mit einem Verweis, und er fällt niemandem auf.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ANBIETER, ANBIETER_ZEILE } from '../src/lib/anbieter'

const SEITEN = join(__dirname, '..', 'src', 'pages')

const ohneKommentare = (q: string): string =>
  q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const quelle = (datei: string): string =>
  ohneKommentare(readFileSync(join(SEITEN, datei), 'utf-8'))

describe('Anbieterangaben', () => {
  it.each(['ImpressumPage.tsx', 'WiderrufPage.tsx'])(
    '%s nimmt die Angaben aus dem Modul', (datei) => {
      const q = quelle(datei)
      expect(q).toContain("from '@/lib/anbieter'")
      // **Die Verwendung, nicht der Name.** Eine frühere Fassung dieses Musters in diesem
      // Projekt prüfte auf den blossen Bezeichner — und die Import-Zeile erfüllte sie.
      expect(q).toContain('{ANBIETER.')
    })

  it.each(['ImpressumPage.tsx', 'WiderrufPage.tsx'])(
    '%s schreibt die Anschrift nicht von Hand hin', (datei) => {
      // Eine zweite, abgetippte Fassung ist genau das, was beim Eintrag der UG stehen
      // bleibt. Der Strassenname ist dafür der empfindlichste Fingerabdruck.
      expect(quelle(datei)).not.toContain(ANBIETER.strasse)
    })

  it('die Widerrufsbelehrung verweist nicht aufs Impressum', () => {
    const q = quelle('WiderrufPage.tsx')
    expect(q).not.toMatch(/siehe\s*\{?'?\s*\}?\s*<?Link/i)
    expect(q.toLowerCase()).not.toContain('siehe impressum')
    expect(q).not.toContain('/impressum')
  })

  it('das Muster-Widerrufsformular trägt Name, Anschrift und E-Mail', () => {
    // Anlage 2 zu Art. 246a § 1 Abs. 2 S. 1 Nr. 1 EGBGB: „Hier ist der Name, die
    // Anschrift und [...] die E-Mail-Adresse des Unternehmers einzufügen."
    expect(quelle('WiderrufPage.tsx')).toContain('{ANBIETER_ZEILE}')
    for (const teil of [ANBIETER.name, ANBIETER.strasse, ANBIETER.ort, ANBIETER.email]) {
      expect(ANBIETER_ZEILE, `Zeile enthält ${teil}`).toContain(teil)
    }
  })

  it('keine Platzhalter in Klammern mehr in den Rechtstexten', () => {
    // „[Anbieter – Name und Anschrift siehe Impressum]" sah im Entwurf wie ein Muster aus
    // und ging genau deshalb live: Eckige Klammern lesen sich wie Absicht.
    for (const datei of ['ImpressumPage.tsx', 'WiderrufPage.tsx', 'AGBPage.tsx']) {
      const treffer = quelle(datei).match(/\[[A-ZÄÖÜ][^\]]{8,}\]/g) ?? []
      expect(treffer, `${datei}: offene Platzhalter`).toEqual([])
    }
  })

  it('wenn eine USt-IdNr. erteilt ist, steht sie auch im Impressum', () => {
    // § 5 Abs. 1 Nr. 6 DDG — Pflicht, sobald vorhanden, und abmahnfähig. Der Wächter
    // erzwingt KEINE Nummer (es gibt vielleicht keine), aber er lässt nicht zu, dass eine
    // im Modul steht und die Seite sie verschweigt.
    if (ANBIETER.ustIdNr) {
      expect(quelle('ImpressumPage.tsx')).toContain('ANBIETER.ustIdNr')
      expect(quelle('ImpressumPage.tsx')).toContain('27a')
    }
    // Die Steuernummer gehört ausdrücklich NICHT ins Impressum.
    expect(quelle('ImpressumPage.tsx').toLowerCase()).not.toContain('steuernummer')
  })
})
