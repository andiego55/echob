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

export interface ProEchoSettings {
  echo_approach: string
  echo_tone: number | null
  echo_depth: number | null
  echo_custom_steering: string | null
}

export interface DashboardItem {
  assignment_id: string
  direction: 'in' | 'out'
  kind: 'questionnaire_answered' | 'dialog_summary' | 'message_reply' | 'open_task'
  title: string
  detail: string
  unread: boolean
  tab: string
  at: string | null
}
export interface DashboardCase {
  case_id: string
  client_display_name: string
  case_title: string
  element_types: string[]
  unread_count: number
  open_count: number
  next_appointment: { title: string; start_at: string } | null
  last_activity: string | null
  items: DashboardItem[]
}
export interface ProfessionalDashboard {
  cases: DashboardCase[]
  total_unread: number
}

export interface PostfachAttention {
  assignment_id: string
  case_id: string
  client_display_name: string
  kind: 'questionnaire_answered' | 'dialog_summary' | 'message_reply'
  title: string
  detail: string
  at: string | null
  unread: boolean
}
export interface PostfachShare {
  case_id: string
  client_display_name: string
  case_title: string
  shared_at: string
}
export interface ProfessionalPostfach {
  attention: PostfachAttention[]
  shares: PostfachShare[]
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

  // Echo-Aussteuerung (therapeutischer Ansatz + Regler + Freitext)
  getEchoSettings: () =>
    apiClient.get<ProEchoSettings>('/professional/echo-settings').then(r => r.data),
  saveEchoSettings: (data: ProEchoSettings) =>
    apiClient.put<ProEchoSettings>('/professional/echo-settings', data).then(r => r.data),

  // Dashboard (fallübergreifendes Cockpit)
  dashboard: () =>
    apiClient.get<ProfessionalDashboard>('/professional/dashboard').then(r => r.data),

  // Postfach (alle Eingänge, gelesen/ungelesen)
  postfach: () =>
    apiClient.get<ProfessionalPostfach>('/professional/postfach').then(r => r.data),
  markAssignmentRead: (id: string) =>
    apiClient.post(`/professional/assignments/${id}/read`).then(r => r.data),
  markAssignmentUnread: (id: string) =>
    apiClient.post(`/professional/assignments/${id}/unread`).then(r => r.data),

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
  templateUpdate: (id: string, data: { title?: string | null; payload: Record<string, unknown> }) =>
    apiClient.patch<ProfessionalTemplate>(`/professional/templates/${id}`, data).then(r => r.data),
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
  echoSummaryUpdate: (caseId: string, summaryId: string, data: { title?: string | null; summary_text: string }) =>
    apiClient
      .patch<ProfessionalEchoSummary>(`/professional/cases/${caseId}/echo/summaries/${summaryId}`, data)
      .then(r => r.data),
  echoSummaryDelete: (caseId: string, summaryId: string) =>
    apiClient.delete(`/professional/cases/${caseId}/echo/summaries/${summaryId}`).then(r => r.data),
}
