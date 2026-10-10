/**
 * Belege in Echos Antworten.
 *
 * Der teuerste Fehler hier wäre ein Verweis, der zur FALSCHEN Stelle führt — dann ist er
 * schlimmer als gar keiner, weil man ihm glaubt. Der zweitteuerste ist ein Muster, das zu
 * gierig greift und mitten im Fließtext Wörter verlinkt, die keine Belege sind.
 */
import { describe, expect, it } from 'vitest'
import { belegAusHref, belegUrlTransform, belegeVerlinken, namePasst } from '../src/lib/belege'
import ReactMarkdown from 'react-markdown'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { defaultUrlTransform } from 'react-markdown'

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

describe('Belege mit Namen', () => {
  it('verlinkt einen Themendialog', () => {
    expect(belegeVerlinken('Im Themendialog „Schuld“ hast du gesagt …'))
      .toBe('Im [Themendialog „Schuld“](echob:themendialog/Schuld) hast du gesagt …')
  })

  it('verlinkt eine Hypothese — auch mit geraden Anführungszeichen', () => {
    expect(belegeVerlinken('Die Hypothese "Bindungsmuster" trägt hier.'))
      .toBe('Die [Hypothese "Bindungsmuster"](echob:hypothese/Bindungsmuster) trägt hier.')
  })

  it('verlinkt einen Selbsttest', () => {
    expect(belegeVerlinken('Dein Selbsttest „Bindungsstil“ sagt etwas anderes.'))
      .toBe('Dein [Selbsttest „Bindungsstil“](echob:selbsttest/Bindungsstil) sagt etwas anderes.')
  })

  it('verlinkt das Gefühlsbild', () => {
    expect(belegeVerlinken('Dein Gefühlsbild sagt etwas anderes.'))
      .toBe('Dein [Gefühlsbild](echob:gefuehlsbild) sagt etwas anderes.')
  })

  it('greift ohne Anführung nicht — „die Hypothese, dass" ist ein Gedanke', () => {
    const text = 'Die Hypothese, dass er sich zurückzieht, bleibt offen. Ein Themendialog wäre gut.'
    expect(belegeVerlinken(text)).toBe(text)
  })

  it('greift nicht in Ableitungen', () => {
    const text = 'Gefühlsbilder und des Gefühlsbildes'
    expect(belegeVerlinken(text)).toBe(text)
  })

  it('übersteht Klammern im Namen', () => {
    // Eine rohe, unausgeglichene Klammer im Ziel beendet den Markdown-Link mitten im
    // Namen (ausgeglichene vertraegt CommonMark - deshalb steht hier die gekuerzte Form,
    // die das Modell tatsaechlich schreibt).
    const raus = belegeVerlinken('Hypothese „Persönlichkeitsstruktur (Cluster-B“')
    const html = renderToStaticMarkup(createElement(ReactMarkdown, {
      urlTransform: (u: string) => belegUrlTransform(u, defaultUrlTransform),
    }, raus))
    const href = html.match(/href="([^"]+)"/)![1]
    expect(belegAusHref(href)).toEqual({
      art: 'hypothese', name: 'Persönlichkeitsstruktur (Cluster-B',
    })
  })

  it('belegAusHref passt zu dem, was belegeVerlinken erzeugt', () => {
    for (const [text, erwartet] of [
      ['Themendialog „Über die Fallperson“', { art: 'themendialog', name: 'Über die Fallperson' }],
      ['Hypothese „Prägungen & Trauma“', { art: 'hypothese', name: 'Prägungen & Trauma' }],
      ['Gefühlsbild', { art: 'gefuehlsbild' }],
    ] as const) {
      const href = belegeVerlinken(text).match(/\]\(([^)]+)\)$/)![1]
      expect(belegAusHref(href)).toEqual(erwartet)
    }
  })

  it('verträgt eine kaputte Kodierung', () => {
    expect(belegAusHref('echob:hypothese/%E0%A4%A')).toBeNull()
    expect(belegAusHref('echob:themendialog/')).toBeNull()
  })
})

describe('namePasst', () => {
  it('erkennt den gleichen Namen trotz Schreibweise', () => {
    expect(namePasst('über mich', 'Über mich')).toBe(true)
    expect(namePasst('Prägungen und Trauma', 'Prägungen & Trauma')).toBe(false)
    expect(namePasst('Prägungen & Trauma', 'Prägungen & Trauma')).toBe(true)
  })

  it('erkennt eine Kürzung', () => {
    expect(namePasst('Persönlichkeitsstruktur', 'Persönlichkeitsstruktur (Cluster-B-Spektrum)')).toBe(true)
  })

  it('lässt ein Bruchstück nicht auf alles passen', () => {
    expect(namePasst('Üb', 'Über mich')).toBe(false)
    expect(namePasst('Schuld', 'Verantwortung')).toBe(false)
  })
})

describe('belegUrlTransform', () => {
  it('lässt das eigene Schema durch', () => {
    expect(belegUrlTransform('echob:szene/12', defaultUrlTransform)).toBe('echob:szene/12')
  })

  it('überlässt alles andere der Prüfung von react-markdown', () => {
    expect(belegUrlTransform('https://example.com', defaultUrlTransform))
      .toBe('https://example.com')
    expect(belegUrlTransform('/app/cases/1', defaultUrlTransform)).toBe('/app/cases/1')
    // Der Schutz bleibt: gefaehrliche Schemata werden weiterhin geleert.
    expect(belegUrlTransform('javascript:alert(1)', defaultUrlTransform)).toBe('')
  })

  it('react-markdown WÜRDE das eigene Schema wegwerfen', () => {
    // Der Grund, warum es belegUrlTransform ueberhaupt gibt. Faellt dieser Test eines
    // Tages, weil die Bibliothek ihr Verhalten geaendert hat, ist die Umgehung
    // ueberfluessig geworden - und man sieht es hier, statt es zu vermuten.
    expect(defaultUrlTransform('echob:szene/12')).toBe('')
  })

  it('ein leeres Ziel wäre der gemeldete Fehler gewesen', () => {
    // href="" fuehrt im Browser auf die Seite, auf der man steht: Die Belege sahen aus
    // wie Links und fuehrten zurueck in denselben Chat.
    expect(belegUrlTransform('echob:szene/12', defaultUrlTransform)).not.toBe('')
  })
})
