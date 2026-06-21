import { apiClient } from './client'
import type { EchoChatRequest, EchoChatResponse, EchoChatSession, EchoMessage } from '@/types'

export const echoApi = {
  chat: (caseId: string, data: EchoChatRequest) =>
    apiClient.post<EchoChatResponse>(`/cases/${caseId}/echo/chat`, data).then(r => r.data),

  history: (caseId: string, threadType = 'topic', sessionId?: string, limit = 50, chatSessionId?: string) =>
    apiClient
      .get<EchoMessage[]>(`/cases/${caseId}/echo/history`, {
        params: { thread_type: threadType, session_id: sessionId, limit, chat_session_id: chatSessionId },
      })
      .then(r => r.data),

  // Zugewiesenen Dialog als eigene Session mit Begrüßung öffnen (idempotent)
  startAssignmentDialog: (caseId: string, assignmentId: string) =>
    apiClient
      .post<{ chat_session_id: string }>(`/cases/${caseId}/echo/assignment-dialog`, {
        assignment_id: assignmentId,
      })
      .then(r => r.data),

  // ── Chat-Sessions (Sidebar) ──────────────────────────────────────────────
  listSessions: (caseId: string) =>
    apiClient.get<EchoChatSession[]>(`/cases/${caseId}/echo/sessions`).then(r => r.data),

  renameSession: (caseId: string, chatSessionId: string, title: string) =>
    apiClient
      .patch<EchoChatSession>(`/cases/${caseId}/echo/sessions/${chatSessionId}`, { title })
      .then(r => r.data),

  deleteSession: (caseId: string, chatSessionId: string) =>
    apiClient.delete(`/cases/${caseId}/echo/sessions/${chatSessionId}`).then(r => r.data),

  topicSummary: (caseId: string, thread_type: string) =>
    apiClient
      .post<{ summary: string }>(`/cases/${caseId}/echo/topic-summary`, { thread_type })
      .then(r => r.data),

  resetTopicHistory: (caseId: string, thread_type: string) =>
    apiClient
      .delete(`/cases/${caseId}/echo/topic-history`, { params: { thread_type } })
      .then(r => r.data),

  finalizeScene: (caseId: string, sessionId: string) =>
    apiClient
      .post<{ scene_id: string; title: string; _extraction_meta: Record<string, unknown> }>(
        `/cases/${caseId}/echo/finalize-scene`,
        { session_id: sessionId },
      )
      .then(r => r.data),
}
