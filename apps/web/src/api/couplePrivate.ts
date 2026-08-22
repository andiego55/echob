import { apiClient } from './client'

/**
 * Privater, flankierender Echo-Dialog zur Paarsitzung.
 *
 * Diese Inhalte gehören ausschließlich der angemeldeten Person – die Partnerperson hat
 * keinen Endpunkt, über den sie sie sehen könnte.
 */
export interface CouplePrivateMessage {
  id: string
  role: 'user' | 'echo'
  kind: 'chat' | 'feedback'
  content: string
  /** 'acute' | 'elevated', wenn die Sicherheits-Triage eingegriffen hat. */
  safety?: 'acute' | 'elevated' | null
  created_at: string
}

export interface CouplePrivateThread {
  messages: CouplePrivateMessage[]
}

export const couplePrivateApi = {
  get: (sessionId: string) =>
    apiClient.get<CouplePrivateThread>(`/couple/sessions/${sessionId}/private`).then(r => r.data),

  send: (sessionId: string, content: string) =>
    apiClient
      .post<CouplePrivateThread>(`/couple/sessions/${sessionId}/private`, { content })
      .then(r => r.data),

  feedback: (sessionId: string) =>
    apiClient
      .post<CouplePrivateThread>(`/couple/sessions/${sessionId}/private/feedback`)
      .then(r => r.data),
}
