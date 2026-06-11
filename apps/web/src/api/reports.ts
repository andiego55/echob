import { apiClient } from './client'
import type { Report, ReportCreate } from '@/types'

export const reportsApi = {
  list: (caseId: string) =>
    apiClient.get<{ reports: Report[]; total: number }>(`/cases/${caseId}/reports`).then(r => r.data),

  get: (caseId: string, reportId: string) =>
    apiClient.get<Report>(`/cases/${caseId}/reports/${reportId}`).then(r => r.data),

  create: (caseId: string, data: ReportCreate) =>
    apiClient.post<Report>(`/cases/${caseId}/reports`, data, { timeout: 120_000 }).then(r => r.data),

  update: (caseId: string, reportId: string, sections: { heading: string; text: string }[]) =>
    apiClient.put<Report>(`/cases/${caseId}/reports/${reportId}`, { sections }).then(r => r.data),

  delete: (caseId: string, reportId: string) =>
    apiClient.delete(`/cases/${caseId}/reports/${reportId}`),
}
