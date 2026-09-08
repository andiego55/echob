/**
 * Fall-FAQ — die Anzeigeregel, die sonst genau verkehrt herum läuft.
 *
 * Zwölf Merkmalsachsen werden nach Auffälligkeit sortiert. Bei acht von ihnen ist ein
 * hoher Wert das Auffällige, bei vier ein niedriger: „Reue und Wiedergutmachung",
 * „Perspektivübernahme", „Selbstbildstabilität", „Verantwortungsübernahme". Sortiert man
 * stumpf nach der Zahl, steht der unauffälligste mögliche Befund ganz oben — die Liste
 * ist nicht falsch, nur genau verkehrt herum geordnet, und man sieht es ihr nicht an.
 */
import { describe, expect, it } from 'vitest'
import { BELEGDICHTE_TEXT, auffaelligkeit, belegdichteStufe } from '../src/lib/fallFaq'

const achse = (wert: number, positiv: boolean, belastbar = true) =>
  ({ wert, positiv_gepolt: positiv, belastbar })

describe('Sortierung nach Auffälligkeit', () => {
  it('behandelt einen hohen Wert bei negativ gepolten Achsen als auffällig', () => {
    expect(auffaelligkeit(achse(90, false))).toBeGreaterThan(auffaelligkeit(achse(10, false)))
  })

  it('dreht die Richtung bei positiv gepolten Achsen um', () => {
    // "Reue: 10" ist das Bemerkenswerte, "Reue: 90" das Unauffaellige.
    expect(auffaelligkeit(achse(10, true))).toBeGreaterThan(auffaelligkeit(achse(90, true)))
  })

  it('stellt wenig Reue neben viel Grenzüberschreitung', () => {
    // Der Fall, um dessentwillen es die Funktion gibt: Beide gehoeren nach oben, obwohl
    // ihre Zahlen entgegengesetzt sind.
    expect(auffaelligkeit(achse(15, true))).toBe(auffaelligkeit(achse(85, false)))
  })

  it('schiebt nicht belastbare Achsen unter alle anderen', () => {
    // Sie zeigen ohnehin keine Zahl. Stuenden sie oben, saehe man zuerst leere Balken.
    expect(auffaelligkeit(achse(100, false, false))).toBeLessThan(auffaelligkeit(achse(0, false)))
  })

  it('sortiert eine gemischte Liste so, wie eine Fachperson sie lesen will', () => {
    const achsen = [
      { id: 'reue_hoch', ...achse(95, true) },          // unauffaellig
      { id: 'grenzen_hoch', ...achse(80, false) },      // auffaellig
      { id: 'reue_niedrig', ...achse(10, true) },       // auffaellig
      { id: 'duenn', ...achse(99, false, false) },      // nicht anzeigbar
    ]
    const reihenfolge = [...achsen]
      .sort((a, b) => auffaelligkeit(b) - auffaelligkeit(a))
      .map(a => a.id)
    expect(reihenfolge).toEqual(['reue_niedrig', 'grenzen_hoch', 'reue_hoch', 'duenn'])
  })
})

describe('Belegdichte', () => {
  it('steigt monoton über die vier Stufen', () => {
    const stufen = (['keine', 'duenn', 'tragfaehig', 'gut'] as const).map(belegdichteStufe)
    expect(stufen).toEqual([0, 1, 2, 3])
  })

  it('hat für jede Stufe eine Beschriftung', () => {
    for (const s of ['keine', 'duenn', 'tragfaehig', 'gut'] as const) {
      expect(BELEGDICHTE_TEXT[s]?.length).toBeGreaterThan(3)
    }
  })
})
