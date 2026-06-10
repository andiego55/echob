import { apiClient } from './client'
import type { EchoChatRequest, EchoChatResponse, EchoMessage } from '@/types'

export const echoApi = {
  chat: (caseId: string, data: EchoChatRequest) =>
    apiClient.post<EchoChatResponse>(`/cases/${caseId}/echo/chat`, data).then(r => r.data),

  history: (caseId: string, threadType = 'topic', sessionId?: string, limit = 50) =>
    apiClient
      .get<EchoMessage[]>(`/cases/${caseId}/echo/history`, {
        params: { thread_type: threadType, session_id: sessionId, limit },
      })
      .then(r => r.data),

  finalizeScene: (caseId: string, sessionId: string) =>
    apiClient
      .post<{ scene_id: string; title: string; _extraction_meta: Record<string, unknown> }>(
        `/cases/${caseId}/echo/finalize-scene`,
        { session_id: sessionId },
      )
      .then(r => r.data),
}
