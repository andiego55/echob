/**
 * Steht eine Antwort auf konkretem Material?
 *
 * Für eine Fachperson ist der Unterschied zwischen Beobachtung und Eindruck der ganze
 * Unterschied. Diese eine Funktion entscheidet, ob unter einer Antwort „ohne Bezug auf
 * konkretes Material" steht — und sie muss dieselbe Schreibweise erkennen wie die
 * Verlinkung in `lib/belege`. Läuft die auseinander, steht der Hinweis unter Antworten,
 * die sehr wohl Verweise tragen, und niemand glaubt ihm mehr.
 */
import { describe, expect, it } from 'vitest'
import { PROFI_ZUEGE, hatBeleg } from '../src/components/professional/profiZuegeDaten'
import { belegeVerlinken } from '../src/lib/belege'

describe('Profi-Züge: hatBeleg', () => {
  it('erkennt die drei Arten von Belegen', () => {
    expect(hatBeleg('Auffällig ist Szene 12.')).toBe(true)
    expect(hatBeleg('Siehe Dokument 3.')).toBe(true)
    expect(hatBeleg('Passt zu Erkenntnis 5.')).toBe(true)
  })

  it('meldet eine Antwort ohne jeden Bezug', () => {
    expect(hatBeleg('Das klingt nach einem wiederkehrenden Muster.')).toBe(false)
  })

  it('haelt sich an dieselbe Schreibweise wie die Verlinkung', () => {
    // Der eigentliche Punkt: Was verlinkt wird, muss auch als Beleg zaehlen - und
    // umgekehrt. Sonst widersprechen sich Hinweis und Darstellung in derselben Antwort.
    const mitBeleg = 'Der Abend im März (Szene 12) zeigt das.'
    const ohneBeleg = 'Die Szenen zeigen das.'
    expect(hatBeleg(mitBeleg)).toBe(belegeVerlinken(mitBeleg) !== mitBeleg)
    expect(hatBeleg(ohneBeleg)).toBe(belegeVerlinken(ohneBeleg) !== ohneBeleg)
  })

  it('faellt nicht auf eine Jahreszahl herein', () => {
    expect(hatBeleg('Seit Szene 2026 ist alles anders.')).toBe(false)
  })

  it('bietet vier Zuege mit eindeutigen Kennungen', () => {
    // Vier, weil unter einer Antwort Platz fuer ungefaehr vier Woerter ist. Mehr wird
    // ueberlesen - dann sind es null.
    expect(PROFI_ZUEGE).toHaveLength(4)
    expect(new Set(PROFI_ZUEGE.map(z => z.id)).size).toBe(4)
  })

  it('verlangt von jedem Zug einen sendbaren Text und einen kurzen Knopf', () => {
    for (const z of PROFI_ZUEGE) {
      expect(z.text.trim().length).toBeGreaterThan(20)
      expect(z.label.length).toBeLessThanOrEqual(16)
      expect(z.titel.trim()).not.toBe('')
    }
  })

  it('haelt den Widerspruchs-Zug bereit', () => {
    // Der Zug, der EchoB von einer Bestaetigungsmaschine unterscheidet. Faellt er weg,
    // faellt das keinem auf - deshalb steht er hier.
    const w = PROFI_ZUEGE.find(z => z.id === 'widerspruch')
    expect(w).toBeDefined()
    expect(w!.text.toLowerCase()).toContain('gegen deine eigene')
  })
})
