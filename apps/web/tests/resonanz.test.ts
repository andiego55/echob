/**
 * Resonanz — die Sätze, die aus Zahlen werden, und das Gedächtnis ohne Konto.
 *
 * **Warum ausgerechnet die Sätze geprüft gehören.** „147 Menschen kennen das" ist bei
 * diesem Material kein Zähler. Es ist der Widerspruch zu dem Satz, der solche Beziehungen
 * zusammenhält: *Ich bilde mir das ein.* Ein Text, der bei einer einzigen Reaktion
 * „1 Menschen kennen das" sagt, macht aus diesem Widerspruch eine Panne — und wer gerade
 * zum ersten Mal zugegeben hat, dass er eine Szene über Erschöpfung kennt, ist der
 * schlechteste denkbare Adressat für eine kaputte Zahl.
 *
 * Beide Fälle unten standen tatsächlich so auf der Seite und sind beim Ansehen im Browser
 * aufgefallen, nicht beim Schreiben.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  REAKTIONEN,
  REAKTIONS_INFOS,
  SKALEN,
  WIEDERERKANNT,
  andereWiedererkennen,
  anonymAnzahl,
  anonymLesen,
  anonymMerken,
  anonymVergessen,
  gesamt,
  istWiedererkannt,
  nennerSatz,
  zaehlerSatz,
} from '../src/lib/resonanz'

describe('Die vier Reaktionen', () => {
  it('sind genau vier, jede mit Wort und Erklärung', () => {
    expect(REAKTIONS_INFOS.map(r => r.key)).toEqual([...REAKTIONEN])
    for (const r of REAKTIONS_INFOS) {
      expect(r.label.length).toBeGreaterThan(3)
      expect(r.hinweis.length).toBeGreaterThan(10)
    }
  })

  it('behandelt „Nicht mein Thema" nicht als Wiedererkennen', () => {
    // Der wichtigste Unterschied dieser Liste. Zaehlte das Nein als Erlebnis, hiesse
    // „Kenne ich so nicht" auf einer Szene ueber Erschoepfung am Ende, die Person sei
    // erschoepft - die Umkehrung ihrer Aussage.
    expect(WIEDERERKANNT).not.toContain('nicht_meins')
    expect(istWiedererkannt('nicht_meins')).toBe(false)
    expect(istWiedererkannt('kenne_ich')).toBe(true)
    expect(istWiedererkannt(null)).toBe(false)
  })

  it('unterscheidet „Kenne ich" und „Kannte ich mal" auch im Text', () => {
    // Ohne die Erklaerung darunter sehen beide Knoepfe gleich aus - und der Unterschied
    // ist die Zeitform, bei diesem Material die halbe Auskunft.
    const jetzt = REAKTIONS_INFOS.find(r => r.key === 'kenne_ich')!
    const frueher = REAKTIONS_INFOS.find(r => r.key === 'kannte_ich')!
    expect(jetzt.hinweis).not.toBe(frueher.hinweis)
    expect(frueher.hinweis).toMatch(/vorbei|War so/)
  })
})

describe('Die beiden Skalen', () => {
  it('sind zwei, mit einem Wort je Punkt', () => {
    // Jede weitere Frage kostet die Haelfte der Antworten. Und eine nackte Skala von 1
    // bis 5 bedeutet fuer jeden etwas anderes.
    expect(SKALEN).toHaveLength(2)
    for (const s of SKALEN) {
      expect(s.punkte).toHaveLength(5)
      for (const p of s.punkte) expect(p.trim().length).toBeGreaterThan(2)
    }
  })

  it('hält die Belastung im selben Bereich wie eine echte Szene', () => {
    // `scenes.distress_score` ist 1-5. Zwei Zahlenwelten nebeneinander waeren nicht
    // vergleichbar, und niemand koennte spaeter sagen, warum.
    expect(SKALEN.find(s => s.key === 'distress')!.punkte).toHaveLength(5)
  })
})

describe('zaehlerSatz', () => {
  it('sagt bei einer einzigen Reaktion keine kaputte Zahl', () => {
    // Der Fehler, den das verhindert: „1 Menschen kennen das".
    expect(zaehlerSatz({ kenne_ich: 1 })).toBe('Eine Person kennt das')
    expect(zaehlerSatz({ kannte_ich: 1 })).toBe('Eine Person kannte das')
  })

  it('erkennt, wenn die lesende Person die einzige ist', () => {
    expect(zaehlerSatz({ kenne_ich: 1 }, 'kenne_ich')).toBe('Bisher hast nur du das markiert')
  })

  it('reiht mehrere Reaktionen aneinander', () => {
    const satz = zaehlerSatz({ kenne_ich: 147, kannte_ich: 23 })
    expect(satz).toContain('147 Menschen kennen das')
    expect(satz).toContain('23 Menschen kannten das')
  })

  it('stellt nicht aus, wie viele die Szene NICHT kennen', () => {
    // Eine Szene, unter der steht „31 Menschen kennen das nicht", laedt niemanden ein -
    // und die Zahl beantwortet auch keine Frage, die jemand hat.
    expect(zaehlerSatz({ nicht_meins: 31 })).toBe('')
    expect(zaehlerSatz({ kenne_ich: 5, nicht_meins: 31 })).not.toContain('31')
  })

  it('schweigt, solange niemand reagiert hat', () => {
    expect(zaehlerSatz({})).toBe('')
    expect(zaehlerSatz({ kenne_ich: 0 })).toBe('')
  })
})

describe('andereWiedererkennen', () => {
  it('zieht die eigene Stimme ab', () => {
    // Ohne das stand unter der ersten Reaktion einer Szene „Du bist damit nicht allein" -
    // obwohl gerade niemand sonst sie markiert hatte. Ein Trost, den die Zahlen nicht
    // decken, ist bei diesem Material schlimmer als gar keiner.
    expect(andereWiedererkennen({ kenne_ich: 1 }, 'kenne_ich')).toBe(0)
    expect(andereWiedererkennen({ kenne_ich: 2 }, 'kenne_ich')).toBe(1)
  })

  it('zieht ein Nein NICHT ab, weil es nie mitgezählt wurde', () => {
    expect(andereWiedererkennen({ kenne_ich: 3 }, 'nicht_meins')).toBe(3)
  })

  it('zählt über alle drei Formen des Wiedererkennens', () => {
    expect(andereWiedererkennen({ kenne_ich: 2, kannte_ich: 3, andere_seite: 1 })).toBe(6)
  })

  it('bleibt bei null, auch wenn die Zahlen auseinanderlaufen', () => {
    expect(andereWiedererkennen({}, 'kenne_ich')).toBe(0)
  })
})

describe('nennerSatz', () => {
  it('schweigt bei kleinen Zahlen', () => {
    // „von 1 Rückmeldungen" ist falsch geschrieben UND nichtssagend.
    expect(nennerSatz({ kenne_ich: 1 })).toBe('')
    expect(nennerSatz({ kenne_ich: 2, nicht_meins: 2 })).toBe('')
  })

  it('nennt den Nenner, sobald er etwas einordnet', () => {
    expect(nennerSatz({ kenne_ich: 147, nicht_meins: 55 })).toBe('von 202 Rückmeldungen')
  })
})

describe('gesamt', () => {
  it('zählt auch die Absagen — sie sind der Nenner', () => {
    expect(gesamt({ kenne_ich: 10, nicht_meins: 5 })).toBe(15)
  })
})

/**
 * Ein Browser-Speicher in zwölf Zeilen.
 *
 * Die Tests laufen in Node, dort gibt es kein `window` — dasselbe gilt beim Vorrendern der
 * 178 Szenenseiten, weshalb `lib/resonanz.ts` jeden Zugriff guardet. Statt jsdom als
 * Abhängigkeit aufzunehmen (die dann bei jedem `npm ci` mitkommt, für fünf Tests), steht
 * hier der Ersatz. Er zeigt zugleich, wie wenig die Bibliothek wirklich braucht: drei
 * Methoden.
 */
function speicherErsatz() {
  const daten = new Map<string, string>()
  return {
    getItem: (k: string) => daten.get(k) ?? null,
    setItem: (k: string, v: string) => { daten.set(k, String(v)) },
    removeItem: (k: string) => { daten.delete(k) },
    clear: () => { daten.clear() },
  }
}

describe('Das Gedächtnis ohne Konto', () => {
  const vorher = (globalThis as Record<string, unknown>).window

  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).window = { localStorage: speicherErsatz() }
  })

  afterAll(() => {
    // Aufräumen, damit ein `window` aus diesem Block nicht in andere Testdateien blutet:
    // Dort würde es die SSR-Guards stillschweigend aushebeln.
    if (vorher === undefined) delete (globalThis as Record<string, unknown>).window
    else (globalThis as Record<string, unknown>).window = vorher
  })

  it('merkt sich eine Reaktion und findet sie wieder', () => {
    anonymMerken('eine-szene', 'kenne_ich')
    expect(anonymLesen()).toEqual({ 'eine-szene': 'kenne_ich' })
    expect(anonymAnzahl()).toBe(1)
  })

  it('überschreibt statt zu sammeln', () => {
    anonymMerken('eine-szene', 'kenne_ich')
    anonymMerken('eine-szene', 'kannte_ich')
    expect(anonymLesen()['eine-szene']).toBe('kannte_ich')
    expect(anonymAnzahl()).toBe(1)
  })

  it('verwirft fremde Werte, statt sie später ans Backend zu reichen', () => {
    // Ein manipulierter Eintrag wuerde bei der Uebernahme sonst zu einer Anfrage, die
    // 422 gibt - und die Uebernahme braeche mittendrin ab.
    window.localStorage.setItem(
      'echob.resonanz.anonym',
      JSON.stringify({ gut: 'kenne_ich', boese: 'daumen_hoch', kaputt: 42 }),
    )
    expect(anonymLesen()).toEqual({ gut: 'kenne_ich' })
  })

  it('überlebt kaputten Inhalt im Speicher', () => {
    window.localStorage.setItem('echob.resonanz.anonym', '{nicht wirklich json')
    expect(anonymLesen()).toEqual({})
  })

  it('vergisst auf Wunsch alles', () => {
    anonymMerken('a', 'kenne_ich')
    anonymVergessen()
    expect(anonymLesen()).toEqual({})
  })
})
