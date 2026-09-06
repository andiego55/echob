/**
 * Was Echo sieht — und vor allem: was es nicht sieht.
 *
 * Der zweite Teil ist der heikle. Eine Kategorie fälschlich als „nicht freigegeben" zu
 * melden, lässt eine Fachperson eine Lücke vermuten, die es nicht gibt — und sie traut
 * dann einer Einschätzung nicht, der sie trauen könnte. Umgekehrt ist es noch schlimmer:
 * Eine echte Lücke zu verschweigen heißt, eine Antwort für vollständig zu halten, die es
 * nicht ist.
 */
import { describe, expect, it } from 'vitest'
import { aufteilen } from '../src/components/professional/Kontextband'
import { SHARE_ELEMENT_LABELS, type ShareElementType } from '../src/types'

describe('Kontextband: freigegeben vs. fehlt', () => {
  it('zaehlt einzeln freigegebene Szenen NICHT als Fehlstelle', () => {
    // Der Fall, der das leicht kaputt macht: 'scene' und 'all_scenes' sind dieselbe
    // Kategorie. Wer einzelne Szenen freigibt, hat Szenen freigegeben.
    const { da, fehlt } = aufteilen(['scene'])
    expect(da).toContain('all_scenes')
    expect(fehlt).not.toContain('all_scenes')
  })

  it('meldet eine wirklich fehlende Kategorie', () => {
    const { fehlt } = aufteilen(['all_scenes'])
    expect(fehlt).toContain('scales')
    expect(fehlt).toContain('documents')
  })

  it('teilt jede Kategorie genau einmal zu', () => {
    // Ohne das koennte etwas gleichzeitig als vorhanden UND fehlend erscheinen.
    const { da, fehlt } = aufteilen(['all_scenes', 'reports'])
    const alle = [...da, ...fehlt]
    expect(new Set(alle).size).toBe(alle.length)
  })

  it('kennt fuer jede genannte Kategorie eine Beschriftung', () => {
    // Sonst stuende dort `undefined` - und zwar genau in der Zeile, die Vertrauen
    // schaffen soll.
    const { da, fehlt } = aufteilen(['all_scenes'])
    for (const et of [...da, ...fehlt] as ShareElementType[]) {
      expect(SHARE_ELEMENT_LABELS[et]).toBeTruthy()
    }
  })

  it('meldet bei gar keiner Freigabe alles als fehlend', () => {
    const { da, fehlt } = aufteilen([])
    expect(da).toHaveLength(0)
    expect(fehlt.length).toBeGreaterThan(5)
  })

  it('fuehrt die neuen Kategorien Dokumente und Erkenntnisse', () => {
    const { da } = aufteilen(['documents', 'artifacts'])
    expect(da).toEqual(expect.arrayContaining(['documents', 'artifacts']))
  })
})
