/**
 * Von einer Szene zu einem Wunsch — die Zusammenführung.
 *
 * **Was hier stillschweigend schiefgehen kann.** Die Skizze hat eine Obergrenze, und der
 * Server schneidet ab. Das Bestehende muss vorn stehen — sonst verlöre jemand seine Skizze
 * an einen schlechten Abend. Damit fallen aber genau die NEUEN heraus, und zwar lautlos:
 * Die Person tippt drei Dinge an, drückt, und nichts erscheint.
 */
import { describe, expect, it } from 'vitest'
import { zusammenfuehren } from '@/components/app/kompass/WasGebraucht'

const A = (key: string, gewicht = 70) => ({ key, gewicht })

describe('zusammenfuehren', () => {
  it('haengt das Neue hinten an und laesst das Bestehende unangetastet', () => {
    const r = zusammenfuehren([A('a', 90), A('b', 30)], [{ key: 'c' }], 10)
    expect(r.aspekte).toEqual([A('a', 90), A('b', 30), { key: 'c', gewicht: 50 }])
    expect(r.passtNicht).toBe(0)
  })

  it('gibt dem Neuen die unangetastete Mitte', () => {
    // Ein Wunsch, der aus einer misslungenen Szene kommt, ist deshalb nicht der
    // wichtigste. Ihn hoch zu gewichten waere eine Aussage, die niemand getroffen hat.
    expect(zusammenfuehren([], [{ key: 'c' }], 10).aspekte[0].gewicht).toBe(50)
  })

  it('nimmt nichts doppelt auf und aendert sein Gewicht nicht', () => {
    const r = zusammenfuehren([A('a', 90)], [{ key: 'a' }, { key: 'b' }], 10)
    expect(r.aspekte).toEqual([A('a', 90), { key: 'b', gewicht: 50 }])
  })

  it('meldet, was nicht mehr hineinpasst - statt es still wegzuwerfen', () => {
    const voll = Array.from({ length: 10 }, (_, i) => A(`v${i}`))
    const r = zusammenfuehren(voll, [{ key: 'x' }, { key: 'y' }], 10)
    expect(r.aspekte).toHaveLength(10)
    expect(r.passtNicht).toBe(2)
  })

  it('fuellt bis genau an die Grenze und meldet nur den Rest', () => {
    const fast = Array.from({ length: 9 }, (_, i) => A(`v${i}`))
    const r = zusammenfuehren(fast, [{ key: 'x' }, { key: 'y' }], 10)
    expect(r.aspekte).toHaveLength(10)
    expect(r.aspekte[9]).toEqual({ key: 'x', gewicht: 50 })
    expect(r.passtNicht).toBe(1)
  })

  it('haelt eine leere Skizze und eine leere Wahl aus', () => {
    expect(zusammenfuehren([], [], 10)).toEqual({ aspekte: [], passtNicht: 0 })
  })

  it('wirft nichts weg, wenn die Grenze schon ueberschritten ist', () => {
    // Kann durch eine spaetere Aenderung der Obergrenze entstehen. Dann darf die
    // Zusammenfuehrung nicht anfangen, Bestehendes zu loeschen.
    const zuviel = Array.from({ length: 12 }, (_, i) => A(`v${i}`))
    const r = zusammenfuehren(zuviel, [{ key: 'x' }], 10)
    expect(r.aspekte).toHaveLength(12)
    expect(r.passtNicht).toBe(1)
  })
})
