/**
 * Die Reiterleiste des Paarraums — welche Gruppe leuchtet zu welchem Pfad.
 *
 * **Warum das einen Test braucht.** Die Zuordnung läuft über einen Präfixvergleich, und
 * der geht still daneben: Ein einzelner Test liegt unter `/test/<slug>` (Einzahl), der
 * Reiter heißt `/tests`. Wer einen Test ausfüllte, sah die Leiste auf „Übersicht"
 * zurückfallen — kein Fehler, keine rote Meldung, nur das Gefühl, den Bereich verlassen zu
 * haben. Genau die Bauart Fehler, die niemandem auffällt, bis sich jemand beschwert.
 *
 * Der zweite Teil hält die Ordnung fest, die beim Neusortieren entstanden ist: Szenen,
 * Tests und Impulse sind dieselbe Übung — vorbereitetes Material, beide antworten getrennt,
 * danach nebeneinander ansehen — und liegen deshalb zusammen unter „Üben". Vorher standen
 * sie an drei verschiedenen Stellen, weil sie nacheinander entstanden sind.
 */
import { describe, expect, it } from 'vitest'
import { GRUPPEN, aktiveGruppe } from '@/components/couple/CoupleShell'

describe('Reiterleiste im Paarraum', () => {
  it('ordnet jeden Reiter seiner eigenen Gruppe zu', () => {
    for (const gruppe of GRUPPEN) {
      for (const kind of gruppe.kinder) {
        if (!kind.path) continue
        expect(aktiveGruppe(kind.path).label).toBe(gruppe.label)
      }
    }
  })

  it('haelt den einzelnen Test bei „Ueben" statt bei „Uebersicht"', () => {
    expect(aktiveGruppe('/test/beziehungsgesundheit').label).toBe('Üben')
    expect(aktiveGruppe('/tests').label).toBe('Üben')
  })

  it('faellt fuer die Uebersicht und fuer Unbekanntes auf die erste Gruppe zurueck', () => {
    expect(aktiveGruppe('').label).toBe('Übersicht')
    expect(aktiveGruppe('/gibtesnicht').label).toBe('Übersicht')
  })

  it('legt die drei blinden Uebungen zusammen', () => {
    const ueben = GRUPPEN.find(g => g.label === 'Üben')
    expect(ueben?.kinder.map(k => k.path).sort()).toEqual(['/impulse', '/szenen', '/tests'])
  })

  it('hat keinen Reiter, der Praefix eines anderen ist', () => {
    // Sonst gewinnt der kuerzere und der laengere waere nie erreichbar.
    const pfade = GRUPPEN.flatMap(g => g.kinder.map(k => k.path)).filter(Boolean)
    for (const a of pfade) {
      for (const b of pfade) {
        if (a !== b) expect(b.startsWith(a)).toBe(false)
      }
    }
  })
})
