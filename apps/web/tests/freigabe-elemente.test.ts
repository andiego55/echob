/**
 * Die Liste der freigebbaren Inhalte — und die Stellen, an denen sie auseinanderlaufen kann.
 *
 * **Warum das geprüft wird.** Ein neuer freigebbarer Inhalt entsteht an vier Stellen: der
 * Bedingung in der Datenbank, dem Schema der Schnittstelle, den Etiketten hier im Frontend
 * und der Liste zum Ankreuzen. Vergisst man eine davon, gibt es keinen Absturz, keinen
 * roten Build und keine Warnung — es fehlt nur eine Zeile in einem Kästchen-Raster, und
 * niemandem fällt auf, warum die Fachperson diesen Inhalt nie zu sehen bekommt.
 *
 * Genau so lag es beim Gefühlsbild: Tabelle, Dienst und Kontextband waren fertig, das
 * Kästchen fehlte. Der Typ hilft dabei nicht — `Record<ShareElementType, string>` erzwingt
 * ein Etikett, aber nichts erzwingt, dass es auch jemand ankreuzen kann.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SHARE_ELEMENT_LABELS } from '@/types'
import type { ShareElementType } from '@/types'
import { CATEGORY_ELEMENTS } from '@/pages/app/CaseSharingPage'

const hier = dirname(fileURLToPath(import.meta.url))

/**
 * Was in der Oberfläche in einer EIGENEN Liste steht statt im Kästchen-Raster.
 *
 * Beides sind Inhalte, die man Stück für Stück auswählt statt als Kategorie: einzelne
 * Szenen und einzelne Sätze über sich. Ein Kästchen „Sätze über dich" gäbe es nicht —
 * es hieße, das ganze Selbstbild zu öffnen, und genau das soll es nicht sein.
 */
const EIGENE_LISTE: ShareElementType[] = ['scene', 'satz']

describe('Freigabe – die ankreuzbaren Inhalte', () => {
  it('bietet jeden Inhalt zum Ankreuzen an, den es überhaupt gibt', () => {
    const alle = Object.keys(SHARE_ELEMENT_LABELS) as ShareElementType[]
    const erwartet = alle.filter(e => !EIGENE_LISTE.includes(e))
    expect([...CATEGORY_ELEMENTS].sort()).toEqual([...erwartet].sort())
  })

  it('kreuzt nichts an, wofür es kein Etikett gibt', () => {
    // Sonst stünde im Raster ein leeres Kästchen ohne Beschriftung.
    for (const el of CATEGORY_ELEMENTS) {
      expect(SHARE_ELEMENT_LABELS[el], el).toBeTruthy()
    }
  })

  it('nennt jeden Inhalt nur einmal', () => {
    expect(new Set(CATEGORY_ELEMENTS).size).toBe(CATEGORY_ELEMENTS.length)
  })

  it('führt das Gefühlsbild mit — es ist eine eigene Freigabe, keine Skala', () => {
    // Der ausdrückliche Wunsch an das Feature: Der Gefühlsstand soll an die Fachperson
    // freigegeben werden können. Ohne diesen Eintrag ist das Feature nur halb da.
    expect(CATEGORY_ELEMENTS).toContain('gefuehlsbild')
  })
})

/**
 * **Die fünfte Stelle** — und die einzige, deren Fehlen wirklich niemand bemerkt.
 *
 * Bedingung, Schema, Etikett und Kästchen kann man prüfen, und das tun die Tests oben.
 * Aber selbst wenn alle vier stimmen, kann die Fachperson den Inhalt nie zu sehen bekommen:
 * Es fehlt dann nur eine Zeile auf ihrer Fallseite. Die Klient:in kreuzt an, der Server
 * liefert, die Freigabe steht als Etikett im Kopf der Seite — und darunter kommt nichts.
 * Niemand meldet etwas, weil niemand weiß, dass etwas fehlt.
 *
 * Genau so lagen die Sätze monatelang. Der Test verlangt deshalb für JEDEN freigebbaren
 * Inhalt eine Abfrage `has('…')` auf der Fallseite der Fachperson.
 */
describe('Freigabe – und wird es auch angezeigt?', () => {
  const SEITE = readFileSync(
    resolve(hier, '../src/pages/professional/ProfessionalCaseDetailPage.tsx'), 'utf-8')

  it('fragt jeden freigebbaren Inhalt auf der Fallseite ab', () => {
    const alle = Object.keys(SHARE_ELEMENT_LABELS) as ShareElementType[]
    const ohneAnzeige = alle.filter(e => !SEITE.includes(`has('${e}')`))
    expect(
      ohneAnzeige,
      'Diese Inhalte lassen sich freigeben, tauchen bei der Fachperson aber nirgends auf:\n  '
        + ohneAnzeige.join('\n  '),
    ).toEqual([])
  })

  it('findet die Seite ueberhaupt', () => {
    // Ohne diese Schranke prueft der Test nichts, sobald die Datei umzieht - und bleibt
    // trotzdem gruen.
    expect(SEITE.length).toBeGreaterThan(5000)
    expect(SEITE).toContain("has('krisenplan')")
  })
})
