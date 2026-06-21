import { apiClient } from './client'
import type {
  ProfessionalProfile,
  InboxItem,
  ProfessionalClientGroup,
  ProfessionalNote,
  GlossaryTerm,
  SharedCaseBundle,
  ProfessionalEchoMessage,
  ProfessionalEchoSession,
  ProfessionalEchoSummary,
} from '@/types'

interface EchoChatResult {
  user_message: ProfessionalEchoMessage
  assistant_message: ProfessionalEchoMessage
  session_id: string
}

export interface DashboardCase {
  case_id: string
  client_display_name: string
  case_title: string
  open_count: number
  last_activity: string | null
}
export interface DashboardAttention {
  case_id: string
  client_display_name: string
  kind: 'questionnaire_answered' | 'message_reply'
  title: string
  detail: string
  at: string | null
}
export interface DashboardAppointment {
  case_id: string
  client_display_name: string
  title: string
  start_at: string
  status: string
  location?: string | null
}
export interface ProfessionalDashboard {
  cases: DashboardCase[]
  attention: DashboardAttention[]
  appointments: DashboardAppointment[]
}

export type TemplateType = 'questionnaire' | 'resource' | 'message' | 'dialog'
export interface ProfessionalTemplate {
  id: string
  type: TemplateType
  title: string | null
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const professionalApi = {
  // Rolle / Profil
  me: () =>
    apiClient.get<ProfessionalProfile>('/professional/me').then(r => r.data),
  register: (data: { display_name: string; title?: string | null }) =>
    apiClient.post<ProfessionalProfile>('/professional/register', data).then(r => r.data),

  // Dashboard (fallübergreifendes Cockpit)
  dashboard: () =>
    apiClient.get<ProfessionalDashboard>('/professional/dashboard').then(r => r.data),

  // Postfach / Fälle
  inbox: () =>
    apiClient.get<InboxItem[]>('/professional/inbox').then(r => r.data),
  cases: () =>
    apiClient.get<ProfessionalClientGroup[]>('/professional/cases').then(r => r.data),
  caseDetail: (caseId: string) =>
    apiClient.get<SharedCaseBundle>(`/professional/cases/${caseId}`).then(r => r.data),

  // Notizen
  saveNotes: (caseId: string, data: ProfessionalNote) =>
    apiClient.put<ProfessionalNote>(`/professional/cases/${caseId}/notes`, data).then(r => r.data),

  // Ressourcen-Bibliothek (Vorlagen)
  templates: () =>
    apiClient.get<ProfessionalTemplate[]>('/professional/templates').then(r => r.data),
  templateCreate: (data: { type: TemplateType; title?: string | null; payload: Record<string, unknown> }) =>
    apiClient.post<ProfessionalTemplate>('/professional/templates', data).then(r => r.data),
  templateDelete: (id: string) =>
    apiClient.delete(`/professional/templates/${id}`).then(r => r.data),
  shareTemplate: (caseId: string, templateId: string) =>
    apiClient
      .post(`/professional/cases/${caseId}/assignments/from-template`, { template_id: templateId })
      .then(r => r.data),

  // Glossar
  glossary: () =>
    apiClient.get<GlossaryTerm[]>('/professional/glossary').then(r => r.data),

  // Echo
  echoSessions: (caseId: string) =>
    apiClient.get<ProfessionalEchoSession[]>(`/professional/cases/${caseId}/echo/sessions`).then(r => r.data),
  echoHistory: (caseId: string, sessionId: string) =>
    apiClient.get<ProfessionalEchoMessage[]>(`/professional/cases/${caseId}/echo/history`, {
      params: { session_id: sessionId },
    }).then(r => r.data),
  echoChat: (caseId: string, data: {
    message: string
    thread_type?: 'case' | 'glossary'
    glossary_slug?: string
    session_id?: string
  }) =>
    apiClient.post<EchoChatResult>(`/professional/cases/${caseId}/echo/chat`, data).then(r => r.data),
  echoSummaryGenerate: (caseId: string, sessionId: string) =>
    apiClient.post<{ summary: string }>(
      `/professional/cases/${caseId}/echo/summary`, null, { params: { session_id: sessionId } },
    ).then(r => r.data),
  echoSummarySave: (caseId: string, data: { session_id?: string; title?: string; summary_text: string }) =>
    apiClient.post<ProfessionalEchoSummary>(`/professional/cases/${caseId}/echo/summaries`, data).then(r => r.data),
  echoSessionRename: (caseId: string, sessionId: string, title: string) =>
    apiClient
      .patch<ProfessionalEchoSession>(`/professional/cases/${caseId}/echo/sessions/${sessionId}`, { title })
      .then(r => r.data),
  echoSessionDelete: (caseId: string, sessionId: string) =>
    apiClient.delete(`/professional/cases/${caseId}/echo/sessions/${sessionId}`).then(r => r.data),
  echoSummaryDelete: (caseId: string, summaryId: string) =>
    apiClient.delete(`/professional/cases/${caseId}/echo/summaries/${summaryId}`).then(r => r.data),
}
