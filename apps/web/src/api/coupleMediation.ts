import { apiClient } from './client'
import type { CouplePrivateThread } from './couplePrivate'

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

/** Ein verhandelbarer Vorschlag aus Echos Mediation. */
export interface CoupleBridge {
  id: string
  position: number
  title: string | null
  body: string
  status: 'open' | 'accepted' | 'dropped'
  /** null = noch im Original von Echo, sonst wer zuletzt geändert hat. */
  updated_by: string | null
  note: string | null
  agreement_id: string | null
  updated_at: string
  /** Älteste zuerst: Original von Echo, dann jede Gegenfassung. */
  versions: CoupleBridgeVersion[]
}

/** Eine Fassung im Verhandlungsverlauf. `changed_by: null` = Original von Echo. */
export interface CoupleBridgeVersion {
  title: string | null
  body: string
  changed_by: string | null
  created_at: string
}

export interface CoupleTopicMessage {
  id: string
  role: 'partner' | 'echo'
  user_id: string | null
  speaker: string
  content: string
  created_at: string
}

export interface CoupleTopicDetail {
  topic: CoupleTopic
  perspectives: CouplePerspective[]
  mediations: CoupleMediation[]
  both_sides_ready: boolean
  bridges: CoupleBridge[]
  messages: CoupleTopicMessage[]
}

export const coupleMediationApi = {
  list: (coupleId: string) =>
    apiClient.get<CoupleTopic[]>(`/couple/links/${coupleId}/topics`).then(r => r.data),

  create: (coupleId: string, body: { title: string; description?: string | null }) =>
    apiClient.post<CoupleTopic>(`/couple/links/${coupleId}/topics`, body).then(r => r.data),

  /** Nur solange niemand außer dir daran gearbeitet hat. */
  remove: (topicId: string) =>
    apiClient.delete(`/couple/topics/${topicId}`).then(() => true),

  get: (topicId: string) =>
    apiClient.get<CoupleTopicDetail>(`/couple/topics/${topicId}`).then(r => r.data),

  savePerspective: (topicId: string, body: { open_text?: string | null; private_text?: string | null }) =>
    apiClient.put<CoupleTopicDetail>(`/couple/topics/${topicId}/perspective`, body).then(r => r.data),

  mediate: (topicId: string) =>
    apiClient.post<CoupleTopicDetail>(`/couple/topics/${topicId}/mediate`).then(r => r.data),

  setStatus: (topicId: string, status: CoupleTopic['status']) =>
    apiClient.post<CoupleTopic>(`/couple/topics/${topicId}/status`, { status }).then(r => r.data),

  // ── Brücken verhandeln ─────────────────────────────────────────────────────

  updateBridge: (bridgeId: string, body: { title?: string | null; body?: string }) =>
    apiClient.patch<CoupleTopicDetail>(`/couple/bridges/${bridgeId}`, body).then(r => r.data),

  acceptBridge: (bridgeId: string) =>
    apiClient.post<CoupleTopicDetail>(`/couple/bridges/${bridgeId}/accept`).then(r => r.data),

  dropBridge: (bridgeId: string, note?: string | null) =>
    apiClient.post<CoupleTopicDetail>(`/couple/bridges/${bridgeId}/drop`, { note: note ?? null })
      .then(r => r.data),

  // ── Gemeinsame Diskussion am Thema ─────────────────────────────────────────

  postMessage: (topicId: string, content: string) =>
    apiClient.post<CoupleTopicDetail>(`/couple/topics/${topicId}/messages`, { content })
      .then(r => r.data),

  callEcho: (topicId: string) =>
    apiClient.post<CoupleTopicDetail>(`/couple/topics/${topicId}/messages/echo`).then(r => r.data),

  // ── Nach der Mediation ─────────────────────────────────────────────────────

  /** Dein privater Dialog über dieses Thema – die andere Person sieht ihn nie. */
  getPrivate: (topicId: string) =>
    apiClient.get<CouplePrivateThread>(`/couple/topics/${topicId}/private`).then(r => r.data),

  sendPrivate: (topicId: string, content: string) =>
    apiClient.post<CouplePrivateThread>(`/couple/topics/${topicId}/private`, { content })
      .then(r => r.data),

  /** Entwurf einer Zusammenfassung – wird nicht gespeichert und nicht geteilt. */
  summarizePrivate: (topicId: string) =>
    apiClient.post<{ text: string }>(`/couple/topics/${topicId}/private/summary`)
      .then(r => r.data.text),

  /** Hängt den Text an deine offene Sicht an – ab dann sieht die andere Person ihn. */
  share: (topicId: string, text: string) =>
    apiClient.post<CoupleTopicDetail>(`/couple/topics/${topicId}/share`, { text }).then(r => r.data),

  createSession: (topicId: string) =>
    apiClient.post<{ session_id: string; created: boolean }>(`/couple/topics/${topicId}/session`)
      .then(r => r.data),
}
