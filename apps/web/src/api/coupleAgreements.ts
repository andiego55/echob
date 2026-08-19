import { apiClient } from './client'

/**
 * Zusammenfassungen und Abmachungen im Paarraum – beides gehört beiden Personen.
 * Eine Abmachung gilt erst, wenn die jeweils andere Person zugestimmt hat.
 */
export interface CoupleSummary {
  id: string
  session_id: string
  created_by: string
  summary_text: string
  created_at: string
}

export interface CoupleAgreement {
  id: string
  couple_id: string
  session_id: string | null
  body: string
  proposed_by: string
  accepted_by: string | null
  accepted_at: string | null
  status: 'proposed' | 'active' | 'kept' | 'dropped'
  due_at: string | null
  /** Gesetzt, sobald jemand die Nachfrage beantwortet hat. */
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

export const coupleAgreementsApi = {
  createSummary: (sessionId: string) =>
    apiClient.post<CoupleSummary>(`/couple/sessions/${sessionId}/summary`).then(r => r.data),

  listSummaries: (sessionId: string) =>
    apiClient.get<CoupleSummary[]>(`/couple/sessions/${sessionId}/summaries`).then(r => r.data),

  list: (coupleId: string) =>
    apiClient.get<CoupleAgreement[]>(`/couple/links/${coupleId}/agreements`).then(r => r.data),

  /** Was heute nachgefragt gehört: geltende Abmachungen mit erreichtem Termin. */
  listDue: (coupleId: string) =>
    apiClient.get<CoupleAgreement[]>(`/couple/links/${coupleId}/agreements/due`).then(r => r.data),

  /** `again` verschiebt die Nachfrage um eine Woche, statt sie zu beenden. */
  review: (agreementId: string, body: { outcome: 'kept' | 'again' | 'dropped'; note?: string | null }) =>
    apiClient.post<CoupleAgreement>(`/couple/agreements/${agreementId}/review`, body).then(r => r.data),

  propose: (coupleId: string, body: { body: string; session_id?: string | null; due_at?: string | null }) =>
    apiClient.post<CoupleAgreement>(`/couple/links/${coupleId}/agreements`, body).then(r => r.data),

  accept: (agreementId: string) =>
    apiClient.post<CoupleAgreement>(`/couple/agreements/${agreementId}/accept`).then(r => r.data),

  setStatus: (agreementId: string, status: 'kept' | 'dropped') =>
    apiClient.post<CoupleAgreement>(`/couple/agreements/${agreementId}/status`, { status }).then(r => r.data),
}
