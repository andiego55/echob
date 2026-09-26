/**
 * Was sich zwischen zwei Skizzen bewegt hat.
 *
 * **Warum das Tests braucht.** Hier steht eine Aussage über einen Menschen, die er sich
 * selbst nicht geben kann: „Sicherheit stand damals an vierter Stelle und steht heute an
 * erster." Ist sie falsch, klingt sie trotzdem wie eine Einsicht — und wer eine falsche
 * Einsicht über sich liest, glaubt eher sie als sich.
 *
 * Besonders geprüft sind die Stellen, an denen eine Bewegung behauptet würde, die keine ist:
 * ein Aspekt, der vorher gar nicht geordnet war; eine Abwägung, die vorher offen war; zwei
 * Zahlen, die derselben Stufe angehören.
 */
import { describe, expect, it } from 'vitest'
import { wandel, wandelSatz } from '@/lib/skizzenwandel'
import type { IdealAbwaegung, SkizzenInhalt } from '@/api/kompassIdeal'

const PAARE: IdealAbwaegung[] = [
  { key: 'naehe_raum', links: 'Viel gemeinsame Zeit', rechts: 'Viel Zeit für mich', hinweis: '', familien: [], arten: [] },
  { key: 'ruhe_klaerung', links: 'Frieden im Alltag', rechts: 'Dinge ansprechen', hinweis: '', familien: [], arten: [] },
]

const s = (teil: Partial<SkizzenInhalt>): SkizzenInhalt =>
  ({ aspekte: [], reihung: [], abwaegungen: {}, eigenes: null, ...teil })

const A = (key: string, gewicht = 50, label = key) => ({ key, gewicht, label })

describe('wandel', () => {
  it('nennt neue und weggefallene Wuensche', () => {
    const w = wandel(
      s({ aspekte: [A('a', 50, 'Alpha'), A('b', 50, 'Beta')] }),
      s({ aspekte: [A('b', 50, 'Beta'), A('c', 50, 'Gamma')] }),
      PAARE,
    )
    expect(w.neu.map(x => x.label)).toEqual(['Gamma'])
    expect(w.weg.map(x => x.label)).toEqual(['Alpha'])
  })

  it('zaehlt nur als gewandert, wer BEIDE Male geordnet war', () => {
    // **Der wichtigste Test.** `b` war vorher ungeordnet und steht jetzt auf Platz eins -
    // das ist keine Wanderung, denn ueber ihn wurde vorher nichts gesagt. "Von nirgends
    // nach eins" waere eine erfundene Bewegung.
    //
    // `a` dagegen stand beide Male in der Reihenfolge und ist wirklich gerutscht; er MUSS
    // auftauchen. (Die erste Fassung dieses Tests erwartete eine leere Liste - da hatte
    // der Test unrecht und nicht die Rechnung.)
    const w = wandel(
      s({ aspekte: [A('a'), A('b')], reihung: ['a'] }),
      s({ aspekte: [A('a'), A('b')], reihung: ['b', 'a'] }),
      PAARE,
    )
    expect(w.gewandert.map(x => x.key)).toEqual(['a'])
    expect(w.gewandert[0]).toMatchObject({ vorher: 1, jetzt: 2 })
  })

  it('nennt die Wanderung mit beiden Plaetzen, groesste zuerst', () => {
    const w = wandel(
      s({ aspekte: [A('a'), A('b'), A('c')], reihung: ['a', 'b', 'c'] }),
      s({ aspekte: [A('a'), A('b'), A('c')], reihung: ['c', 'a', 'b'] }),
      PAARE,
    )
    expect(w.gewandert[0]).toMatchObject({ key: 'c', vorher: 3, jetzt: 1 })
    expect(w.gewandert.map(x => x.key)).toEqual(['c', 'a', 'b'])
  })

  it('meldet ein Gewicht erst ab einer deutlichen Aenderung', () => {
    // Ein Regler, den jemand um fuenf Punkte verschoben hat, ist keine Auskunft - er ist
    // die Ungenauigkeit eines Fingers auf einem Telefon.
    const klein = wandel(
      s({ aspekte: [A('a', 50)] }), s({ aspekte: [A('a', 60)] }), PAARE)
    expect(klein.gewicht).toEqual([])

    const gross = wandel(
      s({ aspekte: [A('a', 30, 'Alpha')] }), s({ aspekte: [A('a', 90, 'Alpha')] }), PAARE)
    expect(gross.gewicht[0]).toMatchObject({ vorher: 30, jetzt: 90 })
  })

  it('vergleicht Abwaegungen ueber die Stufe, nicht ueber die Zahl', () => {
    // 15 und 20 sind dieselbe Antwort. Ein Unterschied, den niemand angetippt hat, ist
    // keiner - und wuerde hier als Sinneswandel ausgegeben.
    const w = wandel(
      s({ abwaegungen: { naehe_raum: 15 } }),
      s({ abwaegungen: { naehe_raum: 20 } }),
      PAARE,
    )
    expect(w.gedreht).toEqual([])
  })

  it('nennt eine gedrehte Abwaegung mit beiden Seiten', () => {
    const w = wandel(
      s({ abwaegungen: { naehe_raum: 15 } }),
      s({ abwaegungen: { naehe_raum: 85 } }),
      PAARE,
    )
    expect(w.gedreht[0]).toMatchObject({
      vorher: 'Viel gemeinsame Zeit', jetzt: 'Viel Zeit für mich',
    })
  })

  it('macht aus einer vorher offenen Frage keine Drehung', () => {
    // Eine Frage, die vorher offen war, ist jetzt beantwortet - das ist eine neue Aussage,
    // keine gedrehte. Sie als Sinneswandel auszugeben waere eine Behauptung ueber ein
    // Damals, ueber das nichts bekannt ist.
    const w = wandel(s({}), s({ abwaegungen: { naehe_raum: 85 } }), PAARE)
    expect(w.gedreht).toEqual([])
  })

  it('erkennt „beides gleich" als eigene Antwort', () => {
    const w = wandel(
      s({ abwaegungen: { naehe_raum: 85 } }),
      s({ abwaegungen: { naehe_raum: 50 } }),
      PAARE,
    )
    expect(w.gedreht[0].jetzt).toContain('gleich')
  })

  it('unterscheidet die vier Zustaende der eigenen Worte', () => {
    expect(wandel(s({ eigenes: 'x' }), s({ eigenes: 'x' }), PAARE).eigenes).toBe('gleich')
    expect(wandel(s({ eigenes: 'x' }), s({ eigenes: 'y' }), PAARE).eigenes).toBe('geaendert')
    expect(wandel(s({}), s({ eigenes: 'y' }), PAARE).eigenes).toBe('neu')
    expect(wandel(s({ eigenes: 'x' }), s({}), PAARE).eigenes).toBe('weg')
    // Leerraum ist kein Unterschied.
    expect(wandel(s({ eigenes: ' x ' }), s({ eigenes: 'x' }), PAARE).eigenes).toBe('gleich')
  })

  it('meldet Ruhe, wenn nichts anders ist', () => {
    const gleich = s({ aspekte: [A('a', 50)], reihung: ['a'], abwaegungen: { naehe_raum: 85 }, eigenes: 'x' })
    expect(wandel(gleich, gleich, PAARE).ruhig).toBe(true)
  })

  it('kommt mit fehlenden Fassungen zurecht, statt abzustuerzen', () => {
    // Beim allerersten Neu-Skizzieren gibt es keine Vorfassung.
    expect(wandel(null, s({ aspekte: [A('a')] }), PAARE).neu.length).toBe(1)
    expect(wandel(undefined, undefined, PAARE).ruhig).toBe(true)
  })
})

describe('wandelSatz', () => {
  const satz = (v: SkizzenInhalt, j: SkizzenInhalt) => wandelSatz(wandel(v, j, PAARE))

  it('nennt keine Zahl und keine Note', () => {
    // Ein Prozentwert ueber die eigene Veraenderung waere eine Note fuer ein Leben.
    const faelle: [SkizzenInhalt, SkizzenInhalt][] = [
      [s({}), s({})],
      [s({ aspekte: [A('a')] }), s({ aspekte: [A('b')] })],
      [s({ aspekte: [A('a'), A('b'), A('c')], reihung: ['a', 'b', 'c'] }),
       s({ aspekte: [A('d'), A('e'), A('f')], reihung: ['f', 'e', 'd'] })],
    ]
    for (const [v, j] of faelle) {
      expect(satz(v, j)).not.toMatch(/\d/)
      expect(satz(v, j)).not.toMatch(/%|Prozent|besser|schlechter/i)
    }
  })

  it('sagt es auch, wenn nichts passiert ist', () => {
    expect(satz(s({}), s({}))).toContain('nichts')
  })

  it('unterscheidet wenig Bewegung von viel', () => {
    const wenig = satz(s({ aspekte: [A('a'), A('b')] }), s({ aspekte: [A('a'), A('c')] }))
    const viel = satz(
      s({ aspekte: [A('a'), A('b'), A('c'), A('d')] }),
      s({ aspekte: [A('e'), A('f'), A('g'), A('h')] }),
    )
    expect(wenig).not.toBe(viel)
  })
})
