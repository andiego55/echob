import { apiClient } from './client'
import type { TestAnswers } from '@/selftests/types'
import type { TestResult } from '@/selftests/scoring'

/**
 * Paar-Tests: beide füllen denselben Test aus und vergleichen.
 *
 * Eigene Erhebung im Paarraum – unabhängig von den privaten Testergebnissen eines Falls.
 * `partner` ist erst gefüllt, wenn man selbst geantwortet hat (Blindheitsregel, serverseitig).
 */
export interface CoupleTestRun {
  id: string
  user_id: string
  slug: string
  title: string
  answers: TestAnswers
  result: TestResult
  created_at: string
  updated_at: string
}

export interface CoupleTestComparison {
  id: string
  slug: string
  created_by: string
  body: string
  created_at: string
}

export interface CoupleTestState {
  own: CoupleTestRun | null
  partner: CoupleTestRun | null
  partner_answered: boolean
  partner_name: string | null
  own_name: string
  both_done: boolean
  comparisons: CoupleTestComparison[]
}

export interface CoupleTestSummary {
  slug: string
  title: string
  done: number
  mine: boolean
}

export const coupleTestsApi = {
  list: (coupleId: string) =>
    apiClient.get<CoupleTestSummary[]>(`/couple/links/${coupleId}/tests`).then(r => r.data),

  get: (coupleId: string, slug: string) =>
    apiClient.get<CoupleTestState>(`/couple/links/${coupleId}/tests/${slug}`).then(r => r.data),

  save: (coupleId: string, slug: string, body: { title: string; answers: TestAnswers; result: TestResult }) =>
    apiClient.put<CoupleTestState>(`/couple/links/${coupleId}/tests/${slug}`, { slug, ...body }).then(r => r.data),

  compare: (coupleId: string, slug: string) =>
    apiClient.post<CoupleTestState>(`/couple/links/${coupleId}/tests/${slug}/compare`).then(r => r.data),

  /** „Neu ansehen" legt jedes Mal einen weiteren an – deshalb löschbar. */
  deleteComparison: (coupleId: string, comparisonId: string) =>
    apiClient.delete(`/couple/links/${coupleId}/tests/vergleiche/${comparisonId}`).then(() => true),
}
