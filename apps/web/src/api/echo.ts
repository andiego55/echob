import { apiClient } from './client'
import type { EchoChatRequest, EchoChatResponse, EchoMessage } from '@/types'

export const echoApi = {
  chat: (caseId: string, data: EchoChatRequest) =>
    apiClient.post<EchoChatResponse>(`/cases/${caseId}/echo/chat`, data).then(r => r.data),

  history: (caseId: string, threadType = 'topic', limit = 50) =>
    apiClient
      .get<EchoMessage[]>(`/cases/${caseId}/echo/history`, {
        params: { thread_type: threadType, limit },
      })
      .then(r => r.data),
}
