/**
 * Die Bildsprache der Bildwerkstatt.
 *
 * **Warum diese Tests besonders wichtig sind.** Bei einem gerechneten Bild erzeugt ein Fehler
 * in der Rechnung kein hässliches Bild und keine Fehlermeldung — er erzeugt ein Bild, das
 * überzeugend aussieht und nicht stimmt. Sieben Szenen als sechs Marken. Zwei Momente genau
 * übereinander, also einer unsichtbar. Eine Dichtestufe, die von der Eingabereihenfolge
 * abhängt statt vom Gewicht.
 *
 * Nichts davon fällt beim Ansehen auf. Deshalb prüft diese Datei Eigenschaften und nicht
 * Aussehen: *jede Szene hat genau eine Marke*, *keine zwei liegen aufeinander*, *dasselbe
 * hinein ergibt dasselbe heraus*.
 */
import { describe, expect, it } from 'vitest'
import {
  PALETTEN,
  STANDARD_EINSTELLUNGEN,
  auswahl,
  genugFuerEinBild,
  lagebild,
  loch,
  markePfad,
  saat,
  type Anordnung,
  type BildEinstellungen,
  type BildWerte,
  BREITE,
  HOEHE,
} from '@/lib/lagebild'

const ANORDNUNGEN: Anordnung[] = ['zeit', 'spirale', 'feld', 'zwei_seiten']

function werte(anzahl = 12, extra: Partial<BildWerte> = {}): BildWerte {
  return {
    grundton: { temperatur: 0.4, unruhe: 0.6 },
    szenen: Array.from({ length: anzahl }, (_, i) => ({
      id: `s${i}`,
      tag: i * 37,
      gewicht: ((i * 7) % 10) / 10,
      haerte: ((i * 3) % 10) / 10,
    })),
    durchgaenge: [
      { key: 'boundary_violation', wert: 0.8 },
      { key: 'devaluation', wert: 0.45 },
      { key: 'kaum', wert: 0.1 },
    ],
    lichter: [{ id: 'a1', tag: 100 }, { id: 'a2', tag: 300 }],
    leerstellen: [{ key: 'verlaesslichkeit', wunsch: 0.9 }, { key: 'ruhe', wunsch: 0.5 }],
    druck: null,
    spanne: anzahl * 37,
    ...extra,
  }
}

const mit = (e: Partial<BildEinstellungen>): BildEinstellungen =>
  ({ ...STANDARD_EINSTELLUNGEN, ...e })

describe('jede Szene wird genau eine Marke', () => {
  it('in jeder Anordnung, bei voller Dichte', () => {
    // **Der wichtigste Test der Datei.** Eine verlorene Szene ist ein Bild, das weniger
    // zeigt, als da ist — und niemand sieht es.
    for (const anordnung of ANORDNUNGEN) {
      const { marken } = lagebild(werte(17), mit({ anordnung, dichte: 'alles' }))
      expect(marken, anordnung).toHaveLength(17)
      expect(new Set(marken.map(m => m.id)).size, anordnung).toBe(17)
    }
  })

  it('auch wenn alle Szenen am selben Tag liegen', () => {
    // Der Fall, der eine Zeitachse zum Punkt zusammenfallen lässt.
    const gleich = werte(9)
    gleich.szenen = gleich.szenen.map(s => ({ ...s, tag: 0 }))
    gleich.spanne = 0
    for (const anordnung of ANORDNUNGEN) {
      const { marken } = lagebild(gleich, mit({ anordnung, dichte: 'alles' }))
      expect(marken, anordnung).toHaveLength(9)
    }
  })
})

describe('keine zwei Marken liegen aufeinander', () => {
  it('in jeder Anordnung', () => {
    for (const anordnung of ANORDNUNGEN) {
      const { marken } = lagebild(werte(22), mit({ anordnung, dichte: 'alles' }))
      for (let i = 0; i < marken.length; i++) {
        for (let j = i + 1; j < marken.length; j++) {
          const a = marken[i]
          const b = marken[j]
          const abstand = Math.hypot(b.x - a.x, b.y - a.y)
          // Etwas Überlappung ist erlaubt und sogar gut — aber nicht so viel, dass eine
          // Marke in der anderen verschwindet.
          expect(abstand, `${anordnung}: ${a.id}/${b.id}`)
            .toBeGreaterThan(Math.max(a.r, b.r) * 0.5)
        }
      }
    }
  })

  it('auch bei neun Szenen am selben Tag', () => {
    const gleich = werte(9)
    gleich.szenen = gleich.szenen.map(s => ({ ...s, tag: 0 }))
    gleich.spanne = 0
    const { marken } = lagebild(gleich, mit({ anordnung: 'zeit', dichte: 'alles' }))
    const paare = marken.flatMap((a, i) =>
      marken.slice(i + 1).map(b => Math.hypot(b.x - a.x, b.y - a.y)))
    expect(Math.min(...paare)).toBeGreaterThan(5)
  })
})

describe('alles bleibt im Bild', () => {
  it('keine Marke liegt außerhalb der Leinwand', () => {
    for (const anordnung of ANORDNUNGEN) {
      // Auch mit Druck, der Positionen verschiebt.
      const { marken } = lagebild(
        werte(30, { druck: 0.9 }),
        mit({ anordnung, dichte: 'alles', schichten: [...STANDARD_EINSTELLUNGEN.schichten, 'druck'] }),
      )
      for (const m of marken) {
        expect(m.x, `${anordnung} x`).toBeGreaterThanOrEqual(0)
        expect(m.x, `${anordnung} x`).toBeLessThanOrEqual(BREITE)
        expect(m.y, `${anordnung} y`).toBeGreaterThanOrEqual(0)
        expect(m.y, `${anordnung} y`).toBeLessThanOrEqual(HOEHE)
      }
    }
  })
})

describe('dasselbe hinein, dasselbe heraus', () => {
  it('zwei Läufe ergeben Zeichen für Zeichen dasselbe SVG', () => {
    // **Ohne das ist ein aufgehobenes Bild nicht mehr dasselbe, wenn man es wieder öffnet.**
    // Math.random() an einer einzigen Stelle würde genau hier auffallen.
    const a = lagebild(werte(15), STANDARD_EINSTELLUNGEN)
    const b = lagebild(werte(15), STANDARD_EINSTELLUNGEN)
    expect(a.svg).toBe(b.svg)
  })

  it('die Saat ist stabil und liegt zwischen 0 und 1', () => {
    expect(saat('s1')).toBe(saat('s1'))
    expect(saat('s1')).not.toBe(saat('s2'))
    for (const t of ['', 'a', 'eine längere Kennung', '123']) {
      expect(saat(t)).toBeGreaterThanOrEqual(0)
      expect(saat(t)).toBeLessThan(1)
    }
  })
})

describe('die Dichte wählt nach Gewicht, nicht nach Reihenfolge', () => {
  it('karg behält die schwersten Szenen', () => {
    // Sonst wäre die Dichtestufe eine Frage der Eingabereihenfolge — und zwei Nutzer mit
    // denselben Szenen in anderer Folge bekämen andere Bilder.
    const w = werte(10)
    w.szenen = w.szenen.map((s, i) => ({ ...s, gewicht: i / 9 }))
    const gewaehlt = auswahl(w.szenen, 0.2)
    expect(gewaehlt.map(s => s.id)).toEqual(['s8', 's9'])
  })

  it('jede Stufe zeigt mehr als die vorige', () => {
    const w = werte(20)
    const zahlen = (['karg', 'wenig', 'normal', 'alles'] as const).map(
      dichte => lagebild(w, mit({ dichte })).marken.length)
    for (let i = 1; i < zahlen.length; i++) {
      expect(zahlen[i], `Stufe ${i}`).toBeGreaterThan(zahlen[i - 1])
    }
    expect(zahlen[3]).toBe(20)
  })

  it('auch die kargste Stufe zeigt mindestens eine Marke', () => {
    // Ein Bild ohne eine einzige Marke waere eine Flaeche, die aussieht wie ein Fehler.
    expect(lagebild(werte(2), mit({ dichte: 'karg' })).marken.length).toBeGreaterThan(0)
  })
})

describe('die Schichten lassen sich wirklich abschalten', () => {
  it('ohne Szenen gibt es keine Marken und kein Szenen-Element im SVG', () => {
    const ohne = lagebild(werte(8), mit({ schichten: ['grundton'] }))
    expect(ohne.marken).toHaveLength(0)
    expect(ohne.svg).not.toContain('data-szene')
  })

  it('jede Schicht hinterlaesst eine Spur, wenn sie an ist', () => {
    // Ein Schalter, der nichts tut, ist schlimmer als keiner: Man glaubt, das Element sei
    // beruecksichtigt.
    const voll = lagebild(werte(8), mit({
      schichten: ['grundton', 'szenen', 'durchgaenge', 'lichter', 'leerstellen', 'druck'],
    }), )
    const leer = lagebild(werte(8), mit({ schichten: [] }))
    expect(voll.svg.length).toBeGreaterThan(leer.svg.length * 2)

    for (const [schicht, spur] of [
      ['grundton', 'id="wetter"'],
      ['szenen', 'data-szene'],
      ['leerstellen', 'data-leer'],
      ['lichter', 'id="glanz"'],
    ] as const) {
      const nur = lagebild(werte(8), mit({ schichten: [schicht] }))
      expect(nur.svg, schicht).toContain(spur)
    }
  })

  it('der Druck ist eine Kraft und keine Gestalt', () => {
    // **Die Regel, die keine Figur zulaesst.** Der Druck verschiebt Marken und zeichnet
    // sonst nur einen Verlauf von der Kante. Waere er eine Form, stuende hier ein Objekt.
    const mitDruck = lagebild(werte(12, { druck: 0.8 }), mit({
      schichten: ['szenen', 'druck'],
    }))
    const ohneDruck = lagebild(werte(12, { druck: null }), mit({ schichten: ['szenen'] }))

    const mitte = (svg: ReturnType<typeof lagebild>) =>
      svg.marken.reduce((s, m) => s + m.x, 0) / svg.marken.length
    // Verdichtung nach links, messbar.
    expect(mitte(mitDruck)).toBeLessThan(mitte(ohneDruck))
    // Und im SVG nur ein Verlauf, kein Pfad, der eine Person sein koennte.
    expect(mitDruck.svg).toContain('id="druck"')
  })
})

describe('das SVG ist gueltig und vollstaendig', () => {
  it('hat einen Rahmen, eine Textalternative und schliesst', () => {
    for (const anordnung of ANORDNUNGEN) {
      const { svg } = lagebild(werte(12), mit({ anordnung }))
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
      expect(svg).toContain(`viewBox="0 0 ${BREITE} ${HOEHE}"`)
      // Ohne Titel ist das Bild fuer einen Screenreader eine leere Stelle.
      expect(svg).toContain('<title>')
      expect(svg).toContain('role="img"')
      // Keine unaufgeloesten Platzhalter und keine NaN-Koordinaten.
      expect(svg).not.toContain('NaN')
      expect(svg).not.toContain('undefined')
    }
  })

  it('auch bei leeren Werten', () => {
    const nichts: BildWerte = {
      grundton: null, szenen: [], durchgaenge: [], lichter: [], leerstellen: [],
      druck: null, spanne: 0,
    }
    const { svg, marken } = lagebild(nichts, STANDARD_EINSTELLUNGEN)
    expect(marken).toHaveLength(0)
    expect(svg).toContain('</svg>')
    expect(svg).not.toContain('NaN')
  })

  it('jede Palette erzeugt ein Bild mit ihren Farben', () => {
    for (const p of PALETTEN) {
      const { svg } = lagebild(werte(10), mit({ palette: p.key }))
      expect(svg, p.key).toContain(p.grund)
      expect(svg).not.toContain('NaN')
    }
  })
})

describe('die vier Fehler, die man am Bild nicht sieht', () => {
  it('die Haerte aendert die FORM einer Marke wirklich', () => {
    // **Die erste Fassung war ein Bezier-Konstrukt, in dem der Rundungsfaktor mit Null
    // multipliziert wurde.** Jede Marke kam als scharfe Raute heraus, unabhaengig von der
    // Haerte. Das Bild sah gut aus - und die einzige Eigenschaft, die die Haerte traegt,
    // fehlte vollstaendig.
    const weich = markePfad({ id: 'a', x: 500, y: 500, r: 40, haerte: 0, ton: 0 })
    const hart = markePfad({ id: 'a', x: 500, y: 500, r: 40, haerte: 1, ton: 0 })
    expect(weich).not.toBe(hart)

    // Und der Unterschied ist der richtige: Eine runde Marke ist voller als eine spitze.
    // Gemessen als Flaeche (Gauss'sche Trapezformel) und nicht an einzelnen Punkten - ein
    // Punktmass haengt davon ab, wo die Abtastung gerade hinfaellt, und mein erster Versuch
    // hat genau daran falsch gemessen.
    const flaeche = (d: string) => {
      const pk = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)]
        .map(m => [Number(m[1]), Number(m[2])] as const)
      let summe = 0
      for (let i = 0; i < pk.length; i++) {
        const [x1, y1] = pk[i]
        const [x2, y2] = pk[(i + 1) % pk.length]
        summe += x1 * y2 - x2 * y1
      }
      return Math.abs(summe) / 2
    }
    // Kreis: pi*r^2 ~ 5027. Raute: 2*r^2 = 3200.
    expect(flaeche(weich)).toBeGreaterThan(flaeche(hart) * 1.3)
    expect(flaeche(weich)).toBeGreaterThan(4700)
    expect(flaeche(hart)).toBeLessThan(3600)
  })

  it('jede Zwischenstufe der Haerte ergibt eine eigene Form', () => {
    const formen = [0, 0.25, 0.5, 0.75, 1].map(haerte =>
      markePfad({ id: 'a', x: 500, y: 500, r: 40, haerte, ton: 0 }))
    expect(new Set(formen).size).toBe(5)
  })

  it('die Turbulenz hat eine Frequenz groesser als Null', () => {
    // **Eine Rundung auf eine Nachkommastelle hat hier eine ganze Schicht stillgelegt.**
    // Die Frequenz liegt bei 0,004 bis 0,024; gerundet wird daraus 0, und feTurbulence mit
    // baseFrequency="0" erzeugt kein Rauschen. Der Grundton war ein glatter Verlauf statt
    // einer Textur - unsichtbar, weil ein glatter Verlauf auch gut aussieht.
    for (const unruhe of [0, 0.3, 0.68, 1]) {
      const { svg } = lagebild(
        werte(6, { grundton: { temperatur: 0.4, unruhe } }),
        mit({ schichten: ['grundton'] }))
      const treffer = svg.match(/baseFrequency="([\d.]+)"/)
      expect(treffer, `unruhe ${unruhe}`).toBeTruthy()
      expect(Number(treffer![1]), `unruhe ${unruhe}`).toBeGreaterThan(0)
    }
  })

  it('mehr Unruhe heisst mehr Rauheit', () => {
    const frequenz = (unruhe: number) => Number(
      lagebild(werte(6, { grundton: { temperatur: 0.4, unruhe } }),
        mit({ schichten: ['grundton'] })).svg.match(/baseFrequency="([\d.]+)"/)![1])
    expect(frequenz(0.9)).toBeGreaterThan(frequenz(0.1))
  })

  it('ein Licht liegt bei der Marke, die ZEITLICH am naechsten ist', () => {
    // **Die erste Fassung verglich Hashwerte statt Zeiten** und streute die Lichter
    // irgendwohin - bei der Probe lagen zwei am linken Rand, wo gar nichts war. Auch das
    // faellt beim Ansehen nicht auf: Ein Licht sieht ueberall gut aus.
    const w = werte(10)
    // Eine Erkenntnis am Tag der letzten Szene.
    const letzte = w.szenen[w.szenen.length - 1]
    w.lichter = [{ id: 'erkenntnis', tag: letzte.tag }]

    const { svg, marken } = lagebild(w, mit({
      anordnung: 'zeit', dichte: 'alles', schichten: ['szenen', 'lichter'],
    }))
    const licht = svg.match(/cx="([\d.]+)" cy="([\d.]+)" r="3.5"/)
    expect(licht).toBeTruthy()
    const lx = Number(licht![1])
    const ly = Number(licht![2])

    const nah = marken.find(m => m.id === letzte.id)!
    const fern = marken.find(m => m.id === w.szenen[0].id)!
    expect(Math.hypot(lx - nah.x, ly - nah.y))
      .toBeLessThan(Math.hypot(lx - fern.x, ly - fern.y))
  })

  it('keine Marke liegt in einer Leerstelle', () => {
    // Eine Leerstelle heisst „hier ist nichts". Eine Marke darin macht die Aussage
    // zunichte, und im Bild sieht es aus wie ein Versehen.
    const w = werte(26, {
      leerstellen: [
        { key: 'verlaesslichkeit', wunsch: 1 },
        { key: 'ruhe', wunsch: 0.8 },
        { key: 'offenheit', wunsch: 0.6 },
      ],
    })
    for (const anordnung of ANORDNUNGEN) {
      if (anordnung === 'zwei_seiten') continue  // dort sind es Ringe, keine Loecher
      const { marken } = lagebild(w, mit({ anordnung, dichte: 'alles' }))
      for (const l of w.leerstellen) {
        const { x, y, r } = loch(l)
        for (const m of marken) {
          expect(Math.hypot(m.x - x, m.y - y), `${anordnung}/${l.key}/${m.id}`)
            .toBeGreaterThanOrEqual(r)
        }
      }
    }
  })

  it('das Loch im Bild liegt dort, wo loch() es hinrechnet', () => {
    // Zwei Stellen, die dasselbe berechnen, laufen beim ersten Umbau auseinander.
    const w = werte(4, { leerstellen: [{ key: 'ruhe', wunsch: 0.5 }] })
    const { svg } = lagebild(w, mit({ schichten: ['leerstellen'] }))
    const { x, y, r } = loch(w.leerstellen[0])
    expect(svg).toContain(`cx="${Math.round(x * 10) / 10}"`)
    expect(svg).toContain(`cy="${Math.round(y * 10) / 10}"`)
    expect(svg).toContain(`r="${Math.round(r * 10) / 10}"`)
  })
})

describe('genugFuerEinBild', () => {
  it('ein leerer Fall bekommt kein leeres Quadrat', () => {
    expect(genugFuerEinBild({
      grundton: null, szenen: [], durchgaenge: [], lichter: [], leerstellen: [],
      druck: null, spanne: 0,
    })).toBe(false)
  })

  it('zwei Szenen genuegen, ein Gefuehlsbild allein auch', () => {
    expect(genugFuerEinBild(werte(2))).toBe(true)
    expect(genugFuerEinBild({
      grundton: { temperatur: 0.5, unruhe: 0.5 }, szenen: [], durchgaenge: [],
      lichter: [], leerstellen: [], druck: null, spanne: 0,
    })).toBe(true)
  })
})
