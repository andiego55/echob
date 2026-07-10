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
  ProReportTemplate,
  ProfessionalReport,
  ProfessionalReportListItem,
  NoteTemplate,
  SessionNote,
  Organization,
  OrgInvite,
  OrgBillingStatus,
  ActivationLogEntry,
  CaseCoupleStatus,
  CoupleMeta,
  CoupleEchoSession,
  CoupleReport,
  CoupleReportListItem,
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
  is_demo?: boolean
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

  // Berichtsvorlagen (eigene, fall-unabhängig)
  reportTemplates: () =>
    apiClient.get<ProReportTemplate[]>('/professional/report-templates').then(r => r.data),
  reportTemplateCreate: (data: { name: string; instruction: string }) =>
    apiClient.post<ProReportTemplate>('/professional/report-templates', data).then(r => r.data),
  reportTemplateUpdate: (id: string, data: { name: string; instruction: string }) =>
    apiClient.patch<ProReportTemplate>(`/professional/report-templates/${id}`, data).then(r => r.data),
  reportTemplateDelete: (id: string) =>
    apiClient.delete(`/professional/report-templates/${id}`).then(r => r.data),
  reportTemplateAssist: (description: string) =>
    apiClient
      .post<{ instruction: string }>('/professional/report-templates/assist', { description }, { timeout: 120_000 })
      .then(r => r.data),

  // Fallberichte (generiert) — Erstellen ruft Echo (lange Laufzeit → 120s Timeout)
  caseReports: (caseId: string) =>
    apiClient.get<ProfessionalReportListItem[]>(`/professional/cases/${caseId}/reports`).then(r => r.data),
  caseReport: (caseId: string, reportId: string) =>
    apiClient.get<ProfessionalReport>(`/professional/cases/${caseId}/reports/${reportId}`).then(r => r.data),
  caseReportCreate: (
    caseId: string,
    data: { source: 'standard' | 'template'; standard_key?: string; template_id?: string; title?: string | null },
  ) =>
    apiClient
      .post<ProfessionalReport>(`/professional/cases/${caseId}/reports`, data, { timeout: 120_000 })
      .then(r => r.data),
  caseReportUpdate: (
    caseId: string,
    reportId: string,
    data: { title?: string | null; sections?: { heading: string; text: string }[] },
  ) =>
    apiClient
      .patch<ProfessionalReport>(`/professional/cases/${caseId}/reports/${reportId}`, data)
      .then(r => r.data),
  caseReportDelete: (caseId: string, reportId: string) =>
    apiClient.delete(`/professional/cases/${caseId}/reports/${reportId}`).then(r => r.data),

  // Notiz-Vorlagen (eingebaute + eigene)
  noteTemplates: () =>
    apiClient.get<NoteTemplate[]>('/professional/note-templates').then(r => r.data),
  noteTemplateCreate: (data: { name: string; fields: string[] }) =>
    apiClient.post<NoteTemplate>('/professional/note-templates', data).then(r => r.data),
  noteTemplateUpdate: (id: string, data: { name: string; fields: string[] }) =>
    apiClient.patch<NoteTemplate>(`/professional/note-templates/${id}`, data).then(r => r.data),
  noteTemplateDelete: (id: string) =>
    apiClient.delete(`/professional/note-templates/${id}`).then(r => r.data),

  // Sitzungsnotizen (Verlauf)
  sessionNotes: (caseId: string) =>
    apiClient.get<SessionNote[]>(`/professional/cases/${caseId}/session-notes`).then(r => r.data),
  sessionNoteCreate: (
    caseId: string,
    data: { session_date?: string | null; title?: string | null; sections: { heading: string; text: string }[] },
  ) =>
    apiClient.post<SessionNote>(`/professional/cases/${caseId}/session-notes`, data).then(r => r.data),
  sessionNoteUpdate: (
    caseId: string,
    noteId: string,
    data: { session_date?: string | null; title?: string | null; sections?: { heading: string; text: string }[] },
  ) =>
    apiClient
      .patch<SessionNote>(`/professional/cases/${caseId}/session-notes/${noteId}`, data)
      .then(r => r.data),
  sessionNoteDelete: (caseId: string, noteId: string) =>
    apiClient.delete(`/professional/cases/${caseId}/session-notes/${noteId}`).then(r => r.data),

  // Organisation / Praxis
  org: () =>
    apiClient.get<Organization>('/professional/org').then(r => r.data),
  orgRename: (name: string) =>
    apiClient.patch<Organization>('/professional/org', { name }).then(r => r.data),
  orgInviteMember: (email: string) =>
    apiClient.post<OrgInvite>('/professional/org/members/invite', { email }).then(r => r.data),
  orgMemberRole: (userId: string, role: 'admin' | 'member') =>
    apiClient.post(`/professional/org/members/${userId}/role`, { role }).then(r => r.data),
  orgMemberRemove: (userId: string) =>
    apiClient.delete(`/professional/org/members/${userId}`).then(r => r.data),
  orgInvitesIncoming: () =>
    apiClient.get<OrgInvite[]>('/professional/org/invites').then(r => r.data),
  orgInviteAccept: (inviteId: string) =>
    apiClient.post<Organization>(`/professional/org/invites/${inviteId}/accept`).then(r => r.data),

  // Org-Abrechnung + Fall-Aktivierung (Sitze)
  orgBilling: () =>
    apiClient.get<OrgBillingStatus>('/professional/org/billing').then(r => r.data),
  orgBillingActivations: () =>
    apiClient.get<ActivationLogEntry[]>('/professional/org/billing/activations').then(r => r.data),
  orgBillingCheckout: (tier: 'solo' | 'praxis' | 'institut') =>
    apiClient.post<{ url: string }>('/professional/org/billing/checkout', { tier }).then(r => r.data),
  orgBillingVerify: (session_id: string) =>
    apiClient
      .post<{ activated: boolean; plan: string | null }>('/professional/org/billing/checkout/verify', { session_id })
      .then(r => r.data),
  orgBillingPortal: () =>
    apiClient.post<{ url: string }>('/professional/org/billing/portal').then(r => r.data),
  caseActivate: (caseId: string) =>
    apiClient.post(`/professional/cases/${caseId}/activate`).then(r => r.data),
  caseDeactivate: (caseId: string) =>
    apiClient.delete(`/professional/cases/${caseId}/activate`).then(r => r.data),

  // Paar-Analyse (gekoppelte Fälle) — Freigaben bleiben unverändert; kein neuer Zugriff.
  caseCoupleStatus: (caseId: string) =>
    apiClient.get<CaseCoupleStatus>(`/professional/cases/${caseId}/couple`).then(r => r.data),
  createCouple: (case_id_a: string, case_id_b: string) =>
    apiClient.post('/professional/couples', { case_id_a, case_id_b }).then(r => r.data),
  deleteCouple: (coupleId: string) =>
    apiClient.delete(`/professional/couples/${coupleId}`).then(r => r.data),
  coupleMeta: () =>
    apiClient.get<CoupleMeta>('/professional/couples/meta').then(r => r.data),
  coupleEchoSessions: (coupleId: string) =>
    apiClient.get<CoupleEchoSession[]>(`/professional/couples/${coupleId}/echo/sessions`).then(r => r.data),
  coupleEchoHistory: (coupleId: string, sessionId: string) =>
    apiClient.get<ProfessionalEchoMessage[]>(`/professional/couples/${coupleId}/echo/history`, {
      params: { session_id: sessionId },
    }).then(r => r.data),
  coupleEchoChat: (coupleId: string, data: {
    message: string
    thread_type?: 'couple' | 'glossary'
    glossary_slug?: string
    session_id?: string
  }) =>
    apiClient.post<EchoChatResult>(`/professional/couples/${coupleId}/echo/chat`, data, { timeout: 120_000 })
      .then(r => r.data),
  deleteCoupleSession: (coupleId: string, sessionId: string) =>
    apiClient.delete(`/professional/couples/${coupleId}/echo/sessions/${sessionId}`).then(r => r.data),
  coupleReports: (coupleId: string) =>
    apiClient.get<CoupleReportListItem[]>(`/professional/couples/${coupleId}/reports`).then(r => r.data),
  createCoupleReport: (
    coupleId: string,
    data: { source?: 'standard' | 'template'; template_id?: string; title?: string },
  ) =>
    apiClient.post<CoupleReport>(`/professional/couples/${coupleId}/reports`, data, { timeout: 180_000 })
      .then(r => r.data),
  getCoupleReport: (coupleId: string, reportId: string) =>
    apiClient.get<CoupleReport>(`/professional/couples/${coupleId}/reports/${reportId}`).then(r => r.data),
  updateCoupleReport: (
    coupleId: string, reportId: string,
    data: { title?: string | null; sections?: { heading: string; text: string }[] },
  ) =>
    apiClient.patch<CoupleReport>(`/professional/couples/${coupleId}/reports/${reportId}`, data).then(r => r.data),
  deleteCoupleReport: (coupleId: string, reportId: string) =>
    apiClient.delete(`/professional/couples/${coupleId}/reports/${reportId}`).then(r => r.data),
}
