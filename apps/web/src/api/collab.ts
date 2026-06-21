import { apiClient } from './client'

export type AssignmentType = 'dialog' | 'questionnaire' | 'message' | 'resource'

export interface Assignment {
  id: string
  case_id: string
  type: AssignmentType
  title: string | null
  payload: Record<string, unknown>
  status: string
  response: Record<string, unknown> | null
  due_at: string | null
  created_at: string
}

export interface Appointment {
  id: string
  case_id: string
  title: string | null
  payload: Record<string, unknown>
  start_at: string
  end_at: string | null
  status: string
  proposed_by: string
}

export interface InboxData {
  assignments: Assignment[]
  appointments: Appointment[]
}

export const collabApi = {
  // ── Nutzer-Inbox ──────────────────────────────────────────────
  inbox: () => apiClient.get<InboxData>('/inbox').then(r => r.data),
  markSeen: (id: string) =>
    apiClient.patch<Assignment>(`/inbox/assignments/${id}/seen`).then(r => r.data),
  submitResponse: (id: string, response: Record<string, unknown>) =>
    apiClient.post<Assignment>(`/inbox/assignments/${id}/response`, { response }).then(r => r.data),
  replyMessage: (id: string, text: string) =>
    apiClient.post<Assignment>(`/inbox/assignments/${id}/message`, { text }).then(r => r.data),
  sendDialogSummary: (id: string, data: { summary: string; note?: string }) =>
    apiClient.post<Assignment>(`/inbox/assignments/${id}/dialog-summary`, data).then(r => r.data),
  dismissAssignment: (id: string) =>
    apiClient.delete(`/inbox/assignments/${id}`).then(r => r.data),
  setAppointmentStatus: (id: string, status: 'confirmed' | 'cancelled') =>
    apiClient.patch<Appointment>(`/inbox/appointments/${id}`, { status }).then(r => r.data),

  // ── Profi-Seite (Zuweisen / Termin vorschlagen) ───────────────
  createAssignment: (
    caseId: string,
    data: { type: AssignmentType; title?: string | null; payload?: Record<string, unknown>; appointment_id?: string | null; due_at?: string | null },
  ) => apiClient.post<Assignment>(`/professional/cases/${caseId}/assignments`, data).then(r => r.data),
  listAssignments: (caseId: string) =>
    apiClient.get<Assignment[]>(`/professional/cases/${caseId}/assignments`).then(r => r.data),
  proReplyMessage: (caseId: string, id: string, text: string) =>
    apiClient.post<Assignment>(`/professional/cases/${caseId}/assignments/${id}/message`, { text }).then(r => r.data),
  createAppointment: (
    caseId: string,
    data: { title?: string | null; payload?: Record<string, unknown>; start_at: string; end_at?: string | null },
  ) => apiClient.post<Appointment>(`/professional/cases/${caseId}/appointments`, data).then(r => r.data),
  listAppointments: (caseId: string) =>
    apiClient.get<Appointment[]>(`/professional/cases/${caseId}/appointments`).then(r => r.data),
  completeAppointment: (caseId: string, appointmentId: string) =>
    apiClient.post(`/professional/cases/${caseId}/appointments/${appointmentId}/complete`).then(r => r.data),
  reopenAppointment: (caseId: string, appointmentId: string) =>
    apiClient.post(`/professional/cases/${caseId}/appointments/${appointmentId}/reopen`).then(r => r.data),
  deleteAppointment: (caseId: string, appointmentId: string) =>
    apiClient.delete(`/professional/cases/${caseId}/appointments/${appointmentId}`).then(r => r.data),
}
