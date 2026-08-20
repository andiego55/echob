import { apiClient } from './client'
import type { CouplePrivateMessage } from './couplePrivate'

/**
 * Paar-Begleiter: Gespräche mit Verlauf und Zusammenfassungen.
 *
 * Dasselbe Vorgehen wie bei den Themendialogen im Fall-Bereich – reden, zusammenfassen
 * lassen, behalten. Alles hier gehört ausschließlich dir; die Partnerperson hat keinen
 * Endpunkt, über den sie es sehen könnte.
 */
/**
 * Art eines Fadens. Sie entscheidet ueber den Ton, in dem Echo antwortet, und haelt die
 * Faeden auseinander – ein Streit-Einstieg landet nie mitten in einem offenen Gespraech.
 */
export type CoupleThreadKind = 'chat' | 'deescalation'

export interface CoupleEchoThread {
  id: string
  title: string | null
  kind: CoupleThreadKind
  created_at: string
  updated_at: string
  closed_at: string | null
  message_count: number
  summary_count: number
}

export interface CoupleEchoConversation {
  thread: CoupleEchoThread
  messages: CouplePrivateMessage[]
}

export interface CoupleEchoSummary {
  id: string
  thread_id: string | null
  title: string | null
  summary_text: string
  created_at: string
  updated_at: string
}

export const coupleCompanionApi = {
  /** Das laufende Gespräch. */
  current: (coupleId: string, kind: CoupleThreadKind = 'chat') =>
    apiClient.get<CoupleEchoConversation>(`/couple/links/${coupleId}/echo`, { params: { kind } })
      .then(r => r.data),

  send: (coupleId: string, content: string, kind: CoupleThreadKind = 'chat') =>
    apiClient.post<CoupleEchoConversation>(`/couple/links/${coupleId}/echo`, { content },
      { params: { kind } }).then(r => r.data),

  /** Fasst zusammen, schließt das Gespräch ab und behält die Zusammenfassung. */
  summarize: (coupleId: string, kind: CoupleThreadKind = 'chat') =>
    apiClient.post<CoupleEchoSummary>(`/couple/links/${coupleId}/echo/summary`, null,
      { params: { kind } }).then(r => r.data),

  threads: (coupleId: string) =>
    apiClient.get<CoupleEchoThread[]>(`/couple/links/${coupleId}/echo/threads`).then(r => r.data),

  thread: (threadId: string) =>
    apiClient.get<CoupleEchoConversation>(`/couple/echo/threads/${threadId}`).then(r => r.data),

  summaries: (coupleId: string) =>
    apiClient.get<CoupleEchoSummary[]>(`/couple/links/${coupleId}/echo/summaries`).then(r => r.data),

  editSummary: (summaryId: string, body: { title?: string | null; summary_text?: string }) =>
    apiClient.patch<CoupleEchoSummary>(`/couple/echo/summaries/${summaryId}`, body).then(r => r.data),

  deleteSummary: (summaryId: string) =>
    apiClient.delete(`/couple/echo/summaries/${summaryId}`),
}
