/**
 * Der Hinweis zur Schweigepflicht — was in jeder Fassung stehen muss.
 *
 * Der Text ist der ganze Gegenstand des Features: Eine Bestätigung ist nur so viel wert
 * wie das, was darüber stand. Diese Prüfungen halten die drei Dinge fest, ohne die er
 * seinen Zweck verfehlt — und die man beim Kürzen als Erstes verliert:
 *
 * 1. dass die **eigenen Aufzeichnungen** mitgehen (der Teil, den keine Entbindung deckt),
 * 2. dass es für die freigegebenen Inhalte eine **Entbindung** gibt (sonst liest sich der
 *    Hinweis wie eine Warnung vor dem eigenen Produkt),
 * 3. dass „nicht geklärt" wie „schweigepflichtig" behandelt wird, nicht wie „frei".
 */
import { describe, expect, it } from 'vitest'
import { SCHWEIGEPFLICHT_FASSUNG, schweigepflichtHinweis } from '@/lib/schweigepflicht'

const ALLE = [true, false, null, undefined] as const

describe('Hinweis zur Schweigepflicht', () => {
  it('hat eine Fassung im erwarteten Format', () => {
    expect(SCHWEIGEPFLICHT_FASSUNG).toMatch(/^schweigepflicht-\d{4}-\d{2}[a-z]?$/)
  })

  it.each(ALLE)('ist in jeder Lage vollständig (unterliegt_203 = %s)', (wert) => {
    const h = schweigepflichtHinweis(wert)
    expect(h.titel.length).toBeGreaterThan(10)
    expect(h.einstieg.length).toBeGreaterThan(80)
    expect(h.abschnitte.length).toBeGreaterThanOrEqual(3)
    expect(h.regeln.length).toBeGreaterThanOrEqual(3)
    expect(h.bestaetigung.length).toBeGreaterThan(40)
    for (const a of h.abschnitte) {
      expect(a.ueberschrift.length).toBeGreaterThan(5)
      expect(a.text.length).toBeGreaterThan(60)
    }
  })

  it.each(ALLE)('nennt die eigenen Aufzeichnungen (unterliegt_203 = %s)', (wert) => {
    const text = JSON.stringify(schweigepflichtHinweis(wert))
    expect(text).toMatch(/Sitzungsnotizen/)
    expect(text).toMatch(/Arbeitsmappe/)
    // Der Kern: Die Entbindung der Klient:in deckt die eigenen Aufzeichnungen nicht.
    expect(text).toMatch(/Entbindung/)
  })

  it('behandelt „nicht geklärt" wie schweigepflichtig, nicht wie frei', () => {
    for (const wert of [null, undefined]) {
      const h = schweigepflichtHinweis(wert)
      expect(h.lage).toBe('ungeklaert')
      expect(h.zurGruppe).toBeTruthy()
      // Gleiche Abschnitte wie bei ausdruecklicher Schweigepflicht.
      expect(h.abschnitte.map(a => a.ueberschrift))
        .toEqual(schweigepflichtHinweis(true).abschnitte.map(a => a.ueberschrift))
    }
  })

  it('sagt bei Schweigepflicht, an wen sich § 203 richtet', () => {
    const h = schweigepflichtHinweis(true)
    expect(h.lage).toBe('pflicht')
    expect(h.zurGruppe).toBeUndefined()
    expect(JSON.stringify(h)).toMatch(/§ 203/)
  })

  it('sagt ohne Schweigepflicht, dass trotzdem alles übermittelt wird', () => {
    const h = schweigepflichtHinweis(false)
    expect(h.lage).toBe('frei')
    expect(h.einstieg).toMatch(/nicht der Schweigepflicht/)
    expect(JSON.stringify(h)).toMatch(/OpenAI/)
  })

  it('verspricht keinen Schalter, den es nicht gibt', () => {
    // Die Aufzeichnungen lassen sich nicht vom Kontext ausnehmen. Ein Text, der das
    // nahelegt, waere schlimmer als keiner: Man verliesse sich auf etwas, das fehlt.
    for (const wert of ALLE) {
      const text = JSON.stringify(schweigepflichtHinweis(wert))
      expect(text).not.toMatch(/Schalter|abschalten|deaktivieren|ausschalten/)
    }
  })
})
