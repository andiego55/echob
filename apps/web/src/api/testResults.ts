import { apiClient } from './client'
import type { TestResult, SavedTestResult } from '@/selftests'

/** Gespeicherte Selbsttest-Ergebnisse (nutzer-eigen). */
export const testResultsApi = {
  list: () =>
    apiClient.get<SavedTestResult[]>('/test-results').then((r) => r.data),
  save: (slug: string, data: { title: string; category: string | null; result: TestResult }) =>
    apiClient.put<SavedTestResult>(`/test-results/${slug}`, data).then((r) => r.data),
  remove: (slug: string) =>
    apiClient.delete(`/test-results/${slug}`).then((r) => r.data),
}
