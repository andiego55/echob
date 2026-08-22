/**
 * Die Auswertung der Selbsttests.
 *
 * **Warum geprüft.** Ein falscher Wert sieht plausibel aus. Kippt eine Skala oder greift
 * `reverse` nicht, bekommt jemand ein falsches Ergebnis über die eigene Beziehung zu lesen —
 * und nichts an der App deutet darauf hin. Das ist die Sorte Fehler, die man ohne Prüfung
 * erst bemerkt, wenn sich jemand wundert.
 *
 * Gerechnet wird gegen KLEINE, hier gebaute Tests statt gegen den echten Katalog: So steht
 * das erwartete Ergebnis nachvollziehbar daneben, statt aus 30 Fragen abgeleitet werden zu
 * müssen. Ein Blick auf einen echten Test steht am Ende, damit ein Umbau der Datenstruktur
 * trotzdem auffällt.
 */
import { describe, expect, it } from 'vitest'
import { SELF_TESTS, getSelfTest } from '@/selftests'
import { scoreTest } from '@/selftests/scoring'
import type { SelfTest } from '@/selftests/types'

/** Ein Zwei-Dimensionen-Test mit Likert-Skala 0..4. */
const dimensional: SelfTest = {
  slug: 'probe-dimensional',
  title: 'Probe',
  description: 'Nur für die Prüfung.',
  category: 'beziehung',
  resultMode: 'dimensional',
  dimensions: [
    { key: 'naehe', name: 'Nähe' },
    { key: 'streit', name: 'Streit' },
  ],
  questions: [
    { id: 'q1', type: 'scale', text: 'Nähe A', dimension: 'naehe' },
    { id: 'q2', type: 'scale', text: 'Nähe B', dimension: 'naehe' },
    { id: 'q3', type: 'scale', text: 'Streit A', dimension: 'streit' },
  ],
} as SelfTest

const typologie: SelfTest = {
  slug: 'probe-typologie',
  title: 'Probe',
  description: 'Nur für die Prüfung.',
  category: 'persoenlichkeit',
  resultMode: 'typology',
  dimensions: [
    { key: 'sicher', name: 'Sicher' },
    { key: 'aengstlich', name: 'Ängstlich' },
  ],
  questions: [
    {
      id: 't1', type: 'single', text: 'Frage eins',
      options: [
        { label: 'A', scores: { sicher: 2 } },
        { label: 'B', scores: { aengstlich: 2 } },
      ],
    },
    {
      id: 't2', type: 'single', text: 'Frage zwei',
      options: [
        { label: 'A', scores: { sicher: 2 } },
        { label: 'B', scores: { aengstlich: 2 } },
      ],
    },
  ],
} as SelfTest

describe('scoreTest – dimensional', () => {
  it('rechnet je Dimension in Prozent des Möglichen', () => {
    // Nähe: 4 + 4 von je 4 möglich = 100 %. Streit: 0 von 4 = 0 %.
    const r = scoreTest(dimensional, { q1: 4, q2: 4, q3: 0 })
    expect(r.mode).toBe('dimensional')
    expect(r.dimensions.find(d => d.key === 'naehe')?.score).toBe(100)
    expect(r.dimensions.find(d => d.key === 'streit')?.score).toBe(0)
  })

  it('bildet den Gesamtwert als Mittel der Dimensionen', () => {
    const r = scoreTest(dimensional, { q1: 4, q2: 4, q3: 0 })
    expect(r.overall?.score).toBe(50)
  })

  it('zählt eine halb ausgefüllte Skala anteilig', () => {
    const r = scoreTest(dimensional, { q1: 2, q2: 2, q3: 2 })
    expect(r.dimensions.find(d => d.key === 'naehe')?.score).toBe(50)
  })

  it('behandelt fehlende Antworten als null, nicht als Fehler', () => {
    const r = scoreTest(dimensional, { q1: 4 })
    expect(r.dimensions.find(d => d.key === 'naehe')?.score).toBe(50)
    expect(r.dimensions.find(d => d.key === 'streit')?.score).toBe(0)
  })

  it('gibt bei gar keiner Antwort überall null aus statt NaN', () => {
    const r = scoreTest(dimensional, {})
    for (const d of r.dimensions) expect(Number.isFinite(d.score)).toBe(true)
    expect(r.overall?.score).toBe(0)
  })
})

describe('scoreTest – Typologie', () => {
  it('benennt die Dimension mit den meisten Punkten', () => {
    const r = scoreTest(typologie, { t1: 1, t2: 1 })   // zweimal Antwort B
    expect(r.mode).toBe('typology')
    expect(r.primary?.key).toBe('aengstlich')
  })

  it('folgt der Mehrheit, nicht der Reihenfolge', () => {
    const r = scoreTest(typologie, { t1: 0, t2: 0 })   // zweimal Antwort A
    expect(r.primary?.key).toBe('sicher')
  })
})

describe('Der echte Katalog passt zur Auswertung', () => {
  it('wertet jeden Test ohne Absturz aus und liefert endliche Werte', () => {
    for (const test of SELF_TESTS) {
      const r = scoreTest(test, {})
      expect(r.slug, test.slug).toBe(test.slug)
      for (const d of r.dimensions) {
        expect(Number.isFinite(d.score), `${test.slug}/${d.key}`).toBe(true)
        expect(d.score).toBeGreaterThanOrEqual(0)
        expect(d.score).toBeLessThanOrEqual(100)
      }
    }
  })

  it('kennt den Bindungsstil-Test als Typologie', () => {
    // Fängt einen Umbau der Datenstruktur ab, den die Probe-Tests oben nicht sehen würden.
    const t = getSelfTest('bindungsstil')
    expect(t?.resultMode).toBe('typology')
    expect(t?.dimensions.map(d => d.key)).toContain('sicher')
  })
})
