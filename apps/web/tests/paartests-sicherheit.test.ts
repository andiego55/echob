/**
 * Welche Selbsttests im Paarraum erlaubt sind.
 *
 * **Warum das die wichtigste Prüfung hier ist.** `isCoupleSafe` sind drei Zeilen, und sie
 * entscheiden, ob eine Person die andere in einem gemeinsam gelesenen Raum auf Gaslighting,
 * narzisstische Muster oder emotionalen Missbrauch „testen" kann. Legt jemand einen neuen
 * Test an und vergisst `safety: true`, öffnet sich diese Tür lautlos: kein Absturz, keine
 * Warnung, keine rote Prüfung. Nur ein Test, der plötzlich im Paarraum auftaucht.
 *
 * Deshalb prüft das hier zweifach — die Regel gegen den echten Katalog, und die heiklen
 * Tests noch einmal namentlich. Die zweite Prüfung fängt auch den Fall ab, dass jemand die
 * erlaubten Kategorien erweitert.
 */
import { describe, expect, it } from 'vitest'
import { SELF_TESTS } from '@/selftests'
import { COUPLE_TEST_CATEGORIES, isCoupleSafe } from '@/selftests/couple'

/** Tests, die eine Person NIE über die andere im gemeinsamen Raum ausfüllen soll. */
const NIEMALS_IM_PAARRAUM = [
  'erlebe-ich-gaslighting',
  'narzisstische-muster',
  'emotionaler-missbrauch',
  'belastende-muster',
  'eigener-anteil',
  'beziehungstrauma',
  'bleiben-oder-gehen',
]

describe('Selbsttests im Paarraum', () => {
  it('lässt keinen Test mit Sicherheitshinweis durch', () => {
    const durchgerutscht = SELF_TESTS
      .filter(t => t.safety && isCoupleSafe(t))
      .map(t => t.slug)
    expect(durchgerutscht).toEqual([])
  })

  it('sperrt die heiklen Tests namentlich', () => {
    for (const slug of NIEMALS_IM_PAARRAUM) {
      const test = SELF_TESTS.find(t => t.slug === slug)
      expect(test, `Test "${slug}" fehlt im Katalog – Prüfung anpassen`).toBeDefined()
      expect(isCoupleSafe(test!), `"${slug}" darf nicht in den Paarraum`).toBe(false)
    }
  })

  it('lässt die unbedenklichen zu – sonst wäre der Reiter leer', () => {
    const erlaubt = SELF_TESTS.filter(isCoupleSafe).map(t => t.slug)
    expect(erlaubt).toContain('beziehungsgesundheit')
    expect(erlaubt).toContain('bindungsstil')
    expect(erlaubt.length).toBeGreaterThanOrEqual(3)
  })

  it('erlaubt nur die drei vorgesehenen Kategorien', () => {
    // Eine vierte Kategorie hier wäre eine inhaltliche Entscheidung, keine technische.
    // Sie soll auffallen, nicht durchrutschen.
    expect([...COUPLE_TEST_CATEGORIES].sort())
      .toEqual(['beziehung', 'persoenlichkeit', 'therapie'])
  })

  it('hält jede Kategorie außerhalb der Liste fern', () => {
    const drin = SELF_TESTS
      .filter(t => isCoupleSafe(t) && !COUPLE_TEST_CATEGORIES.includes(t.category))
      .map(t => t.slug)
    expect(drin).toEqual([])
  })
})
