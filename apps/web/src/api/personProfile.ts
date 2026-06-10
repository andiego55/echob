import { apiClient } from './client'
import type { PersonProfile } from '@/types'

export const personProfileApi = {
  get: (caseId: string) =>
    apiClient.get<PersonProfile>(`/cases/${caseId}/person-profile`).then(r => r.data),

  saveModule: (caseId: string, module_id: string, data: Record<string, unknown>) =>
    apiClient.put<PersonProfile>(`/cases/${caseId}/person-profile/module`, { module_id, data }).then(r => r.data),

  saveSummaryText: (caseId: string, summary_text: string) =>
    apiClient.put<PersonProfile>(`/cases/${caseId}/person-profile/summary-text`, { summary_text }).then(r => r.data),

  generateSummary: (caseId: string) =>
    apiClient.post<{ summary_text: string }>(`/cases/${caseId}/person-profile/generate-summary`).then(r => r.data),

  echoChat: (caseId: string, data: { message: string; session_id: string }) =>
    apiClient.post(`/cases/${caseId}/person-profile/echo/chat`, data).then(r => r.data),

  echoHistory: (caseId: string, session_id: string) =>
    apiClient.get(`/cases/${caseId}/person-profile/echo/history`, { params: { session_id } }).then(r => r.data),
}
