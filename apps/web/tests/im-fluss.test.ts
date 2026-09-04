/**
 * Die Trennung zwischen fertigem und laufendem Text.
 *
 * Das Flackern kam daher, dass wachsender Text 37- bis 60-mal pro Sekunde als Markdown
 * geparst wurde — und unfertige Auszeichnung dabei sichtbar hin und her kippte. Der Fix
 * teilt am letzten abgeschlossenen Absatz. Hier wird geprüft, dass diese Grenze stimmt:
 * Liegt sie falsch, ist entweder das Flackern zurück (zu spät geschnitten) oder ein Absatz
 * verschwindet (zu früh).
 */
import { describe, expect, it } from 'vitest'
import { teilenImFluss as teilen } from '../src/lib/imFluss'

describe('ImFluss: fertig vs. laufend', () => {
  it('lässt den ersten Absatz ganz als laufend stehen', () => {
    // Solange kein Absatz abgeschlossen ist, darf NICHTS als fertig gelten - sonst
    // formatiert sich der Satz, an dem gerade geschrieben wird.
    const { fertig, laufend } = teilen('Das klingt nach einem schweren Abend')
    expect(fertig).toBe('')
    expect(laufend).toBe('Das klingt nach einem schweren Abend')
  })

  it('schneidet am ersten abgeschlossenen Absatz', () => {
    const { fertig, laufend } = teilen('Erster Absatz.\n\nDer zweite fängt an')
    expect(fertig).toBe('Erster Absatz.')
    expect(laufend).toBe('Der zweite fängt an')
  })

  it('schneidet am LETZTEN abgeschlossenen Absatz, nicht am ersten', () => {
    const { fertig, laufend } = teilen('Eins.\n\nZwei.\n\nDrei entsteht')
    expect(fertig).toBe('Eins.\n\nZwei.')
    expect(laufend).toBe('Drei entsteht')
  })

  it('hält unfertige Fettschrift aus dem Markdown heraus', () => {
    // Genau der Fall, der geflackert hat: **Wich steht als Sternchen da und springt in
    // Fettschrift, sobald das Paar zugeht. Im laufenden Teil passiert das nicht.
    const { fertig, laufend } = teilen('Fertig.\n\nDas ist **wich')
    expect(fertig).not.toContain('**wich')
    expect(laufend).toBe('Das ist **wich')
  })

  it('hält eine entstehende Liste aus dem Markdown heraus', () => {
    const { laufend } = teilen('Text.\n\n- Erster Punkt\n- Zweiter entst')
    expect(laufend).toContain('- Erster Punkt')
  })

  it('lässt nichts verschwinden — beide Teile ergeben wieder das Ganze', () => {
    for (const text of [
      'Nur ein Satz',
      'Eins.\n\nZwei.',
      'Eins.\n\nZwei.\n\n',
      '',
      'a\n\nb\n\nc\n\nd',
    ]) {
      const { fertig, laufend } = teilen(text)
      const wieder = fertig ? `${fertig}\n\n${laufend}` : laufend
      expect(wieder).toBe(text)
    }
  })

  it('kommt mit einem gerade begonnenen Absatzumbruch zurecht', () => {
    // Der Moment, in dem \n\n eintrifft, aber noch kein Zeichen danach steht.
    const { fertig, laufend } = teilen('Erster Absatz.\n\n')
    expect(fertig).toBe('Erster Absatz.')
    expect(laufend).toBe('')
  })
})
