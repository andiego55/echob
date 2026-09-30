/**
 * Die reine Logik des Podcast-Studios.
 *
 * **Warum es diese Tests gibt.** Ein Nutzer hat gefragt, wie man den Podcast abspielt — weil
 * im Regal eine Zustandsbeschreibung stand („Skript steht — noch nicht gesprochen") statt
 * einer Aufforderung. Das ist behoben. Ohne Test wäre es eine Formulierung, die beim nächsten
 * Umbau still zurückfällt, und die Frage käme wieder.
 *
 * Geprüft wird nur, was ohne React prüfbar ist: Der Testaufbau dieses Projekts ist bewusst
 * `environment: 'node'`. Deshalb liegen diese drei Regeln in `lib/podcast.ts` und nicht in den
 * Komponenten, in denen sie zuerst standen.
 */
import { describe, expect, it } from 'vitest'
import {
  anspracheFuerFormat,
  reglerFuerFormat,
  stand,
  zeit,
} from '@/lib/podcast'

describe('zeit', () => {
  it('schreibt Sekunden immer zweistellig', () => {
    // `4:7` liest sich als sieben Minuten.
    expect(zeit(247)).toBe('4:07')
    expect(zeit(60)).toBe('1:00')
    expect(zeit(59)).toBe('0:59')
  })

  it('haelt auch lange Folgen aus', () => {
    expect(zeit(1200)).toBe('20:00')
    expect(zeit(3661)).toBe('61:01')
  })

  it('ergibt bei Fehlendem 0:00 und nicht NaN', () => {
    // Eine Dauer, die noch niemand gemessen hat, ist der Normalfall vor dem Sprechen —
    // kein Fehler. `NaN:NaN` auf dem Schirm sieht dagegen nach einem kaputten Abspieler aus.
    expect(zeit(null)).toBe('0:00')
    expect(zeit(undefined)).toBe('0:00')
    expect(zeit(0)).toBe('0:00')
    expect(zeit(-5)).toBe('0:00')
    expect(zeit(Number.NaN)).toBe('0:00')
    expect(zeit(Number.POSITIVE_INFINITY)).toBe('0:00')
  })

  it('schneidet ab statt zu runden', () => {
    // Aufgerundet stuende bei 59,6 Sekunden „1:00" — und die Folge waere laut Anzeige
    // laenger als der Abspieler sie spielt.
    expect(zeit(59.9)).toBe('0:59')
  })
})

describe('stand', () => {
  it('sagt bei einem fertigen Text, was zu TUN ist', () => {
    // **Der Test, um den es geht.** Eine Zustandsbeschreibung liess einen Nutzer ratlos.
    const s = stand({ status: 'skript', sekunden: null })
    expect(s.offen).toBe(true)
    expect(s.text).toMatch(/sprechen lassen/)
    expect(s.text).toContain('→')
  })

  it('zeigt bei einer fertigen Folge ihre Laenge', () => {
    expect(stand({ status: 'fertig', sekunden: 247 })).toEqual({
      text: '4:07', offen: false,
    })
  })

  it('macht aus einem Abbruch eine Aufforderung', () => {
    // „abgebrochen" allein liest sich wie ein Totalverlust. Die fertigen Kapitel bleiben.
    const s = stand({ status: 'fehler', sekunden: null })
    expect(s.offen).toBe(true)
    expect(s.text).toMatch(/weitermachen/)
  })

  it('draengt nicht, waehrend gesprochen wird', () => {
    // Hier ist wirklich nichts zu tun — eine Aufforderung waere eine Einladung, ein zweites
    // Mal zu klicken. Genau das hat ein Nutzer getan, als er nicht sah, ob etwas passiert.
    expect(stand({ status: 'spricht', sekunden: null }).offen).toBe(false)
  })

  it('behandelt alte Folgen ohne Text als erledigungsbeduerftig', () => {
    // Sie entstehen nicht mehr neu, aber es gibt sie. Als grauer Zustandstext stuenden sie
    // unauffaellig da - obwohl dort wirklich etwas zu tun ist, naemlich loeschen.
    const s = stand({ status: 'entwurf', sekunden: null })
    expect(s.offen).toBe(true)
    expect(s.text).toContain('→')
  })

  it('gibt fuer jeden Stand einen Text', () => {
    // Ohne diese Schranke bliebe ein neuer Stand ohne Beschriftung, und im Regal stuende
    // eine leere Stelle.
    for (const status of ['entwurf', 'skript', 'spricht', 'fertig', 'fehler'] as const) {
      expect(stand({ status, sekunden: 100 }).text.length).toBeGreaterThan(3)
    }
  })
})

describe('reglerFuerFormat', () => {
  it('behaelt die Stufe von Elementen, die es weiter gibt', () => {
    // Wer die Szenen auf „im Mittelpunkt" gestellt hat und dann das Format wechselt, meint
    // das immer noch.
    const neu = reglerFuerFormat(
      ['szenen', 'artefakte'],
      { szenen: 'mittelpunkt', artefakte: 'aus', hypothesen: 'normal' },
    )
    expect(neu.szenen).toBe('mittelpunkt')
    expect(neu.artefakte).toBe('aus')
  })

  it('wirft weg, was das neue Format nicht vertraegt', () => {
    // Sonst schickt die Oberflaeche eine Gewichtung fuer ein Element, das der Server fuer
    // dieses Format abweist — und der Fehler waere nicht erklaerbar.
    const neu = reglerFuerFormat(['szenen'], { szenen: 'normal', hypothesen: 'mittelpunkt' })
    expect(Object.keys(neu)).toEqual(['szenen'])
  })

  it('setzt neue Elemente auf normal und nie auf aus', () => {
    // Ein Element, das nach einem Wechsel still abgewaehlt waere, fehlte spaeter im
    // Podcast, und niemand koennte sich das erklaeren.
    const neu = reglerFuerFormat(['szenen', 'gefuehlsbild'], { szenen: 'rand' })
    expect(neu.gefuehlsbild).toBe('normal')
  })

  it('kommt mit leeren Vorgaben zurecht', () => {
    expect(reglerFuerFormat(['szenen'], {})).toEqual({ szenen: 'normal' })
    expect(reglerFuerFormat([], { szenen: 'rand' })).toEqual({})
  })
})

describe('anspracheFuerFormat', () => {
  it('behaelt eine passende Ansprache', () => {
    expect(anspracheFuerFormat(['du', 'ich'], 'ich')).toBe('ich')
  })

  it('nimmt die erste, wenn die bisherige nicht passt', () => {
    // Behielte man sie, wiese der Server die Bestellung mit 422 ab, und an der Oberflaeche
    // saehe man nicht, woran es lag.
    expect(anspracheFuerFormat(['du'], 'neutral')).toBe('du')
    expect(anspracheFuerFormat(['ich'], null)).toBe('ich')
  })

  it('gibt null, wenn ein Format keine Ansprache hat', () => {
    // Sollte es nicht geben - ein Waechter im Backend prueft es. Hier darf es trotzdem
    // nichts umwerfen.
    expect(anspracheFuerFormat([], 'du')).toBeNull()
  })
})
