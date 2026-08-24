/**
 * Die Stille im Vorlese-Modus.
 *
 * **Warum geprüft.** Ehrliches Mitteilen endet damit, dass sich zwei Menschen ihre Sätze
 * laut vorlesen — und zwischen zwei Sätzen nichts sagen. Im Kreis stellt sich diese Pause
 * von selbst ein, weil es unangenehm wäre hineinzureden; zu zweit überspringt man sie und
 * redet weiter. Der Modus erzwingt sie deshalb als eigenen Schritt.
 *
 * Genau das kann lautlos verschwinden: Wer die Schrittfolge später zusammenfasst, entfernt
 * die Pause, und nichts wird rot. Der Modus liefe weiter — nur eben ohne das, wofür es ihn
 * gibt.
 */
import { describe, expect, it } from 'vitest'
import { schritteBauen, zuletztGelesen } from '../src/lib/vorlesen'

describe('Takt des Vorlesens', () => {
  it('legt hinter jede Mitteilung eine Stille – auch hinter die letzte', () => {
    const arten = schritteBauen(3).map(s => s.art)
    expect(arten).toEqual([
      'intro',
      'lesen', 'stille',
      'lesen', 'stille',
      'lesen', 'stille',
      'ende',
    ])
  })

  it('führt die Mitteilungen in der Reihenfolge der Runde', () => {
    const gelesen = schritteBauen(4)
      .filter((s): s is { art: 'lesen'; i: number } => s.art === 'lesen')
      .map(s => s.i)
    expect(gelesen).toEqual([0, 1, 2, 3])
  })

  it('kommt auch ohne Mitteilungen von vorn nach hinten', () => {
    // Eine Runde, in der niemand etwas gesagt hat, darf keinen leeren Bildschirm zeigen.
    expect(schritteBauen(0).map(s => s.art)).toEqual(['intro', 'ende'])
  })

  it('lässt keine Mitteilung ohne Anfang und Ende stehen', () => {
    const s = schritteBauen(2)
    expect(s[0].art).toBe('intro')
    expect(s[s.length - 1].art).toBe('ende')
    expect(s.filter(x => x.art === 'lesen')).toHaveLength(2)
    expect(s.filter(x => x.art === 'stille')).toHaveLength(2)
  })
})

describe('Fortschrittsmarken', () => {
  it('zählt eine Mitteilung während der Stille danach als gelesen', () => {
    // Sonst sähe es in der Pause aus, als wäre gerade nichts geschehen.
    const s = schritteBauen(2)
    expect(zuletztGelesen(s, 1)).toBe(-1)   // steht auf der ersten Mitteilung
    expect(zuletztGelesen(s, 2)).toBe(0)    // Stille danach
    expect(zuletztGelesen(s, 4)).toBe(1)    // Stille nach der zweiten
  })

  it('meldet vor der ersten Mitteilung nichts als gelesen', () => {
    expect(zuletztGelesen(schritteBauen(3), 0)).toBe(-1)
  })
})
