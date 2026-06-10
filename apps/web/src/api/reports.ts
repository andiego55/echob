import { apiClient } from './client'
import type { Report, ReportCreate } from '@/types'

export const reportsApi = {
  list: (caseId: string) =>
    apiClient.get<{ reports: Report[]; total: number }>(`/cases/${caseId}/reports`).then(r => r.data),

  get: (caseId: string, reportId: string) =>
    apiClient.get<Report>(`/cases/${caseId}/reports/${reportId}`).then(r => r.data),

  create: (caseId: string, data: ReportCreate) =>
    apiClient.post<Report>(`/cases/${caseId}/reports`, data).then(r => r.data),

  archive: (caseId: string, reportId: string) =>
    apiClient.delete(`/cases/${caseId}/reports/${reportId}`),
}
