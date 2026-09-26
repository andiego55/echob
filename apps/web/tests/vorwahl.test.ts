/**
 * Die Vorwahl — sechs leichte Fragen statt einer unmöglichen.
 *
 * **Was hier auf dem Spiel steht.** Das Ergebnis wird als Vorbelegung in die Skizze
 * geschrieben, also legt diese Rechnung jemandem Wünsche in den Mund. Ein Fehler darin ist
 * nicht sichtbar: Eine falsche Vorbelegung sieht aus wie ein Missverständnis über einen
 * selbst — und wer sich in seiner eigenen Skizze nicht wiedererkennt, glaubt eher, er habe
 * sich falsch eingeschätzt, als dass die Anwendung falsch gerechnet hat.
 *
 * Deshalb geprüft: dass niemand einen Wunsch bekommt, den er nicht gewonnen hat; dass das
 * Ergebnis bei gleicher Eingabe gleich bleibt; und dass ein Unentschieden keine Entscheidung
 * herbeiführt.
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_VORBELEGT, ergebnis, fertig, fortschritt, herausforderer, starten, zug,
  type Stand, type Wahl,
} from '@/lib/vorwahl'

const FELD = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

/** Spielt eine ganze Vorwahl durch. */
function spielen(feld: string[], wahlen: Wahl[]): Stand {
  return wahlen.reduce<Stand>((s, w) => zug(s, w), starten(feld))
}

describe('Ablauf', () => {
  it('stellt n-1 Fragen, nicht n hoch zwei', () => {
    let s = starten(FELD)
    let fragen = 0
    while (!fertig(s)) { s = zug(s, 'regent'); fragen++ }
    expect(fragen).toBe(FELD.length - 1)
  })

  it('laesst jeden Kandidaten genau einmal antreten', () => {
    let s = starten(FELD)
    const gesehen: string[] = []
    while (!fertig(s)) { gesehen.push(herausforderer(s)!); s = zug(s, 'regent') }
    expect(gesehen).toEqual(FELD.slice(1))
  })

  it('setzt den Regenten ab, wenn der Herausforderer gewinnt', () => {
    const s = zug(starten(FELD), 'herausforderer')
    expect(s.regent).toBe('b')
    expect(s.throne).toEqual(['a', 'b'])
  })

  it('zaehlt und bewegt nichts mehr, wenn niemand mehr antritt', () => {
    let s = starten(['a', 'b'])
    s = zug(s, 'regent')
    expect(fertig(s)).toBe(true)
    // Ein zusaetzlicher Zug darf nichts veraendern - sonst zaehlte ein doppelter Klick
    // am Ende einen Sieg dazu, den niemand vergeben hat.
    expect(zug(s, 'herausforderer')).toEqual(s)
  })

  it('kommt mit einem zu kleinen Feld zurecht, statt eine Frage ohne Gegner zu zeigen', () => {
    expect(fertig(starten([]))).toBe(true)
    expect(fertig(starten(['a']))).toBe(true)
    expect(herausforderer(starten(['a']))).toBeNull()
    expect(ergebnis(starten(['a'])).aspekte).toEqual([])
  })

  it('wirft Doppelte aus dem Feld', () => {
    // Zwei gleiche Kandidaten ergaeben ein Duell gegen sich selbst.
    expect(starten(['a', 'b', 'a']).feld).toEqual(['a', 'b'])
  })

  it('zaehlt die Fragen von eins bis n-1', () => {
    let s = starten(FELD)
    expect(fortschritt(s)).toEqual({ frage: 1, von: 6 })
    s = zug(s, 'regent')
    expect(fortschritt(s)).toEqual({ frage: 2, von: 6 })
  })

  it('aendert den uebergebenen Stand nicht', () => {
    const vorher = starten(FELD)
    const kopie = JSON.parse(JSON.stringify(vorher))
    zug(vorher, 'herausforderer')
    expect(vorher).toEqual(kopie)
  })
})

describe('Ergebnis', () => {
  it('traegt nur ein, wer wirklich gewonnen hat', () => {
    // **Der wichtigste Test.** Wer in seinem einzigen Duell verloren hat, ist keine Aussage
    // gegen ihn - aber auch keine fuer ihn. Ihn einzutragen hiesse, jemandem einen Wunsch
    // zuzuschreiben, den er nicht geaeussert hat.
    const s = spielen(FELD, ['regent', 'regent', 'regent', 'regent', 'regent', 'regent'])
    expect(ergebnis(s).aspekte.map(a => a.key)).toEqual(['a'])
  })

  it('gibt dem Staerksten 90 und nicht 100', () => {
    // Eine volle Zahl saehe aus wie ein Ergebnis. Die Vorwahl ist ein Anfang.
    const s = spielen(FELD, ['regent', 'regent', 'regent', 'regent', 'regent', 'regent'])
    expect(ergebnis(s).aspekte[0].gewicht).toBe(90)
  })

  it('ordnet nach Siegen und macht daraus die Reihenfolge', () => {
    // a gewinnt zweimal, dann uebernimmt d und gewinnt dreimal.
    const s = spielen(FELD, ['regent', 'regent', 'herausforderer', 'regent', 'regent', 'regent'])
    const e = ergebnis(s)
    expect(e.aspekte.map(a => a.key)).toEqual(['d', 'a'])
    expect(e.reihung).toEqual(['d', 'a'])
    expect(e.aspekte[0].gewicht).toBeGreaterThan(e.aspekte[1].gewicht)
  })

  it('bricht Gleichstand mit dem spaeteren Thron, nicht mit dem Zufall', () => {
    // b gewinnt einmal (schlaegt a), dann c einmal (schlaegt b), dann bleibt c.
    // b und c haetten ohne Brecher beide einen Sieg - c hat aber den bis dahin
    // Staerksten geschlagen.
    const s = spielen(['a', 'b', 'c'], ['herausforderer', 'herausforderer'])
    expect(ergebnis(s).aspekte.map(a => a.key)).toEqual(['c', 'b'])
  })

  it('macht aus einem Unentschieden keine Entscheidung', () => {
    // Beide bekommen einen halben Punkt, und der Regent bleibt: Ihn abzusetzen, ohne dass
    // jemand ihn geschlagen hat, waere eine Aussage, die niemand getroffen hat.
    const s = zug(starten(['a', 'b']), 'gleich')
    expect(s.regent).toBe('a')
    expect(s.siege).toEqual({ a: 0.5, b: 0.5 })
    const e = ergebnis(s)
    expect(e.aspekte.map(a => a.key)).toEqual(['a', 'b'])
    expect(e.aspekte[0].gewicht).toBe(e.aspekte[1].gewicht)
  })

  it('belegt hoechstens fuenf vor', () => {
    // Mehr waere keine Richtung mehr, sondern wieder die lange Liste.
    const gross = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const s = spielen(gross, new Array(gross.length - 1).fill('herausforderer'))
    expect(ergebnis(s).aspekte.length).toBe(MAX_VORBELEGT)
    expect(ergebnis(s).reihung.length).toBeLessThanOrEqual(MAX_VORBELEGT)
  })

  it('liefert bei gleicher Eingabe dasselbe Ergebnis - immer', () => {
    const wahlen: Wahl[] = ['regent', 'herausforderer', 'gleich', 'regent', 'herausforderer', 'regent']
    const einmal = JSON.stringify(ergebnis(spielen(FELD, wahlen)))
    for (let i = 0; i < 5; i++) {
      expect(JSON.stringify(ergebnis(spielen(FELD, wahlen)))).toBe(einmal)
    }
  })

  it('gibt nur Gewichte zwischen 45 und 90 aus', () => {
    const wahlen: Wahl[] = ['herausforderer', 'regent', 'gleich', 'herausforderer', 'regent', 'gleich']
    for (const a of ergebnis(spielen(FELD, wahlen)).aspekte) {
      expect(a.gewicht).toBeGreaterThanOrEqual(45)
      expect(a.gewicht).toBeLessThanOrEqual(90)
    }
  })

  it('reiht genau die ein, die es auch eintraegt', () => {
    // Eine Reihenfolge ueber etwas Unsichtbares waere keine Aussage - derselbe Fehler,
    // gegen den die Skizzen-Seite ihre Reihung filtert.
    const wahlen: Wahl[] = ['regent', 'herausforderer', 'regent', 'gleich', 'herausforderer', 'regent']
    const e = ergebnis(spielen(FELD, wahlen))
    expect(e.reihung).toEqual(e.aspekte.map(a => a.key))
  })
})
