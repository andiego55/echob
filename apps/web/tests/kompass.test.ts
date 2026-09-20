/**
 * Die Rechnerei des Kompasses.
 *
 * **Warum das geprüft wird und nicht angesehen.** Eine Verlaufskurve sieht auch dann
 * richtig aus, wenn sie falsch ist: Punkte in falscher Reihenfolge, eine Linie, die unter
 * die Skala rutscht, ein Tag, der wegen der Zeitzone beim Vortag landet — das alles fällt
 * beim Draufschauen nicht auf. Es fällt Monate später auf, wenn jemand seinen eigenen
 * Verlauf nicht wiedererkennt, und dann ist es ein Vertrauensschaden und kein Fehler.
 *
 * Die Zeit kommt überall als Argument herein. Ein Test, der `Date.now()` benutzt, ist um
 * 23:59 ein anderer Test als um 00:01.
 */
import { describe, expect, it } from 'vitest'
import type { Puls } from '@/api/kompass'
import {
  ZUSTANDS_TON,
  bewegung,
  kurve,
  nachTagen,
  nummerAus,
  planGefuellt,
  planZeilen,
  planZumSpeichern,
  rhythmusSatz,
  ton,
  zeitWort,
} from '@/lib/kompass'

/** Ein Puls, von dem nur zählt, was der jeweilige Test angibt. */
function puls(zustand: number, created_at: string, rest: Partial<Puls> = {}): Puls {
  return {
    id: `${created_at}-${zustand}`,
    zustand,
    zustand_label: null,
    anspannung: null,
    worte: [],
    notiz: null,
    geholfen: null,
    case_id: null,
    created_at,
    ...rest,
  }
}

/** Alle Koordinatenpaare eines Pfades — inklusive der Kontrollpunkte. */
function koordinaten(pfad: string): [number, number][] {
  const zahlen = pfad
    .replace(/[A-Za-z]/g, ' ')
    .split(/[\s,]+/)
    .filter(t => t !== '')
    .map(Number)
  const paare: [number, number][] = []
  for (let i = 0; i + 1 < zahlen.length; i += 2) paare.push([zahlen[i], zahlen[i + 1]])
  return paare
}

const JETZT = new Date('2026-09-20T12:00:00').getTime()
const TAG = 86_400_000
const vorTagen = (n: number, stunde = 12) => {
  const d = new Date(JETZT - n * TAG)
  d.setHours(stunde, 0, 0, 0)
  return d.toISOString()
}

describe('kurve', () => {
  const masse = { breite: 600, hoehe: 200, rand: 10, tage: 28, jetzt: JETZT }

  it('kommt mit einer leeren Liste zurecht', () => {
    const k = kurve([], masse)
    expect(k.punkte).toEqual([])
    expect(k.linie).toBe('')
    expect(k.flaeche).toBe('')
  })

  it('zeichnet aus einem einzelnen Moment keine Linie', () => {
    // Eine Linie aus einem Punkt ist eine Behauptung ueber eine Entwicklung, die es
    // nicht gibt. Der Punkt selbst soll trotzdem da sein.
    const k = kurve([puls(3, vorTagen(1))], masse)
    expect(k.punkte).toHaveLength(1)
    expect(k.linie).toBe('')
    expect(k.flaeche).toBe('')
  })

  it('legt gute Momente nach oben und schwere nach unten', () => {
    const k = kurve([puls(5, vorTagen(2)), puls(1, vorTagen(1))], masse)
    const [gut, schwer] = k.punkte
    expect(gut.y).toBeLessThan(schwer.y)
    expect(gut.y).toBeCloseTo(masse.rand, 5)
    expect(schwer.y).toBeCloseTo(masse.hoehe - masse.rand, 5)
  })

  it('setzt die x-Achse nach der Zeit und nicht nach der Reihenfolge', () => {
    // Drei Momente: zwei liegen Wochen zurueck, der dritte ist von heute. Waeren die
    // Punkte gleich verteilt, laegen alle Abstaende gleich - und eine Woche Funkstille
    // saehe aus wie ein gleichmaessiger Verlauf.
    const k = kurve(
      [puls(3, vorTagen(27)), puls(3, vorTagen(26)), puls(3, vorTagen(0))],
      masse,
    )
    const [a, b, c] = k.punkte
    expect(b.x - a.x).toBeLessThan((c.x - b.x) / 5)
  })

  it('bleibt mit allen Kontrollpunkten innerhalb der Skala', () => {
    // Der eigentliche Grund fuer die waagerechten Kontrollpunkte. Eine gewoehnliche
    // Spline schiesst bei einem Zickzack ueber die Endwerte hinaus - und ein Punkt
    // unterhalb von „belastet" behauptet einen Zustand, den die Skala nicht kennt.
    // Eine kubische Kurve bleibt in der Huelle ihrer Kontrollpunkte; pruefen wir also
    // die Kontrollpunkte, haben wir die ganze Kurve geprueft.
    const zickzack = [1, 5, 1, 5, 1, 5].map((z, i) => puls(z, vorTagen(6 - i)))
    const k = kurve(zickzack, masse)
    for (const [, y] of koordinaten(k.linie)) {
      expect(y).toBeGreaterThanOrEqual(masse.rand)
      expect(y).toBeLessThanOrEqual(masse.hoehe - masse.rand)
    }
  })

  it('klemmt Momente ausserhalb des Fensters an den Rand', () => {
    // Der Verlauf-Endpunkt begrenzt ueber `tage`; ein Eintrag von davor darf trotzdem
    // nie mit negativem x aus dem Bild laufen.
    const k = kurve([puls(3, vorTagen(400)), puls(3, vorTagen(0))], masse)
    for (const p of k.punkte) {
      expect(p.x).toBeGreaterThanOrEqual(masse.rand)
      expect(p.x).toBeLessThanOrEqual(masse.breite - masse.rand)
    }
  })

  it('schliesst die Flaeche unten und nicht auf der Linie', () => {
    const k = kurve([puls(5, vorTagen(3)), puls(5, vorTagen(1))], masse)
    expect(k.flaeche.endsWith('Z')).toBe(true)
    expect(k.flaeche).toContain(`L ${k.punkte[1].x.toFixed(2)} ${masse.hoehe}`)
  })
})

describe('zeitWort', () => {
  it('sagt bei Minuten Minuten und bei Tagen Tage', () => {
    expect(zeitWort(new Date(JETZT - 30_000).toISOString(), JETZT)).toBe('gerade eben')
    expect(zeitWort(new Date(JETZT - 25 * 60_000).toISOString(), JETZT)).toBe('vor 25 Minuten')
    expect(zeitWort('2026-09-20T08:15:00', JETZT)).toBe('heute, 08:15')
    expect(zeitWort('2026-09-19T21:05:00', JETZT)).toBe('gestern, 21:05')
  })

  it('nennt innerhalb der Woche den Wochentag, danach das Datum', () => {
    // 2026-09-17 ist ein Donnerstag.
    expect(zeitWort('2026-09-17T09:00:00', JETZT)).toBe('Donnerstag, 09:00')
    expect(zeitWort('2026-08-30T09:00:00', JETZT)).toBe('30. August')
  })

  it('rechnet in Kalendertagen und nicht in 24-Stunden-Schritten', () => {
    // 20 Stunden vor 08:00 ist der Vortag, nicht „vor 20 Stunden". Genau hier geht die
    // naheliegende Rechnung schief.
    const morgens = new Date('2026-09-20T08:00:00').getTime()
    expect(zeitWort('2026-09-19T12:00:00', morgens)).toBe('gestern, 12:00')
  })

  it('gibt bei unlesbarem Datum nichts aus statt „Invalid Date"', () => {
    expect(zeitWort('gar kein Datum', JETZT)).toBe('')
  })
})

describe('rhythmusSatz', () => {
  it('zaehlt richtig und rechnet glatte Zeitraeume in Wochen um', () => {
    expect(rhythmusSatz(0, 28)).toBe('Noch nichts festgehalten in den letzten 4 Wochen.')
    expect(rhythmusSatz(1, 28)).toBe('Ein Moment in den letzten 4 Wochen.')
    expect(rhythmusSatz(9, 28)).toBe('9 Momente in den letzten 4 Wochen.')
    expect(rhythmusSatz(3, 10)).toBe('3 Momente in den letzten 10 Tagen.')
  })
})

describe('bewegung', () => {
  const reihe = (werte: number[]) => werte.map((z, i) => puls(z, vorTagen(werte.length - i)))

  it('schweigt, solange zu wenig da ist', () => {
    expect(bewegung(reihe([1, 5, 1, 5, 1]))).toBeNull()
  })

  it('erkennt Anstieg, Abfall und Stillstand', () => {
    expect(bewegung(reihe([1, 1, 1, 5, 5, 5]))?.richtung).toBe('heller')
    expect(bewegung(reihe([5, 5, 5, 1, 1, 1]))?.richtung).toBe('schwerer')
    expect(bewegung(reihe([3, 3, 3, 3, 3, 3]))?.richtung).toBe('gleich')
  })

  it('haelt eine Viertelstufe noch fuer Rauschen', () => {
    // Ohne Schwelle meldete jede Kurve eine Richtung, und der Satz waere wertlos.
    expect(bewegung(reihe([3, 3, 3, 3, 3, 4]))?.richtung).toBe('gleich')
  })

  it('beschreibt und deutet nicht', () => {
    // Der Satz darf keine Aussage ueber das Leben treffen, nur ueber die Eintraege.
    const satz = bewegung(reihe([1, 1, 1, 5, 5, 5]))!.satz
    expect(satz).toContain('Einträge')
    expect(satz).not.toMatch(/besser|schlechter|Fortschritt|bergauf/i)
  })
})

describe('nachTagen', () => {
  it('fasst denselben Kalendertag zusammen, neueste Gruppe zuerst', () => {
    const gruppen = nachTagen([
      puls(1, '2026-09-18T09:00:00'),
      puls(2, '2026-09-20T08:00:00'),
      puls(3, '2026-09-20T20:00:00'),
    ], JETZT)

    expect(gruppen).toHaveLength(2)
    expect(gruppen[0].label).toBe('Heute')
    expect(gruppen[0].pulse).toHaveLength(2)
    // Innerhalb des Tages ebenfalls neueste zuerst.
    expect(gruppen[0].pulse[0].zustand).toBe(3)
    expect(gruppen[1].label).toBe('Freitag, 18. September')
  })

  it('nennt den Vortag „Gestern"', () => {
    expect(nachTagen([puls(3, '2026-09-19T23:30:00')], JETZT)[0].label).toBe('Gestern')
  })

  it('wirft unlesbare Zeitangaben weg, statt eine Gruppe daraus zu machen', () => {
    expect(nachTagen([puls(3, 'kaputt')], JETZT)).toEqual([])
  })
})

describe('der Krisenplan', () => {
  it('nimmt aus dem offenen Inhalt nur echte Zeilen', () => {
    const inhalt = {
      schritte: ['  Rausgehen  ', '', '   ', 42, null, 'K. anrufen'],
      warnzeichen: 'kein Array',
      menschen: null,
    } as unknown as Record<string, unknown>

    expect(planZeilen(inhalt, 'schritte')).toEqual(['Rausgehen', 'K. anrufen'])
    expect(planZeilen(inhalt, 'warnzeichen')).toEqual([])
    expect(planZeilen(inhalt, 'menschen')).toEqual([])
    expect(planZeilen(undefined, 'schritte')).toEqual([])
  })

  it('haelt einen Plan aus lauter Leerzeilen fuer keinen Plan', () => {
    // Sonst meldet die Uebersicht „Angelegt" fuer etwas, das im Ernstfall nichts sagt.
    const keys = ['warnzeichen', 'schritte']
    expect(planGefuellt({ warnzeichen: ['', '  '], schritte: [] }, keys)).toBe(false)
    expect(planGefuellt({ warnzeichen: ['Ich melde mich nicht mehr'] }, keys)).toBe(true)
  })

  it('speichert weder leere Zeilen noch leere Abschnitte', () => {
    expect(planZumSpeichern({
      warnzeichen: [' Ich schlafe schlechter ', ''],
      schritte: ['', '   '],
      menschen: [],
    })).toEqual({ warnzeichen: ['Ich schlafe schlechter'] })
  })
})

describe('nummerAus', () => {
  it('findet die Nummer in einer Zeile mit Namen', () => {
    expect(nummerAus('Mama · 0170 1234567')).toBe('01701234567')
    expect(nummerAus('Praxis: +49 (30) 123 456')).toBe('+4930123456')
  })

  it('macht aus einer Zeile ohne Nummer keinen Anruf', () => {
    expect(nummerAus('Die Nachbarin von gegenueber')).toBeNull()
    expect(nummerAus('Zimmer 12 verlassen')).toBeNull()
  })
})

describe('die Toene der Zustaende', () => {
  it('kennt alle fuenf Stufen des Katalogs', () => {
    // Faellt eine heraus, bekommt sie still den Ersatzton - und ein Zustand saehe im
    // Verlauf aus wie „unbekannt", ohne dass irgendwo ein Fehler auftaucht.
    for (const wert of [1, 2, 3, 4, 5]) {
      expect(ZUSTANDS_TON[wert], `Stufe ${wert}`).toBeDefined()
    }
  })

  it('wird mit jeder Stufe waermer', () => {
    // Der Rotanteil steigt Stufe fuer Stufe. Der Blauanteil tut das NICHT spiegelbildlich,
    // und das ist Absicht: Die Mitte ist der hellste und blasseste Ton, weil „neutral"
    // der am wenigsten geladene Punkt ist. Zu den Enden hin wird es kraeftiger - dunkel
    // nach unten, warm nach oben.
    const rot = (hex: string) => parseInt(hex.slice(1, 3), 16)
    for (const wert of [2, 3, 4, 5]) {
      expect(rot(ZUSTANDS_TON[wert].hex), `Stufe ${wert}`)
        .toBeGreaterThan(rot(ZUSTANDS_TON[wert - 1].hex))
    }
  })

  it('ist eine Temperatur und keine Ampel', () => {
    // Die drei Bedingungen, die „kuehl nach warm, nicht rot nach gruen" ausmachen:
    // Das untere Ende ist blaustichig, das obere rotstichig, und nirgends fuehrt Gruen.
    // Ein gruener Punkt hiesse „richtig" - und ein schwerer Tag ist kein Fehler.
    const teile = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

    const [r1, , b1] = teile(ZUSTANDS_TON[1].hex)
    expect(b1).toBeGreaterThan(r1)
    const [r5, , b5] = teile(ZUSTANDS_TON[5].hex)
    expect(r5).toBeGreaterThan(b5)

    for (const wert of [1, 2, 3, 4, 5]) {
      const [r, g, b] = teile(ZUSTANDS_TON[wert].hex)
      expect(g, `Stufe ${wert} fuehrt mit Gruen`).toBeLessThanOrEqual(Math.max(r, b))
    }
  })

  it('gibt keinen Ton zweimal aus', () => {
    // Zwei gleiche Toene waeren in der Kurve zwei ununterscheidbare Zustaende.
    const hexe = [1, 2, 3, 4, 5].map(w => ZUSTANDS_TON[w].hex)
    expect(new Set(hexe).size).toBe(hexe.length)
  })

  it('faellt bei einer unbekannten Stufe auf einen stillen Ton zurueck', () => {
    expect(ton(99).hex).toBe(ton(null).hex)
    expect(ton(3).hex).toBe(ZUSTANDS_TON[3].hex)
  })
})
