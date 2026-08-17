import { apiClient } from './client'

/**
 * Moderierte Sitzungen im Paarraum.
 *
 * Kontext-Regel: `draft_text` ist der KI-Entwurf und bleibt bei der verfassenden Person.
 * Erst `confirmed_text` geht an Echo – und ist dann im Raum für beide sichtbar.
 */
export interface CoupleSession {
  id: string
  couple_id: string
  created_by: string
  title: string
  topic: string | null
  goal: string | null
  status: 'draft' | 'proposed' | 'open' | 'closed'
  created_at: string
  opened_at: string | null
  closed_at: string | null
  proposed_at: string | null
  accepted_by: string | null
  accepted_at: string | null
  declined_at: string | null
  scheduled_for: string | null
}

export interface CoupleSessionMessage {
  id: string
  role: 'partner' | 'echo'
  user_id: string | null
  speaker: string
  content: string
  created_at: string
}

export interface CoupleSharedContext {
  user_id: string
  name: string
  text: string
  mood: string | null
  appreciation: string | null
}

export interface CoupleSessionDetail {
  session: CoupleSession
  members: { user_id: string; name: string }[]
  messages: CoupleSessionMessage[]
  contexts: CoupleSharedContext[]
}

export interface CoupleContext {
  draft_text: string | null
  confirmed_text: string | null
  instruction: string | null
  source_elements: string[]
  confirmed_at: string | null
  available_elements: Record<string, string>
  max_chars: number
  mood: string | null
  appreciation: string | null
  /** Kürzel → Klartext für den Stimmungs-Check. */
  moods: Record<string, string>
}

export const coupleSessionsApi = {
  list: (coupleId: string) =>
    apiClient.get<CoupleSession[]>(`/couple/links/${coupleId}/sessions`).then(r => r.data),

  create: (coupleId: string, body: { title: string; topic?: string | null; goal?: string | null }) =>
    apiClient.post<CoupleSession>(`/couple/links/${coupleId}/sessions`, body).then(r => r.data),

  get: (sessionId: string) =>
    apiClient.get<CoupleSessionDetail>(`/couple/sessions/${sessionId}`).then(r => r.data),

  update: (sessionId: string, body: { title?: string; topic?: string | null; goal?: string | null }) =>
    apiClient.patch<CoupleSession>(`/couple/sessions/${sessionId}`, body).then(r => r.data),

  setStatus: (sessionId: string, status: CoupleSession['status']) =>
    apiClient.post<CoupleSession>(`/couple/sessions/${sessionId}/status`, { status }).then(r => r.data),

  getContext: (sessionId: string) =>
    apiClient.get<CoupleContext>(`/couple/sessions/${sessionId}/context`).then(r => r.data),

  draftContext: (sessionId: string, body: { case_id: string; elements: string[]; focus?: string | null }) =>
    apiClient.post<CoupleContext>(`/couple/sessions/${sessionId}/context/draft`, body).then(r => r.data),

  saveContext: (
    sessionId: string,
    body: {
      draft_text?: string | null; confirmed_text?: string | null; instruction?: string | null
      mood?: string | null; appreciation?: string | null
    },
  ) => apiClient.put<CoupleContext>(`/couple/sessions/${sessionId}/context`, body).then(r => r.data),

  /** Ich-Botschaften-Coach – nur für dich, wird nicht gespeichert. */
  rephrase: (sessionId: string, text: string) =>
    apiClient.post<{ suggestion: string }>(`/couple/sessions/${sessionId}/rephrase`, { text })
      .then(r => r.data.suggestion),

  propose: (sessionId: string) =>
    apiClient.post<CoupleSession>(`/couple/sessions/${sessionId}/propose`).then(r => r.data),

  respond: (sessionId: string, accept: boolean) =>
    apiClient.post<CoupleSession>(`/couple/sessions/${sessionId}/respond`, { accept }).then(r => r.data),

  schedule: (sessionId: string, scheduledFor: string | null) =>
    apiClient.post<CoupleSession>(`/couple/sessions/${sessionId}/schedule`, { scheduled_for: scheduledFor })
      .then(r => r.data),

  send: (sessionId: string, content: string) =>
    apiClient.post<CoupleSessionDetail>(`/couple/sessions/${sessionId}/messages`, { content }).then(r => r.data),

  moderate: (sessionId: string) =>
    apiClient.post<CoupleSessionDetail>(`/couple/sessions/${sessionId}/moderate`).then(r => r.data),
}
