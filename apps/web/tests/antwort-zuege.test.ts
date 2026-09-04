/**
 * Die Züge unter Echos Antwort.
 *
 * Geprüft wird die eine Entscheidung, die man dem Bildschirm nicht ansieht: dass
 * „Widersprich mir" verschwindet, wenn die Sicherheits-Triage angeschlagen hat. Wem es
 * akut schlecht geht, dem bietet man keinen Widerspruch an — und ein Fehler an dieser
 * Stelle fiele erst dann auf, wenn es zu spät ist.
 */
import { describe, expect, it } from 'vitest'
import { ZUEGE, zuegeFuer } from '../src/components/app/antwortZuegeDaten'

describe('Züge unter der Antwort', () => {
  it('bietet im Normalfall alle vier an', () => {
    expect(zuegeFuer(null).map(z => z.id))
      .toEqual(['kuerzer', 'konkreter', 'perspektive', 'widerspruch'])
  })

  it('nimmt „Widersprich mir" bei akuter Lage heraus', () => {
    expect(zuegeFuer('acute').map(z => z.id)).not.toContain('widerspruch')
  })

  it('nimmt „Widersprich mir" auch bei erhöhter Aufmerksamkeit heraus', () => {
    expect(zuegeFuer('elevated').map(z => z.id)).not.toContain('widerspruch')
  })

  it('lässt die übrigen Züge auch in Not stehen', () => {
    // Kürzer und Konkreter sind harmlos - sie gerade dann zu entfernen, waere unnoetig.
    expect(zuegeFuer('acute').map(z => z.id)).toEqual(['kuerzer', 'konkreter', 'perspektive'])
  })

  it('bleibt bei vier Zügen', () => {
    // Mehr waeren eine Werkzeugleiste. Unter einer Antwort, die man gerade liest, ist
    // Platz fuer ungefaehr vier Woerter.
    expect(ZUEGE).toHaveLength(4)
  })

  it('hat für jeden Zug einen Text, der wirklich gesendet werden kann', () => {
    for (const z of ZUEGE) {
      expect(z.text.trim().length).toBeGreaterThan(10)
      expect(z.label.trim()).not.toBe('')
      expect(z.titel.trim()).not.toBe('')
    }
  })

  it('sendet keinen Steuerbefehl', () => {
    // Ein Text mit __ vorne wuerde vom Strom-Endpunkt als Steuerbefehl behandelt.
    for (const z of ZUEGE) expect(z.text.startsWith('__')).toBe(false)
  })

  it('bittet beim Perspektivwechsel ausdrücklich, nichts zu erfinden', () => {
    // Ohne diesen Zusatz dichtet ein Modell der abwesenden Person Motive an - genau das,
    // was EchoB ueber abwesende Dritte nie tun darf.
    const p = ZUEGE.find(z => z.id === 'perspektive')!
    expect(p.text).toContain('erfinde nichts dazu')
  })
})
