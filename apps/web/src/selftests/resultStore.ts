// Zwischenspeicher fürs Testergebnis (localStorage). Der Ergebnis→Echo-Übergang führt
// über /reflektieren (ggf. mit Login-Redirect) in den Themendialog; das dynamische
// Ergebnis wird lokal gehalten und dort für den __test_start__-Seed wieder gelesen.
import type { TestResult } from './scoring'

const key = (slug: string) => `echob_test_result_${slug}`

export function saveTestResult(result: TestResult): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key(result.slug), JSON.stringify(result))
  } catch {
    /* Speicher nicht verfügbar – Ergebnis bleibt dann nur auf der Ergebnisseite. */
  }
}

export function loadTestResult(slug: string): TestResult | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(key(slug))
    return raw ? (JSON.parse(raw) as TestResult) : null
  } catch {
    return null
  }
}
