import { apiClient } from './client'
import type { StudentProfile, StudentCase, StudentCaseDetail } from '@/types'

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
}
