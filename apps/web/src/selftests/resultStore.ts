// Zwischenspeicher fürs Testergebnis (localStorage). Der Ergebnis→Echo-Übergang führt
// über /reflektieren (ggf. mit Login-Redirect) in den Themendialog; das dynamische
// Ergebnis wird lokal gehalten und dort für den __test_start__-Seed wieder gelesen.
import type { TestResult } from './scoring'
import type { TestAnswers } from './types'

const key = (slug: string) => `echob_test_result_${slug}`
const answersKey = (slug: string) => `echob_test_answers_${slug}`

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

/**
 * Roh-Antworten (nutzer-eigen, lokal). Werden für den interaktiven Ergebnis-Dialog
 * gebraucht: Frage-für-Frage-Übersicht, Revision einzelner Antworten und die
 * deterministische Neuberechnung. `TestResult` enthält sie bewusst nicht.
 */
export function saveTestAnswers(slug: string, answers: TestAnswers): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(answersKey(slug), JSON.stringify(answers))
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export function loadTestAnswers(slug: string): TestAnswers | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(answersKey(slug))
    return raw ? (JSON.parse(raw) as TestAnswers) : null
  } catch {
    return null
  }
}
