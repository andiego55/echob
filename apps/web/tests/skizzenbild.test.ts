/**
 * Das Bild und der Text einer Skizze — beides ohne Modell, und deshalb prüfbar.
 *
 * **Warum das Tests braucht.** Hier steht ein Text über einen Menschen, zusammengesetzt aus
 * seinen eigenen Angaben. Das Versprechen daneben lautet: *Echo hat daran nichts geschrieben
 * und nichts hinzugefügt.* Ein Fehler in dieser Zusammensetzung bricht genau dieses
 * Versprechen — und zwar leise, weil ein falscher Satz über einen selbst nicht wie ein Fehler
 * aussieht, sondern wie ein Missverständnis.
 *
 * Die Reihenfolge und die Breiten sind aus demselben Grund geprüft: Sie sind die Aussage des
 * Bildes. Ein Band, das die falsche Breite hat, behauptet ein Gewicht, das niemand gesetzt hat.
 */
import { describe, expect, it } from 'vitest'
import {
  gestalt, reihungsVorschlag, satzTeile, zitat,
  type Entwurf, type Vokabular,
} from '@/lib/skizzenbild'
import { bandBreite } from '@/components/app/kompass/SkizzenBaender'

const V: Vokabular = {
  aspekt_familien: [
    {
      key: 'sicherheit', label: 'Sicherheit', hinweis: 'x',
      aspekte: [
        { key: 'nicht_wachsam', label: 'Ich muss nicht aufpassen', hinweis: 'h1', arten: [] },
        { key: 'nicht_klein', label: 'Ich werde nicht kleingemacht', hinweis: 'h2', arten: [] },
      ],
    },
    {
      key: 'naehe', label: 'Nähe', hinweis: 'y',
      aspekte: [
        { key: 'gehoert_werden', label: 'Gehört werden', hinweis: 'h3', arten: [] },
        { key: 'eigener_raum', label: 'Eigener Raum', hinweis: 'h4', arten: [] },
      ],
    },
  ],
  abwaegungen: [
    { key: 'naehe_raum', links: 'Viel gemeinsame Zeit', rechts: 'Viel Zeit für mich', hinweis: 'z', arten: [] },
    { key: 'ruhe_klaerung', links: 'Frieden im Alltag', rechts: 'Dinge ansprechen', hinweis: 'z', arten: [] },
  ],
}

const LEER: Entwurf = { aspekte: [], reihung: [], abwaegungen: {}, eigenes: '' }

/** Nur die Marken — das, was aus dem Katalog kommt und nicht aus unserer Feder. */
const marken = (absatz: { art: string; wert: string }[]) =>
  absatz.filter(x => x.art === 'marke').map(x => x.wert)

/** Der ganze Absatz als Zeichenkette, so wie eine Person ihn liest. */
const gelesen = (absatz: { wert: string }[]) => absatz.map(x => x.wert).join('')

// ── Das Bild ─────────────────────────────────────────────────────────────────

describe('gestalt', () => {
  it('ist leer, solange nichts gewaehlt ist', () => {
    expect(gestalt(LEER, V)).toEqual([])
  })

  it('stellt die geordneten nach oben, in GENAU ihrer Ordnung', () => {
    const e: Entwurf = {
      ...LEER,
      aspekte: [
        { key: 'nicht_wachsam', gewicht: 20 },
        { key: 'gehoert_werden', gewicht: 100 },
      ],
      // Die Reihenfolge widerspricht dem Gewicht — sie muss trotzdem gelten.
      reihung: ['nicht_wachsam'],
    }
    const b = gestalt(e, V)
    expect(b.map(x => x.key)).toEqual(['nicht_wachsam', 'gehoert_werden'])
    expect(b[0].geordnet).toBe(true)
    expect(b[1].geordnet).toBe(false)
  })

  it('sortiert das Uebrige nach Gewicht, bei Gleichstand nach dem Katalog', () => {
    const e: Entwurf = {
      ...LEER,
      aspekte: [
        { key: 'eigener_raum', gewicht: 50 },
        { key: 'gehoert_werden', gewicht: 90 },
        { key: 'nicht_klein', gewicht: 50 },
      ],
    }
    // gehoert_werden zuerst (90), dann die beiden mit 50 in Katalogordnung:
    // nicht_klein steht in der ersten Familie, eigener_raum in der zweiten.
    expect(gestalt(e, V).map(x => x.key))
      .toEqual(['gehoert_werden', 'nicht_klein', 'eigener_raum'])
  })

  it('gibt bei gleicher Eingabe dieselbe Reihenfolge - immer', () => {
    // Ein Bild, das bei jedem Neuzeichnen umspringt, ist kein Bild von einem selbst.
    const e: Entwurf = {
      ...LEER,
      aspekte: [
        { key: 'eigener_raum', gewicht: 50 },
        { key: 'nicht_klein', gewicht: 50 },
        { key: 'nicht_wachsam', gewicht: 50 },
      ],
    }
    const einmal = gestalt(e, V).map(x => x.key)
    for (let i = 0; i < 5; i++) expect(gestalt(e, V).map(x => x.key)).toEqual(einmal)
  })

  it('reicht das Gewicht durch und rechnet es NICHT in eine Breite um', () => {
    // Die Umrechnung steht dort, wo gezeichnet wird (`bandBreite`). Zwei Zahlen fuer
    // dieselbe Sache liefen auseinander, und dieselbe Skizze saehe an zwei Orten
    // verschieden aus.
    const e: Entwurf = {
      ...LEER,
      aspekte: [{ key: 'nicht_wachsam', gewicht: 0 }, { key: 'gehoert_werden', gewicht: 100 }],
    }
    const b = gestalt(e, V)
    expect(b.find(x => x.key === 'nicht_wachsam')!.gewicht).toBe(0)
    expect(b.find(x => x.key === 'gehoert_werden')!.gewicht).toBe(100)
  })

  it('haelt das Gewicht in den Grenzen', () => {
    const e: Entwurf = {
      ...LEER,
      aspekte: [{ key: 'nicht_wachsam', gewicht: 999 }, { key: 'gehoert_werden', gewicht: -5 }],
    }
    const b = gestalt(e, V)
    expect(b.find(x => x.key === 'nicht_wachsam')!.gewicht).toBe(100)
    expect(b.find(x => x.key === 'gehoert_werden')!.gewicht).toBe(0)
  })

  it('haelt unbekannte und kaputte Eingaben aus', () => {
    const e: Entwurf = {
      ...LEER,
      // Ein Schluessel, den der Katalog dieser Beziehungsart nicht kennt — etwa nach einem
      // Wechsel der Art oder aus einer aelteren Fassung.
      aspekte: [{ key: 'gibt_es_nicht', gewicht: 80 }, { key: 'nicht_wachsam', gewicht: NaN }],
      reihung: ['gibt_es_nicht', 'nicht_wachsam'],
    }
    const b = gestalt(e, V)
    expect(b.map(x => x.key)).toEqual(['nicht_wachsam'])
    expect(Number.isFinite(b[0].gewicht)).toBe(true)
  })
})

// ── Der Text ─────────────────────────────────────────────────────────────────

describe('satzTeile', () => {
  it('schweigt, solange nichts dasteht', () => {
    expect(satzTeile(LEER, V)).toEqual([])
  })

  it('sagt „ganz oben" nur, wenn wirklich geordnet wurde', () => {
    // Sonst wuerde eine Sortierung nach Gewicht als ausdrueckliche Entscheidung ausgegeben —
    // und die hat niemand getroffen.
    const ohne: Entwurf = { ...LEER, aspekte: [{ key: 'nicht_wachsam', gewicht: 80 }] }
    expect(gelesen(satzTeile(ohne, V)[0])).not.toContain('Ganz oben')
    expect(gelesen(satzTeile(ohne, V)[0])).toContain('Gewicht')

    const mit: Entwurf = { ...ohne, reihung: ['nicht_wachsam'] }
    expect(gelesen(satzTeile(mit, V)[0])).toContain('Ganz oben')
  })

  it('benennt zwei und zaehlt den Rest, statt alles aufzuzaehlen', () => {
    const e: Entwurf = {
      ...LEER,
      aspekte: [
        { key: 'nicht_wachsam', gewicht: 90 },
        { key: 'gehoert_werden', gewicht: 80 },
        { key: 'nicht_klein', gewicht: 70 },
        { key: 'eigener_raum', gewicht: 60 },
      ],
      reihung: ['nicht_wachsam', 'gehoert_werden'],
    }
    const a = satzTeile(e, V)
    expect(marken(a[0])).toEqual(['Ich muss nicht aufpassen', 'Gehört werden'])
    expect(gelesen(a[1])).toBe('2 weitere Dinge gehören dazu.')
  })

  it('zaehlt eine einzelne Sache nicht als Zahl', () => {
    const e: Entwurf = {
      ...LEER,
      aspekte: [
        { key: 'nicht_wachsam', gewicht: 90 },
        { key: 'gehoert_werden', gewicht: 80 },
        { key: 'nicht_klein', gewicht: 70 },
      ],
      reihung: ['nicht_wachsam', 'gehoert_werden'],
    }
    expect(gelesen(satzTeile(e, V)[1])).toBe('Eine weitere Sache gehört dazu.')
  })

  it('nennt die Abwaegung mit der gewaehlten Seite vorn', () => {
    const e: Entwurf = {
      ...LEER,
      aspekte: [{ key: 'nicht_wachsam', gewicht: 50 }],
      abwaegungen: { naehe_raum: 85 },
    }
    const abwaegung = satzTeile(e, V).find(a => gelesen(a).includes('schwerer als'))!
    expect(marken(abwaegung)).toEqual(['Viel Zeit für mich', 'Viel gemeinsame Zeit'])
  })

  it('macht aus „beides gleich" keine Entscheidung', () => {
    // Der eigentliche Grund fuer die Waage: Die Mitte ist eine Antwort. Sie als Vorrang
    // auszugeben waere eine Aussage, die jemand ausdruecklich NICHT getroffen hat.
    const e: Entwurf = {
      ...LEER,
      aspekte: [{ key: 'nicht_wachsam', gewicht: 50 }],
      abwaegungen: { naehe_raum: 50 },
    }
    const text = satzTeile(e, V).map(gelesen).join(' ')
    expect(text).toContain('beides gleich')
    expect(text).not.toContain('schwerer als')
  })

  it('nennt nur EINE Abwaegung, nicht alle sechs', () => {
    const e: Entwurf = {
      ...LEER,
      aspekte: [{ key: 'nicht_wachsam', gewicht: 50 }],
      abwaegungen: { naehe_raum: 85, ruhe_klaerung: 15 },
    }
    const text = satzTeile(e, V).map(gelesen).join(' ')
    expect(text).toContain('Viel Zeit für mich')
    expect(text).not.toContain('Frieden im Alltag')
  })

  it('erfindet nichts: jede Marke steht so im Katalog oder im eigenen Text', () => {
    // **Das ist der Test, der das Versprechen traegt.** Neben dem Text steht: Echo hat
    // daran nichts geschrieben und nichts hinzugefuegt.
    const e: Entwurf = {
      aspekte: [{ key: 'nicht_wachsam', gewicht: 90 }, { key: 'gehoert_werden', gewicht: 40 }],
      reihung: ['nicht_wachsam'],
      abwaegungen: { naehe_raum: 15 },
      eigenes: 'Ich möchte abends heimkommen.',
    }
    const erlaubt = new Set([
      ...V.aspekt_familien.flatMap(f => f.aspekte).map(a => a.label),
      ...V.abwaegungen.flatMap(p => [p.links, p.rechts]),
      'Ich möchte abends heimkommen.',
    ])
    for (const absatz of satzTeile(e, V)) {
      for (const wort of marken(absatz)) expect(erlaubt, wort).toContain(wort)
    }
  })
})

// ── Das Zitat ────────────────────────────────────────────────────────────────

describe('zitat', () => {
  it('nimmt den ersten Satz', () => {
    expect(zitat('Erster Satz. Zweiter Satz.')).toBe('Erster Satz.')
  })

  it('gibt kurzen Text unveraendert zurueck, auch ohne Punkt', () => {
    expect(zitat('Ohne Punkt')).toBe('Ohne Punkt')
  })

  it('kuerzt am Wortende und nicht mitten im Wort', () => {
    const lang = 'Ich möchte abends nach Hause kommen und nicht erst die Stimmung abtasten '
      + 'müssen bevor ich irgendetwas sage oder tue oder überhaupt den Mantel ausziehe'
    const k = zitat(lang)!
    expect(k.endsWith(' …')).toBe(true)

    const anfang = k.slice(0, -2)          // ohne das Auslassungszeichen
    expect(lang.startsWith(anfang)).toBe(true)
    // Das entscheidende Stueck: An der Schnittstelle steht im Original ein Leerzeichen.
    // Endete der Schnitt mitten in einem Wort, stuende dort ein Buchstabe.
    expect(lang[anfang.length]).toBe(' ')
    expect(anfang.length).toBeGreaterThan(40)
  })

  it('schweigt bei Leerraum', () => {
    expect(zitat('   ')).toBeNull()
    expect(zitat('')).toBeNull()
  })
})

// ── Der Reihenfolge-Vorschlag ────────────────────────────────────────────────

describe('reihungsVorschlag', () => {
  it('ordnet nach Gewicht und schneidet bei der Obergrenze ab', () => {
    const e: Entwurf = {
      ...LEER,
      aspekte: [
        { key: 'eigener_raum', gewicht: 30 },
        { key: 'nicht_wachsam', gewicht: 90 },
        { key: 'gehoert_werden', gewicht: 60 },
      ],
    }
    expect(reihungsVorschlag(e, V, 2)).toEqual(['nicht_wachsam', 'gehoert_werden'])
  })

  it('schlaegt nichts vor, wo nichts gewaehlt ist', () => {
    expect(reihungsVorschlag(LEER, V, 5)).toEqual([])
  })

  it('haelt eine bestehende Reihenfolge, statt sie zu ueberschreiben', () => {
    // Ein Gewicht sagt, wie viel man von etwas will; die Reihenfolge sagt, was im Zweifel
    // vorgeht. Wer schon geordnet hat, hat das Zweite gesagt - und es darf nicht vom
    // Ersten ueberstimmt werden.
    const e: Entwurf = {
      ...LEER,
      aspekte: [{ key: 'nicht_wachsam', gewicht: 20 }, { key: 'gehoert_werden', gewicht: 95 }],
      reihung: ['nicht_wachsam'],
    }
    expect(reihungsVorschlag(e, V, 5)[0]).toBe('nicht_wachsam')
  })

  it('haelt eine Obergrenze von null oder weniger aus', () => {
    const e: Entwurf = { ...LEER, aspekte: [{ key: 'nicht_wachsam', gewicht: 50 }] }
    expect(reihungsVorschlag(e, V, 0)).toEqual([])
    expect(reihungsVorschlag(e, V, -3)).toEqual([])
  })
})

// ── Die Breite, dort wo gezeichnet wird ──────────────────────────────────────

describe('bandBreite', () => {
  it('laesst ein Gewicht von 0 sichtbar', () => {
    // Ein Wunsch mit Gewicht 0 ist immer noch ein Wunsch. Ein unsichtbares Band waere
    // eine Aussage, die niemand getroffen hat.
    expect(bandBreite(0)).toBeGreaterThan(20)
  })

  it('stuft wirklich ab', () => {
    // Waere die kleinste Breite bei 60, saehen alle Skizzen gleich aus - und das Bild
    // haette nichts mehr zu sagen.
    expect(bandBreite(100)).toBe(100)
    expect(bandBreite(100) - bandBreite(0)).toBeGreaterThan(40)
    expect(bandBreite(50)).toBeGreaterThan(bandBreite(20))
  })

  it('haelt Unsinn aus, statt eine Breite von NaN zu setzen', () => {
    // Eine Breite von "NaN%" faellt in CSS still weg, und das Band waere weg - ohne
    // dass irgendwo etwas rot wird.
    for (const wert of [NaN, Infinity, -10, 1000]) {
      const b = bandBreite(wert)
      expect(Number.isFinite(b), String(wert)).toBe(true)
      expect(b).toBeGreaterThanOrEqual(20)
      expect(b).toBeLessThanOrEqual(100)
    }
  })
})
