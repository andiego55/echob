/**
 * Die zwei reinen Funktionen hinter den neuen Eingabeformen.
 *
 * **Warum ausgerechnet diese zwei.** Beide entscheiden etwas, das man am Bild nicht sieht.
 * `verschoben` wird von zwei Seiten benutzt (Notfallplan und Traumbeziehung) — ein Fehler
 * darin fiele an zwei Orten an und an beiden erst, wenn jemand den Pfeil am Rand drückt.
 * `stufe` liest gespeicherte Zahlen zurück in drei Antworten; verschiebt sich diese Grenze,
 * bekommt jemand eine andere Antwort angezeigt als die, die er gegeben hat.
 *
 * Alles andere an den beiden Formen ist Darstellung und gehört nicht in einen Test.
 */
import { describe, expect, it } from 'vitest'
import { verschoben } from '@/components/app/kompass/Reihung'
import { stufe, LINKS, MITTE, RECHTS } from '@/components/app/kompass/Waage'

describe('verschoben', () => {
  const l = ['a', 'b', 'c']

  it('tauscht mit dem Nachbarn', () => {
    expect(verschoben(l, 1, 'hoch')).toEqual(['b', 'a', 'c'])
    expect(verschoben(l, 1, 'runter')).toEqual(['a', 'c', 'b'])
  })

  it('gibt am Rand dieselbe Liste zurueck, nicht eine kuerzere', () => {
    // Das Identitaets-Pruefen ist Absicht: Die Form entscheidet daran, ob sie eine
    // Bewegung anzeigt. Eine neue, gleich aussehende Liste liesse sie blinken.
    expect(verschoben(l, 0, 'hoch')).toBe(l)
    expect(verschoben(l, 2, 'runter')).toBe(l)
  })

  it('haelt Unsinn aus, statt Eintraege zu erfinden', () => {
    expect(verschoben(l, -1, 'runter')).toBe(l)
    expect(verschoben(l, 9, 'hoch')).toBe(l)
    expect(verschoben([], 0, 'hoch')).toEqual([])
    expect(verschoben(['x'], 0, 'runter')).toEqual(['x'])
  })

  it('laesst die Eingabe unangetastet', () => {
    const vorher = [...l]
    verschoben(l, 1, 'hoch')
    expect(l).toEqual(vorher)
  })
})

describe('stufe', () => {
  it('liest die drei gespeicherten Werte zurueck', () => {
    expect(stufe(LINKS)).toBe('links')
    expect(stufe(MITTE)).toBe('mitte')
    expect(stufe(RECHTS)).toBe('rechts')
  })

  it('unterscheidet „beides gleich" von „nicht beantwortet"', () => {
    // Der eigentliche Grund, warum es diese Form neben `EntwederOder` gibt: Die Mitte ist
    // eine Antwort. Faellt dieser Unterschied, verschwindet eine haeufige und oft muehsam
    // errungene Auskunft im Rauschen.
    expect(stufe(50)).toBe('mitte')
    expect(stufe(undefined)).toBeNull()
  })

  it('ordnet auch Werte ein, die die Oberflaeche nie setzt', () => {
    // Der Server nimmt 0-100 entgegen. Was ein aelterer Client oder eine spaetere Form
    // geschrieben hat, muss trotzdem in einer der drei Stufen landen.
    expect(stufe(0)).toBe('links')
    expect(stufe(35)).toBe('links')
    expect(stufe(36)).toBe('mitte')
    expect(stufe(64)).toBe('mitte')
    expect(stufe(65)).toBe('rechts')
    expect(stufe(100)).toBe('rechts')
  })
})
