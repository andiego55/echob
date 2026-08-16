import { apiClient } from './client'

/**
 * AI-Mediation nach dem Caucus-Modell.
 *
 * Pro Thema hat jede Person einen offenen Beitrag (beide sehen ihn) und optional einen
 * vertraulichen (nur Echo). `private_text` ist in einer Antwort ausschließlich bei der
 * eigenen Perspektive gefüllt – bei der anderen Person immer `null`.
 */
export interface CoupleTopic {
  id: string
  couple_id: string
  created_by: string
  title: string
  description: string | null
  status: 'open' | 'resolved'
  created_at: string
  updated_at: string
}

export interface CouplePerspective {
  user_id: string
  name: string
  is_own: boolean
  open_text: string | null
  private_text: string | null
  updated_at: string
}

export interface CoupleMediation {
  id: string
  topic_id: string
  created_by: string
  body: string
  created_at: string
}

export interface CoupleTopicDetail {
  topic: CoupleTopic
  perspectives: CouplePerspective[]
  mediations: CoupleMediation[]
  both_sides_ready: boolean
}

export const coupleMediationApi = {
  list: (coupleId: string) =>
    apiClient.get<CoupleTopic[]>(`/couple/links/${coupleId}/topics`).then(r => r.data),

  create: (coupleId: string, body: { title: string; description?: string | null }) =>
    apiClient.post<CoupleTopic>(`/couple/links/${coupleId}/topics`, body).then(r => r.data),

  get: (topicId: string) =>
    apiClient.get<CoupleTopicDetail>(`/couple/topics/${topicId}`).then(r => r.data),

  savePerspective: (topicId: string, body: { open_text?: string | null; private_text?: string | null }) =>
    apiClient.put<CoupleTopicDetail>(`/couple/topics/${topicId}/perspective`, body).then(r => r.data),

  mediate: (topicId: string) =>
    apiClient.post<CoupleTopicDetail>(`/couple/topics/${topicId}/mediate`).then(r => r.data),

  setStatus: (topicId: string, status: CoupleTopic['status']) =>
    apiClient.post<CoupleTopic>(`/couple/topics/${topicId}/status`, { status }).then(r => r.data),
}
