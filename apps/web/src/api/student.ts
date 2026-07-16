import { apiClient } from './client'
import type { Hypothesis } from './hypotheses'
import type {
  StudentProfile, StudentCase, StudentCaseDetail, StudentEchoMessage, StudentNotes,
  StudentSubmission, Report, ReportCreate,
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

  // Notizen (student-scoped, wie Fachpersonen-Notizen)
  notes: (copyId: string) =>
    apiClient.get<StudentNotes>(`/student/cases/${copyId}/notes`).then(r => r.data),
  notesSave: (copyId: string, data: StudentNotes) =>
    apiClient.put<StudentNotes>(`/student/cases/${copyId}/notes`, data).then(r => r.data),

  // Hypothesen (geführte Dialoge, student-scoped — thread_type hyp_*)
  hypotheses: (copyId: string) =>
    apiClient.get<Hypothesis[]>(`/student/cases/${copyId}/hypotheses`).then(r => r.data),
  hypSave: (copyId: string, hypothesis_type: string, summary_text: string) =>
    apiClient.put<Hypothesis>(`/student/cases/${copyId}/hypotheses`, { hypothesis_type, summary_text }).then(r => r.data),
  hypGenerate: (copyId: string, hypothesis_type: string) =>
    apiClient.post<{ summary: string }>(`/student/cases/${copyId}/hypotheses/generate`, { hypothesis_type }, { timeout: 120_000 }).then(r => r.data),
  hypRemove: (copyId: string, hypothesis_type: string) =>
    apiClient.delete(`/student/cases/${copyId}/hypotheses/${hypothesis_type}`).then(r => r.data),
  hypHistory: (copyId: string, hypType: string) =>
    apiClient.get<StudentEchoMessage[]>(`/student/cases/${copyId}/hypotheses/${hypType}/history`).then(r => r.data),
  hypChat: (copyId: string, hypType: string, message: string) =>
    apiClient.post<StudentEchoMessage>(`/student/cases/${copyId}/hypotheses/${hypType}/chat`, { message }, { timeout: 120_000 }).then(r => r.data),
  hypReset: (copyId: string, hypType: string) =>
    apiClient.delete(`/student/cases/${copyId}/hypotheses/${hypType}/history`).then(r => r.data),

  // Senden an Institut (Einreichung der Fallarbeit)
  submit: (copyId: string, message: string | null) =>
    apiClient.post<StudentSubmission>(`/student/cases/${copyId}/submit`, { message }).then(r => r.data),
  submissions: (copyId: string) =>
    apiClient.get<StudentSubmission[]>(`/student/cases/${copyId}/submissions`).then(r => r.data),

  // Paar-Analyse (nur bei Arbeitskopien mit Partnerperson) — thread_type 'couple'
  coupleHistory: (copyId: string) =>
    apiClient.get<StudentEchoMessage[]>(`/student/cases/${copyId}/couple/history`).then(r => r.data),
  coupleChat: (copyId: string, message: string) =>
    apiClient.post<StudentEchoMessage>(`/student/cases/${copyId}/couple/chat`, { message }, { timeout: 120_000 }).then(r => r.data),
  coupleReset: (copyId: string) =>
    apiClient.delete(`/student/cases/${copyId}/couple/history`).then(r => r.data),
}
