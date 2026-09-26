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
import {
  stufe, ordnen, erstesOffene, LINKS, MITTE, RECHTS,
} from '@/components/app/kompass/Waage'
import type { IdealAbwaegung } from '@/api/kompassIdeal'

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

// ── Die Waage: welche Frage wann ─────────────────────────────────────────────

describe('ordnen', () => {
  const P = (key: string, familien: string[]): IdealAbwaegung =>
    ({ key, links: 'l', rechts: 'r', hinweis: 'h', familien, arten: [] })

  const paare = [P('a', ['naehe']), P('b', []), P('c', ['umgang']), P('d', ['naehe', 'wert'])]

  it('stellt zuerst, was etwas Gewaehltes beruehrt', () => {
    expect(ordnen(paare, ['umgang']).map(p => p.key)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('stellt Paare ohne Bezug vor die unpassenden, nicht ans Ende', () => {
    // Manche Spannungen liegen in jeder Beziehung. Sie hinter die unpassenden zu stellen
    // hiesse, sie faktisch wegzulassen - kaum jemand kommt bis dorthin.
    expect(ordnen(paare, []).map(p => p.key)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('laesst nichts weg', () => {
    // Manchmal merkt man erst an der Frage, dass einem etwas fehlt, das man vorher nicht
    // benennen konnte. Sortiert wird, nicht gefiltert.
    expect(ordnen(paare, ['naehe']).length).toBe(paare.length)
  })

  it('haelt die Ordnung des Katalogs innerhalb der Gruppen', () => {
    // Eine Reihenfolge, die bei jedem Aufruf anders ist, macht aus einer Frage ein
    // Gluecksspiel - und aus zwei Durchlaeufen zwei verschiedene Skizzen.
    const einmal = ordnen(paare, ['naehe']).map(p => p.key)
    for (let i = 0; i < 5; i++) expect(ordnen(paare, ['naehe']).map(p => p.key)).toEqual(einmal)
    expect(einmal).toEqual(['a', 'd', 'b', 'c'])
  })

  it('kommt ohne das Feld `familien` zurecht', () => {
    // Ein aelterer Server liefert es nicht mit. Dann gilt jedes Paar als unbezogen,
    // statt dass die Anzeige abstuerzt.
    const alt = [{ key: 'x', links: 'l', rechts: 'r', hinweis: 'h', arten: [] }] as unknown as IdealAbwaegung[]
    expect(ordnen(alt, ['naehe']).map(p => p.key)).toEqual(['x'])
  })
})

describe('erstesOffene', () => {
  const P = (key: string): IdealAbwaegung =>
    ({ key, links: 'l', rechts: 'r', hinweis: 'h', familien: [], arten: [] })
  const paare = [P('a'), P('b'), P('c')]

  it('springt zur ersten unbeantworteten Frage', () => {
    expect(erstesOffene(paare, { a: 15 })).toBe(1)
    expect(erstesOffene(paare, { a: 15, b: 50 })).toBe(2)
  })

  it('zeigt die Uebersicht, wenn alles beantwortet ist', () => {
    expect(erstesOffene(paare, { a: 15, b: 50, c: 85 })).toBe(paare.length)
  })

  it('faengt bei nichts Beantwortetem vorn an', () => {
    expect(erstesOffene(paare, {})).toBe(0)
  })

  it('zaehlt die Mitte als beantwortet', () => {
    // Der eigentliche Grund fuer diese Form: "beides gleich" IST eine Antwort. Sie als
    // offen zu behandeln schickte jemanden immer wieder zu derselben Frage zurueck.
    expect(erstesOffene(paare, { a: 50, b: 50, c: 50 })).toBe(paare.length)
  })
})
