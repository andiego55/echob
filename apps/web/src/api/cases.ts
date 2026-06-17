import { apiClient } from './client'
import type { Case, CaseCreate } from '@/types'

export const casesApi = {
  list: () =>
    apiClient.get<{ cases: Case[]; total: number; chat_session_count: number }>('/cases').then(r => r.data),

  get: (caseId: string) =>
    apiClient.get<Case>(`/cases/${caseId}`).then(r => r.data),

  create: (data: CaseCreate) =>
    apiClient.post<Case>('/cases', data).then(r => r.data),

  update: (caseId: string, data: Partial<CaseCreate>) =>
    apiClient.patch<Case>(`/cases/${caseId}`, data).then(r => r.data),

  archive: (caseId: string) =>
    apiClient.delete(`/cases/${caseId}`),

  deleteForever: (caseId: string) =>
    apiClient.delete(`/cases/${caseId}/permanent`),
}
