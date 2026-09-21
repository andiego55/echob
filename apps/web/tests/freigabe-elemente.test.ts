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
import { describe, expect, it } from 'vitest'
import { SHARE_ELEMENT_LABELS } from '@/types'
import type { ShareElementType } from '@/types'
import { CATEGORY_ELEMENTS } from '@/pages/app/CaseSharingPage'

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
