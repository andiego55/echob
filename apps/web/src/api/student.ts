import { apiClient } from './client'
import type { StudentProfile, StudentCase, StudentCaseDetail, StudentEchoMessage } from '@/types'

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
}
