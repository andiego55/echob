/**
 * Der Dialog vor der einzigen Handlung, die sich nicht rückgängig machen lässt.
 *
 * Geprüft wird hier nicht, ob er hübsch ist, sondern ob er die Wahrheit sagt: Eine
 * Löschung bedeutet je nach Rolle etwas anderes, und in einem Fall trifft sie Menschen,
 * die gerade nichts davon ahnen — die Studierenden eines Instituts. Steht dieser Satz
 * nicht da, klickt man ihn weg, ohne ihn je gesehen zu haben.
 *
 * Die zweite Frage: Kommt man versehentlich hindurch? Das Abtippen ist die einzige
 * Sicherung, die es gibt.
 */
import { describe, expect, it } from 'vitest'
import {
  bestaetigt, darfLoeschen, ergebnisText, loeschUmfang, loeschWort, weitereRollen,
} from '../src/admin/loeschen'
import type { LoeschErgebnis, UserRow } from '../src/admin/api'

const LEER: UserRow = {
  user_id: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0', rolle: 'client',
  name: 'Pseudonym', email: null, created_at: '2026-01-01T10:00:00Z',
  avv_accepted: null, avv_version: null, avv_accepted_at: null, im_verzeichnis: false,
  tarif: null, tarif_bis: null, zuletzt_aktiv: null,
  faelle: null, szenen: null, verbindungen: null,
  berufsgruppe: null, berufsgruppe_label: null, unterliegt_203: null,
  hinweis_gelesen: null, hinweis_at: null,
}
const zeile = (teil: Partial<UserRow>): UserRow => ({ ...LEER, ...teil })

const ERGEBNIS: LoeschErgebnis = {
  ok: true, grund: null, user_id: LEER.user_id, rollen: ['client'], zeilen: 47,
  auth_konto: 'geloescht', tabellen: { cases: 3, scenes: 41, user_profiles: 1 },
}

describe('Das Wort zum Abtippen', () => {
  it('ist der Name — und ohne Namen der Anfang der Kennung', () => {
    expect(loeschWort(zeile({ name: 'Praxis am Hang' }))).toBe('Praxis am Hang')
    expect(loeschWort(zeile({ name: null }))).toBe('0f1e2d3c')
  })

  it('verzeiht Groß-, Kleinschreibung und Leerzeichen am Rand', () => {
    // Sonst kopiert man den Namen, und die Sicherung ist keine mehr.
    const row = zeile({ name: 'Praxis am Hang' })
    expect(bestaetigt('  praxis AM hang ', row)).toBe(true)
  })

  it('lässt nichts durch, was nicht die richtige Zeile benennt', () => {
    const row = zeile({ name: 'Praxis am Hang' })
    expect(bestaetigt('', row)).toBe(false)
    expect(bestaetigt('Praxis', row)).toBe(false)
    expect(bestaetigt('Praxis am Hang 2', row)).toBe(false)
  })

  it('macht aus einem leeren Namen keine leere Eingabe', () => {
    // Waere das Wort "", genuegte ein Klick auf einen leeren Dialog.
    const ohneNamen = zeile({ name: '   ' })
    expect(bestaetigt('', ohneNamen)).toBe(false)
    expect(bestaetigt('0f1e2d3c', ohneNamen)).toBe(true)
  })
})

describe('Was die Oberfläche selbst verhindert', () => {
  it('lässt das eigene Konto nicht löschen', () => {
    // Danach käme niemand mehr in diesen Bereich, um es zu bemerken.
    expect(darfLoeschen(LEER, LEER.user_id)).toBeTruthy()
    expect(darfLoeschen(LEER, 'jemand-anderes')).toBeNull()
  })

  it('verlässt sich ohne bekannte eigene Kennung auf den Server', () => {
    expect(darfLoeschen(LEER, null)).toBeNull()
  })
})

describe('Was dabei wegfällt', () => {
  it('sagt einem Institut, dass es nicht nur sich selbst löscht', () => {
    // Der wichtigste Satz dieses Dialogs: Studierende verlieren ihren Zugang und wissen
    // nichts davon.
    const text = loeschUmfang(zeile({ rolle: 'institute', verbindungen: 12 })).join(' ')
    expect(text).toContain('12 Studierende')
    expect(text).toContain('Zugang')
  })

  it('sagt einer Fachperson, dass die Fälle ihrer Klient:innen bleiben', () => {
    const text = loeschUmfang(zeile({ rolle: 'professional', verbindungen: 4 })).join(' ')
    expect(text).toContain('4 Verbindungen')
    expect(text).toContain('bleiben ihnen erhalten')
    expect(text).toContain('Schweigepflicht-Hinweis')
  })

  it('sagt einer Klient:in, dass ihre Freigaben sofort enden', () => {
    const text = loeschUmfang(
      zeile({ faelle: 1, szenen: 9, verbindungen: 1 })).join(' ')
    expect(text).toContain('1 Fall mit 9 Szenen')
    expect(text).toContain('1 aktive Freigabe endet')
  })

  it('erfindet keine Zahlen, wo keine stehen', () => {
    const punkte = loeschUmfang(zeile({ faelle: null, szenen: null }))
    expect(punkte.join(' ')).not.toMatch(/\d/)
  })

  it('nennt immer das Login — das ist die Hälfte der Wirkung', () => {
    for (const rolle of ['client', 'professional', 'institute', 'student'] as const) {
      expect(loeschUmfang(zeile({ rolle })).join(' ')).toContain('Login-Konto')
    }
  })

  it('sagt, dass der Verzeichnis-Eintrag bleibt, aber offline geht', () => {
    // Er ist unsere redaktionelle Arbeit; dass er NICHT mitgeloescht wird, muss dastehen.
    const text = loeschUmfang(
      zeile({ rolle: 'professional', im_verzeichnis: true })).join(' ')
    expect(text).toContain('Verzeichnis-Eintrag bleibt')
    expect(text).toContain('offline')
  })
})

describe('Ein Konto in mehreren Rollen', () => {
  it('nennt die anderen Rollen, denn gelöscht wird die Person', () => {
    const alle = [
      zeile({ rolle: 'client' }),
      zeile({ rolle: 'professional' }),
      zeile({ user_id: 'jemand-anderes', rolle: 'institute' }),
    ]
    expect(weitereRollen(alle[0], alle)).toEqual(['Fachperson'])
    expect(weitereRollen(alle[2], alle)).toEqual([])
  })
})

describe('Der Beleg hinterher', () => {
  it('nennt Zeilen und Tabellen statt „erledigt"', () => {
    expect(ergebnisText(ERGEBNIS))
      .toBe('47 Zeilen in 3 Tabellen gelöscht, Login-Konto entfernt.')
  })

  it('sagt beim Aufräumen, dass das Login schon weg war', () => {
    const text = ergebnisText({ ...ERGEBNIS, auth_konto: 'war_bereits_weg' })
    expect(text).toContain('war schon weg')
  })

  it('verschweigt ein gescheitertes Login nicht', () => {
    // Sonst bliebe eine Anmeldung ohne Daten zurueck - genau der Zustand, den dieser
    // Knopf beseitigen soll.
    const text = ergebnisText({ ...ERGEBNIS, auth_konto: 'fehlgeschlagen' })
    expect(text).toContain('nicht entfernen')
    expect(text).toContain('Supabase-Dashboard')
  })

  it('gibt den Grund weiter, wenn gar nicht gelöscht wurde', () => {
    expect(ergebnisText({ ...ERGEBNIS, ok: false, grund: 'Das ist das Admin-Konto.' }))
      .toBe('Das ist das Admin-Konto.')
  })

  it('zählt in der Einzahl, wo es eine ist', () => {
    expect(ergebnisText({ ...ERGEBNIS, zeilen: 1, tabellen: { user_profiles: 1 } }))
      .toBe('1 Zeile in 1 Tabelle gelöscht, Login-Konto entfernt.')
  })
})
