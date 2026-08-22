/**
 * Das Tempo, in dem Echos Antwort erscheint.
 *
 * **Warum geprüft.** Der erste Anlauf war zu schnell: Das Modell liefert seine Stücke in
 * Schüben, ungebremst ist der Text da, bevor man ihn lesen kann. Die Korrektur besteht aus
 * vier Zahlen — und Zahlen, die man nur am Gefühl merkt, verrutschen beim nächsten
 * Anfassen unbemerkt. Deshalb sind hier nicht die Konstanten festgenagelt, sondern die
 * EIGENSCHAFTEN, die sie haben müssen.
 */
import { describe, expect, it } from 'vitest'
import { tempoFuer } from '@/lib/textTakt'

/** Menschen lesen rund 17–21 Zeichen pro Sekunde. */
const LESEGESCHWINDIGKEIT = 19

describe('tempoFuer – während empfangen wird', () => {
  it('startet über Lesegeschwindigkeit, aber nicht davon weg', () => {
    const tempo = tempoFuer(0, true)
    // Darunter wartet man auf den Text. Weit darüber liest man hinterher.
    expect(tempo).toBeGreaterThan(LESEGESCHWINDIGKEIT * 1.5)
    expect(tempo).toBeLessThan(LESEGESCHWINDIGKEIT * 4)
  })

  it('zieht an, wenn sich etwas staut', () => {
    expect(tempoFuer(200, true)).toBeGreaterThan(tempoFuer(20, true))
    expect(tempoFuer(1000, true)).toBeGreaterThan(tempoFuer(200, true))
  })

  it('hat eine Obergrenze – sonst wäre der Rückstand wieder ein Sprung', () => {
    expect(tempoFuer(100_000, true)).toBe(tempoFuer(1_000_000, true))
  })

  it('bleibt auch bei großem Rückstand lesbar', () => {
    // Eine 2000-Zeichen-Antwort kommt oft fast am Stück. Sie darf nicht in einem
    // Sekundenbruchteil durchrauschen – dann waere die ganze Taktung sinnlos.
    const sekunden = 2000 / tempoFuer(2000, true)
    expect(sekunden).toBeGreaterThan(3)
  })
})

describe('tempoFuer – wenn der Empfang beendet ist', () => {
  it('zieht den Rest zügig nach, statt ihn auszusitzen', () => {
    // Sonst stünde man vor einem fertigen Modell und sähe noch die Hälfte.
    for (const rest of [300, 1200, 4000]) {
      expect(rest / tempoFuer(rest, false)).toBeLessThanOrEqual(1)
    }
  })

  it('wird für einen kurzen Rest nicht langsamer als das Grundtempo', () => {
    expect(tempoFuer(5, false)).toBe(tempoFuer(0, true))
  })

  it('ist nie langsamer als während des Empfangs', () => {
    for (const rest of [0, 10, 100, 1000]) {
      expect(tempoFuer(rest, false)).toBeGreaterThanOrEqual(
        Math.min(tempoFuer(rest, true), tempoFuer(rest, false)),
      )
    }
  })
})

describe('tempoFuer – Randfälle', () => {
  it('gibt bei keinem Rückstand kein Tempo von null aus', () => {
    // Ein Tempo von 0 wuerde die Schleife anhalten und den Text einfrieren.
    expect(tempoFuer(0, true)).toBeGreaterThan(0)
    expect(tempoFuer(0, false)).toBeGreaterThan(0)
  })

  it('liefert immer eine endliche Zahl', () => {
    for (const [rest, laeuft] of [[0, true], [1, false], [1e9, true]] as const) {
      expect(Number.isFinite(tempoFuer(rest, laeuft))).toBe(true)
    }
  })
})
