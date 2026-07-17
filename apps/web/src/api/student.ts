import { apiClient } from './client'
import type { Hypothesis } from './hypotheses'
import type {
  StudentProfile, StudentCase, StudentCaseDetail, StudentEchoMessage, StudentNotes,
  StudentSubmission, StudentSessionNote, StudentEchoSession, StudentEchoChatResult,
  GlossaryTerm, Report, ReportCreate, ScalesOverview, CaseTrends, CaseReview, StudentAssignment,
} from '@/types'

type SessionNoteInput = { session_date?: string | null; title?: string | null; sections: { heading: string; text: string }[] }

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

  // Glossar (Echo-Dialog)
  glossary: () =>
    apiClient.get<GlossaryTerm[]>('/student/glossary').then(r => r.data),

  // Echo-Dialog (session-basiert, mit Glossar) über die Arbeitskopie
  echoSessions: (copyId: string) =>
    apiClient.get<StudentEchoSession[]>(`/student/cases/${copyId}/echo/sessions`).then(r => r.data),
  echoHistory: (copyId: string, sessionId: string) =>
    apiClient.get<StudentEchoMessage[]>(`/student/cases/${copyId}/echo/history`, { params: { session_id: sessionId } }).then(r => r.data),
  echoChat: (copyId: string, data: { message: string; session_id?: string; thread_type?: 'topic' | 'glossary'; glossary_slug?: string }) =>
    apiClient.post<StudentEchoChatResult>(`/student/cases/${copyId}/echo/chat`, data, { timeout: 120_000 }).then(r => r.data),
  echoSessionRename: (copyId: string, sessionId: string, title: string) =>
    apiClient.patch<StudentEchoSession>(`/student/cases/${copyId}/echo/sessions/${sessionId}`, { title }).then(r => r.data),
  echoSessionDelete: (copyId: string, sessionId: string) =>
    apiClient.delete(`/student/cases/${copyId}/echo/sessions/${sessionId}`).then(r => r.data),

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

  // Notizen: stehender Fallüberblick (6 Felder)
  notes: (copyId: string) =>
    apiClient.get<StudentNotes>(`/student/cases/${copyId}/notes`).then(r => r.data),
  notesSave: (copyId: string, data: StudentNotes) =>
    apiClient.put<StudentNotes>(`/student/cases/${copyId}/notes`, data).then(r => r.data),

  // Notizen: Sitzungsverlauf (titelbare Notizen aus Vorlagen)
  sessionNotes: (copyId: string) =>
    apiClient.get<StudentSessionNote[]>(`/student/cases/${copyId}/session-notes`).then(r => r.data),
  sessionNoteCreate: (copyId: string, data: SessionNoteInput) =>
    apiClient.post<StudentSessionNote>(`/student/cases/${copyId}/session-notes`, data).then(r => r.data),
  sessionNoteUpdate: (copyId: string, noteId: string, data: SessionNoteInput) =>
    apiClient.put<StudentSessionNote>(`/student/cases/${copyId}/session-notes/${noteId}`, data).then(r => r.data),
  sessionNoteDelete: (copyId: string, noteId: string) =>
    apiClient.delete(`/student/cases/${copyId}/session-notes/${noteId}`).then(r => r.data),

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

  // Paar-Analyse (session-basiert, mit Glossar) — nur bei Arbeitskopien mit Partnerperson
  coupleSessions: (copyId: string) =>
    apiClient.get<StudentEchoSession[]>(`/student/cases/${copyId}/couple/sessions`).then(r => r.data),
  coupleHistory: (copyId: string, sessionId: string) =>
    apiClient.get<StudentEchoMessage[]>(`/student/cases/${copyId}/couple/history`, { params: { session_id: sessionId } }).then(r => r.data),
  coupleChat: (copyId: string, data: { message: string; session_id?: string; thread_type?: 'topic' | 'glossary'; glossary_slug?: string }) =>
    apiClient.post<StudentEchoChatResult>(`/student/cases/${copyId}/couple/chat`, data, { timeout: 120_000 }).then(r => r.data),
  coupleSessionRename: (copyId: string, sessionId: string, title: string) =>
    apiClient.patch<StudentEchoSession>(`/student/cases/${copyId}/couple/sessions/${sessionId}`, { title }).then(r => r.data),
  coupleSessionDelete: (copyId: string, sessionId: string) =>
    apiClient.delete(`/student/cases/${copyId}/couple/sessions/${sessionId}`).then(r => r.data),

  // Rollenspiel (Echo spielt die Klient:in) — session-basiert
  roleplaySessions: (copyId: string) =>
    apiClient.get<StudentEchoSession[]>(`/student/cases/${copyId}/roleplay/sessions`).then(r => r.data),
  roleplayHistory: (copyId: string, sessionId: string) =>
    apiClient.get<StudentEchoMessage[]>(`/student/cases/${copyId}/roleplay/history`, { params: { session_id: sessionId } }).then(r => r.data),
  roleplayChat: (copyId: string, data: { message: string; session_id?: string }) =>
    apiClient.post<StudentEchoChatResult>(`/student/cases/${copyId}/roleplay/chat`, data, { timeout: 120_000 }).then(r => r.data),
  roleplaySessionRename: (copyId: string, sessionId: string, title: string) =>
    apiClient.patch<StudentEchoSession>(`/student/cases/${copyId}/roleplay/sessions/${sessionId}`, { title }).then(r => r.data),
  roleplaySessionDelete: (copyId: string, sessionId: string) =>
    apiClient.delete(`/student/cases/${copyId}/roleplay/sessions/${sessionId}`).then(r => r.data),
  roleplayAnalyze: (copyId: string, sessionId: string) =>
    apiClient.post<{ analysis: string }>(`/student/cases/${copyId}/roleplay/sessions/${sessionId}/analyze`, undefined, { timeout: 120_000 }).then(r => r.data),

  // Muster & Skalen (KI-Einschätzung der Fallperson)
  scales: (copyId: string) =>
    apiClient.get<ScalesOverview>(`/student/cases/${copyId}/scales`).then(r => r.data),
  scalesCalculate: (copyId: string) =>
    apiClient.post<ScalesOverview>(`/student/cases/${copyId}/scales/calculate`, undefined, { timeout: 120_000 }).then(r => r.data),

  // Verlauf & Rückblick
  reviewTrends: (copyId: string) =>
    apiClient.get<CaseTrends>(`/student/cases/${copyId}/reviews/trends`).then(r => r.data),
  reviews: (copyId: string) =>
    apiClient.get<{ reviews: CaseReview[]; total: number }>(`/student/cases/${copyId}/reviews`).then(r => r.data),
  reviewCreate: (copyId: string) =>
    apiClient.post<CaseReview>(`/student/cases/${copyId}/reviews`, undefined, { timeout: 120_000 }).then(r => r.data),
  reviewDelete: (copyId: string, reviewId: string) =>
    apiClient.delete(`/student/cases/${copyId}/reviews/${reviewId}`).then(r => r.data),

  // Aufgaben (student-weit, nicht fall-gebunden)
  assignments: () =>
    apiClient.get<StudentAssignment[]>('/student/assignments').then(r => r.data),
  assignmentRespond: (saId: string, text: string, submit: boolean) =>
    apiClient.post<StudentAssignment>(`/student/assignments/${saId}/respond`, { text, submit }).then(r => r.data),
}
