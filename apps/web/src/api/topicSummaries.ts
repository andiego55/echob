import { apiClient } from './client'

export interface TopicSummary {
  id: string
  case_id: string
  topic: string
  topic_label: string
  summary_text: string
}

export const topicSummariesApi = {
  list: (caseId: string) =>
    apiClient.get<TopicSummary[]>(`/cases/${caseId}/topic-summaries`).then(r => r.data),

  save: (caseId: string, topic: string, summary_text: string) =>
    apiClient.put<TopicSummary>(`/cases/${caseId}/topic-summaries`, { topic, summary_text }).then(r => r.data),

  // Löscht einen gespeicherten Dialog vollständig (Zusammenfassung + Verlauf).
  // Der Echo-Fallkontext passt sich dadurch automatisch an.
  remove: (caseId: string, topic: string) =>
    apiClient.delete(`/cases/${caseId}/topic-summaries/${topic}`).then(r => r.data),
}
