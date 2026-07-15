import { apiClient } from './client'
import type {
  StudentProfile, StudentCase, StudentCaseDetail, StudentEchoMessage,
  Report, ReportCreate,
} from '@/types'

/** Student:in (eigene Ausbildungs-Domäne, /student/*). */
export const studentApi = {
  me: () =>
    apiClient.get<StudentProfile>('/student/me').then(r => r.data),
  accept: (data: { code?: string; token?: string; display_name?: string | null }) =>
    apiClient.post<StudentProfile>('/student/accept', data).then(r => r.data),
  cases: () =>
    apiClient.get<StudentCase[]>('/student/cases').then(r => r.data),
  caseDetail: (copyId: string) =>
    apiClient.get<StudentCaseDetail>(`/student/cases/${copyId}`).then(r => r.data),

  // Echo-Dialog über die Arbeitskopie
  echoHistory: (copyId: string) =>
    apiClient.get<StudentEchoMessage[]>(`/student/cases/${copyId}/echo/history`).then(r => r.data),
  echoChat: (copyId: string, message: string) =>
    apiClient.post<StudentEchoMessage>(`/student/cases/${copyId}/echo/chat`, { message }, { timeout: 120_000 }).then(r => r.data),

  // Berichte (student-scoped, wie Nutzer-Berichte)
  reports: (copyId: string) =>
    apiClient.get<{ reports: Report[]; total: number }>(`/student/cases/${copyId}/reports`).then(r => r.data),
  reportCreate: (copyId: string, data: ReportCreate) =>
    apiClient.post<Report>(`/student/cases/${copyId}/reports`, data, { timeout: 120_000 }).then(r => r.data),
  report: (copyId: string, reportId: string) =>
    apiClient.get<Report>(`/student/cases/${copyId}/reports/${reportId}`).then(r => r.data),
  reportUpdate: (copyId: string, reportId: string, sections: { heading: string; text: string }[]) =>
    apiClient.put<Report>(`/student/cases/${copyId}/reports/${reportId}`, { sections }).then(r => r.data),
  reportDelete: (copyId: string, reportId: string) =>
    apiClient.delete(`/student/cases/${copyId}/reports/${reportId}`).then(r => r.data),
}
