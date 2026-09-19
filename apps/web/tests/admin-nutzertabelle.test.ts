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
