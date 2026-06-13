import { apiClient } from './client'
import type { CaseReview, CaseTrends } from '@/types'

export const reviewsApi = {
  /** Live berechnete Trends (Diagramme) — immer aktuell. */
  trends: (caseId: string) =>
    apiClient.get<CaseTrends>(`/cases/${caseId}/reviews/trends`).then(r => r.data),

  /** Gespeicherte Rückblick-Narrative, neueste zuerst. */
  list: (caseId: string) =>
    apiClient
      .get<{ reviews: CaseReview[]; total: number }>(`/cases/${caseId}/reviews`)
      .then(r => r.data.reviews),

  /** Neuen Rückblick erzeugen (Trends-Snapshot + LLM-Narrativ). */
  generate: (caseId: string) =>
    apiClient.post<CaseReview>(`/cases/${caseId}/reviews`, {}).then(r => r.data),

  remove: (caseId: string, reviewId: string) =>
    apiClient.delete(`/cases/${caseId}/reviews/${reviewId}`).then(r => r.data),
}
