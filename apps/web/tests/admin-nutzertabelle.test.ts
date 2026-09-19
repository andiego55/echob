/**
 * Die Entscheidungen hinter den Spalten der Nutzerübersicht.
 *
 * Es sind lauter kleine Regeln, und jede kann still falsch sein: Eine fehlende Angabe als
 * „0" zu zeigen erfindet eine Zahl. Ein Konto ohne jede Spur als „heute aktiv" zu zeigen
 * dreht die Aussage um. Ein Institut als „Vertrag offen" zu führen erzeugt eine Aufgabe,
 * die niemand je abschließen kann. Im JSX sieht man das alles nicht.
 *
 * Die wichtigste Regel steht in zwei Tests doppelt: **fehlt ≠ null ≠ 0.**
 */
import { describe, expect, it } from 'vitest'
import {
  ROLLEN_LABEL, aktivText, berufsgruppeText, eingeschlafen, hinweisZustand, tarifText,
  zahlenText,
} from '../src/admin/nutzerzeile'
import { alsCsv, csvDateiname, ersteRichtung, sortiere } from '../src/admin/nutzerliste'
import type { UserRow } from '../src/admin/api'

const LEER: UserRow = {
  user_id: 'u1', rolle: 'client', name: 'Pseudonym', email: null,
  created_at: '2026-01-01T10:00:00Z',
  avv_accepted: null, avv_version: null, avv_accepted_at: null, im_verzeichnis: false,
  tarif: null, tarif_bis: null, zuletzt_aktiv: null,
  faelle: null, szenen: null, verbindungen: null,
  berufsgruppe: null, berufsgruppe_label: null, unterliegt_203: null,
  hinweis_gelesen: null, hinweis_at: null,
}

const zeile = (teil: Partial<UserRow>): UserRow => ({ ...LEER, ...teil })
const JETZT = new Date('2026-09-19T12:00:00Z')

describe('Rollen', () => {
  it('hat für jede Rolle eine Beschriftung', () => {
    for (const rolle of ['client', 'professional', 'institute', 'student'] as const) {
      expect(ROLLEN_LABEL[rolle]).toBeTruthy()
    }
  })
})

describe('Tarif', () => {
  it('zeigt einen Strich, wo es keinen Tarif gibt', () => {
    // Institute und Fachpersonen zahlen anders; "Testzeit" waere dort schlicht falsch.
    expect(tarifText(zeile({ rolle: 'institute' }))).toBe('—')
  })

  it('nennt den Tarif und, wenn vorhanden, das Ende', () => {
    expect(tarifText(zeile({ tarif: 'trial' }))).toBe('Testzeit')
    expect(tarifText(zeile({ tarif: 'trial', tarif_bis: '2026-10-01T00:00:00Z' })))
      .toMatch(/^Testzeit · bis 01\.10\.26$/)
  })

  it('erfindet für einen unbekannten Tarif keinen Namen', () => {
    // Kommt ein neuer Tarif dazu, soll die Kennung dastehen - nicht "Standard".
    expect(tarifText(zeile({ tarif: 'lifetime' }))).toBe('lifetime')
  })
})

describe('Zahlen', () => {
  it('zeigt bei Klient:innen Fälle und Szenen, Freigaben nur wenn es welche gibt', () => {
    expect(zahlenText(zeile({ faelle: 3, szenen: 27, verbindungen: 0 })))
      .toBe('3 Fälle · 27 Szenen')
    expect(zahlenText(zeile({ faelle: 1, szenen: 1, verbindungen: 1 })))
      .toBe('1 Fall · 1 Szene · 1 Freigabe')
  })

  it('zählt bei Fachpersonen Klient:innen, nicht Fälle', () => {
    // Dieselbe Zahl in derselben Spalte bedeutet je Rolle etwas anderes - deshalb steht
    // die Einheit dabei.
    expect(zahlenText(zeile({ rolle: 'professional', verbindungen: 4 })))
      .toBe('4 Klient:innen')
    expect(zahlenText(zeile({ rolle: 'professional', verbindungen: 0 })))
      .toBe('0 Klient:innen')
  })

  it('zählt bei Instituten Studierende', () => {
    expect(zahlenText(zeile({ rolle: 'institute', verbindungen: 12 }))).toBe('12 Studierende')
  })

  it('unterscheidet „keine" von „nicht erhoben"', () => {
    // 0 ist eine Aussage, ein Strich ist keine. Sie zu verwechseln hiesse, eine Zahl zu
    // zeigen, die nie erhoben wurde.
    expect(zahlenText(zeile({ rolle: 'professional', verbindungen: null }))).toBe('—')
    expect(zahlenText(zeile({ rolle: 'professional', verbindungen: 0 }))).toBe('0 Klient:innen')
  })
})

describe('Zuletzt aktiv', () => {
  it('macht aus „keine Spur" niemals „heute"', () => {
    // Der gefaehrlichste Fehler dieser Spalte: ein totes Konto als lebendig zu zeigen.
    expect(aktivText(null, JETZT)).toBe('nie')
    expect(aktivText(undefined, JETZT)).toBe('nie')
  })

  it('spricht in Tagen, Monaten und zuletzt im Datum', () => {
    expect(aktivText('2026-09-19T08:00:00Z', JETZT)).toBe('heute')
    expect(aktivText('2026-09-18T08:00:00Z', JETZT)).toBe('gestern')
    expect(aktivText('2026-09-16T08:00:00Z', JETZT)).toBe('vor 3 Tagen')
    // Einzahl ist Einzahl: "vor 1 Monaten" stand hier zuerst und fiel erst im Browser auf.
    expect(aktivText('2026-08-01T08:00:00Z', JETZT)).toBe('vor 1 Monat')
    expect(aktivText('2026-06-01T08:00:00Z', JETZT)).toBe('vor 3 Monaten')
    expect(aktivText('2024-05-01T08:00:00Z', JETZT)).toMatch(/2024/)
  })

  it('hält ein Konto ohne Spur für eingeschlafen', () => {
    expect(eingeschlafen(zeile({ zuletzt_aktiv: null }), JETZT)).toBe(true)
    expect(eingeschlafen(zeile({ zuletzt_aktiv: '2026-01-01T00:00:00Z' }), JETZT)).toBe(true)
    expect(eingeschlafen(zeile({ zuletzt_aktiv: '2026-09-10T00:00:00Z' }), JETZT)).toBe(false)
  })
})

describe('Hinweis zur Schweigepflicht', () => {
  it('meldet offen, gelesen und „bedeutet hier nichts" getrennt', () => {
    expect(hinweisZustand({ rolle: 'professional', hinweis_gelesen: false }).ton).toBe('offen')
    expect(hinweisZustand({ rolle: 'professional', hinweis_gelesen: true }).ton).toBe('gut')
    expect(hinweisZustand({ rolle: 'client', hinweis_gelesen: null }).ton).toBe('egal')
  })

  it('traut einer Fachperson ohne Angabe kein Ja zu', () => {
    // Fehlt die Angabe, darf daraus nie "gelesen" werden - das waere die gefaehrliche
    // Richtung des Irrtums.
    expect(hinweisZustand({ rolle: 'professional', hinweis_gelesen: null }).ton).not.toBe('gut')
  })
})

describe('Berufsgruppe', () => {
  it('sagt dazu, ob die Schweigepflicht gilt — in drei Zuständen', () => {
    const basis = { rolle: 'professional' as const, berufsgruppe_label: 'Psychotherapeut:in' }
    expect(berufsgruppeText(zeile({ ...basis, unterliegt_203: true }))).toContain('§ 203')
    expect(berufsgruppeText(zeile({ ...basis, unterliegt_203: false }))).not.toContain('§ 203')
    expect(berufsgruppeText(zeile({ ...basis, unterliegt_203: null }))).toContain('ungeklärt')
  })

  it('nennt eine fehlende Angabe eine fehlende Angabe', () => {
    expect(berufsgruppeText(zeile({ rolle: 'professional' }))).toBe('nicht angegeben')
  })

  it('steht bei anderen Rollen gar nicht', () => {
    expect(berufsgruppeText(zeile({ rolle: 'client' }))).toBe('—')
  })
})

describe('Sortieren', () => {
  const namen = (rows: UserRow[]) => rows.map(r => r.name)

  it('stellt fehlende Angaben in beide Richtungen ans Ende', () => {
    // Sonst steht beim ersten Klick oben, worueber man am wenigsten weiss - und ein Konto
    // ohne jede Spur saehe aus wie das aelteste.
    const liste = [
      zeile({ name: 'Ohne', zuletzt_aktiv: null }),
      zeile({ name: 'Alt', zuletzt_aktiv: '2026-01-01T00:00:00Z' }),
      zeile({ name: 'Neu', zuletzt_aktiv: '2026-09-01T00:00:00Z' }),
    ]
    expect(namen(sortiere(liste, 'zuletzt_aktiv', 'ab'))).toEqual(['Neu', 'Alt', 'Ohne'])
    expect(namen(sortiere(liste, 'zuletzt_aktiv', 'auf'))).toEqual(['Alt', 'Neu', 'Ohne'])
  })

  it('vergleicht Zahlen als Zahlen', () => {
    // Als Text sortiert stuende "10" vor "9".
    const liste = [zeile({ name: 'neun', faelle: 9 }), zeile({ name: 'zehn', faelle: 10 })]
    expect(namen(sortiere(liste, 'menge', 'auf'))).toEqual(['neun', 'zehn'])
  })

  it('nimmt je Rolle die Zahl, die dort eine Menge ist', () => {
    // Nach dem angezeigten Text zu sortieren hiesse, "12 Studierende" hinter
    // "4 Klient:innen" zu stellen, weil "1" vor "4" steht.
    const liste = [
      zeile({ name: 'Fachperson', rolle: 'professional', verbindungen: 7 }),
      zeile({ name: 'Klientin', faelle: 3 }),
    ]
    expect(namen(sortiere(liste, 'menge', 'ab'))).toEqual(['Fachperson', 'Klientin'])
  })

  it('sortiert Zustände nach Dringlichkeit, nicht nach dem Wort', () => {
    // "offen" ist der einzige Grund, auf diese Spalte zu klicken. Alphabetisch stuende
    // "gelesen" davor, und das Offene versteckte sich in der Mitte.
    const liste = [
      zeile({ name: 'gelesen', rolle: 'professional', hinweis_gelesen: true }),
      zeile({ name: 'egal', rolle: 'client' }),
      zeile({ name: 'offen', rolle: 'professional', hinweis_gelesen: false }),
    ]
    expect(namen(sortiere(liste, 'hinweis', 'auf'))).toEqual(['offen', 'gelesen', 'egal'])
  })

  it('lässt gleichwertige Zeilen in der Reihenfolge des Servers', () => {
    // Sonst springen sie bei jedem Klick, und man sucht die Zeile neu, die man gerade las.
    const liste = [zeile({ name: 'A', faelle: 1 }), zeile({ name: 'B', faelle: 1 })]
    expect(namen(sortiere(liste, 'menge', 'auf'))).toEqual(['A', 'B'])
    expect(namen(sortiere(liste, 'menge', 'ab'))).toEqual(['A', 'B'])
  })

  it('rührt die geladene Liste nicht an', () => {
    const liste = [zeile({ name: 'B' }), zeile({ name: 'A' })]
    sortiere(liste, 'name', 'auf')
    expect(namen(liste)).toEqual(['B', 'A'])
  })

  it('nimmt beim ersten Klick die Richtung, die man meint', () => {
    expect(ersteRichtung('zuletzt_aktiv')).toBe('ab')  // das Neueste zuerst
    expect(ersteRichtung('created_at')).toBe('ab')
    expect(ersteRichtung('menge')).toBe('ab')          // das Größte zuerst
    expect(ersteRichtung('name')).toBe('auf')          // A–Z
    expect(ersteRichtung('hinweis')).toBe('auf')       // das Offene zuerst
  })
})

describe('CSV-Ausgabe', () => {
  const ohneBom = (csv: string) => (csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv)
  const zeilen = (csv: string) => ohneBom(csv).split('\r\n')
  /** Der Wert der ersten Datenzeile in der Spalte mit diesem Titel. */
  const spalte = (csv: string, titel: string) => {
    const [kopf, erste] = zeilen(csv)
    const i = kopf.split(';').indexOf(titel)
    expect(i, `Spalte „${titel}" fehlt`).toBeGreaterThanOrEqual(0)
    return erste.split(';')[i]
  }

  it('ist eine Datei, die Excel auf Deutsch öffnet', () => {
    // Ohne BOM raet Excel die Kodierung und macht aus "Fälle" "FÃ¤lle"; ohne Semikolon
    // steht die ganze Zeile in einer Spalte. Beides faellt erst auf, wenn die Datei schon
    // verschickt ist.
    const csv = alsCsv([zeile({})])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(zeilen(csv)[0].split(';').length).toBeGreaterThan(10)
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('maskiert, was die Spalten sprengen würde', () => {
    // Ein Semikolon im Namen verschoebe sonst jede folgende Spalte dieser Zeile - still,
    // und sichtbar erst in der Tabellenkalkulation.
    const csv = alsCsv([zeile({ name: 'Praxis "Mitte"; Berlin' })])
    expect(csv).toContain('"Praxis ""Mitte""; Berlin"')
  })

  it('lässt leer, was fehlt — und erfindet keine 0', () => {
    // Derselbe Unterschied wie in der Tabelle, nur folgenreicher: Mit einer 0 rechnet in
    // einer Tabellenkalkulation jemand weiter.
    const csv = alsCsv([zeile({ faelle: null, szenen: 0 })])
    expect(spalte(csv, 'Fälle')).toBe('')
    expect(spalte(csv, 'Szenen')).toBe('0')
  })

  it('unterscheidet auch hier „nein" von „bedeutet hier nichts"', () => {
    expect(spalte(alsCsv([zeile({ rolle: 'professional', hinweis_gelesen: false })]),
      'Hinweis gelesen')).toBe('nein')
    expect(spalte(alsCsv([zeile({ rolle: 'client' })]), 'Hinweis gelesen')).toBe('')
  })

  it('schreibt Datumsangaben so, dass man sie sortieren kann', () => {
    expect(spalte(alsCsv([zeile({ created_at: '2026-01-05T12:00:00Z' })]), 'Angelegt'))
      .toBe('2026-01-05')
  })

  it('nimmt von Klient:innen keine Adresse mit', () => {
    // Was der Server nicht liefert, erfindet die Datei nicht - die Grenze der Tabelle muss
    // die Grenze der Datei sein, sonst wandert sie beim Export aus dem Produkt heraus.
    expect(spalte(alsCsv([zeile({ rolle: 'client', email: null })]), 'E-Mail')).toBe('')
  })

  it('hat einen festen Satz Spalten', () => {
    // Waechst die Datei um eine Spalte, soll das hier auffallen und nicht beiher passieren:
    // Was hier steht, verlaesst das Produkt.
    expect(zeilen(alsCsv([]))[0].split(';')).toEqual([
      'Kennung', 'Rolle', 'Name', 'E-Mail', 'Tarif', 'Zahlen', 'Fälle', 'Szenen',
      'Verbindungen', 'Berufsgruppe', '§ 203', 'AVV', 'AVV-Fassung', 'AVV am',
      'Hinweis gelesen', 'Hinweis am', 'Im Verzeichnis', 'Zuletzt aktiv', 'Angelegt',
    ])
  })

  it('nennt die Datei nach dem Tag', () => {
    expect(csvDateiname(new Date(2026, 8, 3))).toBe('echob-konten-2026-09-03.csv')
  })
})
