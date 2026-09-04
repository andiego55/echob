/**
 * Belege in Echos Antworten.
 *
 * Der teuerste Fehler hier wäre ein Verweis, der zur FALSCHEN Stelle führt — dann ist er
 * schlimmer als gar keiner, weil man ihm glaubt. Der zweitteuerste ist ein Muster, das zu
 * gierig greift und mitten im Fließtext Wörter verlinkt, die keine Belege sind.
 */
import { describe, expect, it } from 'vitest'
import { belegAusHref, belegeVerlinken } from '../src/lib/belege'

describe('belegeVerlinken', () => {
  it('verlinkt eine Szene', () => {
    expect(belegeVerlinken('Wie in Szene 12 beschrieben.'))
      .toBe('Wie in [Szene 12](echob:szene/12) beschrieben.')
  })

  it('verlinkt Dokumente und Erkenntnisse', () => {
    expect(belegeVerlinken('Dokument 3 und Erkenntnis 5.'))
      .toBe('[Dokument 3](echob:dokument/3) und [Erkenntnis 5](echob:erkenntnis/5).')
  })

  it('verlinkt mehrere Belege in einem Satz', () => {
    const raus = belegeVerlinken('Aus Szene 1, Szene 25 und Szene 46.')
    expect(raus.match(/echob:szene/g)).toHaveLength(3)
  })

  it('lässt gewöhnlichen Text unberührt', () => {
    const text = 'Das klingt nach einem schweren Abend.'
    expect(belegeVerlinken(text)).toBe(text)
  })

  it('greift nicht ohne Zahl', () => {
    expect(belegeVerlinken('In dieser Szene ging es um Nähe.'))
      .toBe('In dieser Szene ging es um Nähe.')
  })

  it('hält eine Jahreszahl für keinen Beleg', () => {
    // Vier Ziffern sind ein Jahr. Ein Fall traegt keine 2026 Szenen.
    expect(belegeVerlinken('Szene 2026')).toBe('Szene 2026')
  })

  it('lässt Code in Ruhe', () => {
    // In einem Beispiel ist "Szene 12" Text, kein Verweis - ihn zu verlinken zerstoerte es.
    expect(belegeVerlinken('Nutze `Szene 12` als Beispiel.'))
      .toBe('Nutze `Szene 12` als Beispiel.')
  })

  it('lässt Zaunblöcke in Ruhe, verlinkt aber daneben', () => {
    const raus = belegeVerlinken('Vorher Szene 3.\n\n```\nSzene 9\n```\n\nNachher Szene 4.')
    expect(raus).toContain('[Szene 3](echob:szene/3)')
    expect(raus).toContain('[Szene 4](echob:szene/4)')
    expect(raus).toContain('```\nSzene 9\n```')      // unverändert
    expect(raus).not.toContain('echob:szene/9')
  })

  it('greift nicht mitten im Wort', () => {
    expect(belegeVerlinken('Szenerie 12')).toBe('Szenerie 12')
  })
})

describe('belegAusHref', () => {
  it('liest einen Beleg zurück', () => {
    expect(belegAusHref('echob:szene/12')).toEqual({ art: 'szene', nr: 12 })
  })

  it('gibt null für gewöhnliche Links', () => {
    expect(belegAusHref('https://example.com')).toBeNull()
    expect(belegAusHref('/app/cases/1/scenes')).toBeNull()
    expect(belegAusHref(undefined)).toBeNull()
  })

  it('gibt null für eine unbekannte Art', () => {
    expect(belegAusHref('echob:quatsch/3')).toBeNull()
  })

  it('gibt null für eine unbrauchbare Nummer', () => {
    expect(belegAusHref('echob:szene/0')).toBeNull()
    expect(belegAusHref('echob:szene/abc')).toBeNull()
  })

  it('passt zu dem, was belegeVerlinken erzeugt', () => {
    // Die beiden Haelften muessen zusammenpassen - sonst entsteht ein Link, den niemand
    // aufloest, und der Verweis waere still tot.
    const raus = belegeVerlinken('Szene 7')
    const href = raus.match(/\(([^)]+)\)/)![1]
    expect(belegAusHref(href)).toEqual({ art: 'szene', nr: 7 })
  })
})
