import { apiClient } from './client'
import type { Scene, SceneCreate, SceneDraft } from '@/types'

export const scenesApi = {
  list: (caseId: string) =>
    apiClient.get<{ scenes: Scene[]; total: number }>(`/cases/${caseId}/scenes`).then(r => r.data),

  /** Schnellerfassung: Sprache (Whisper) oder Text → strukturierter Entwurf (speichert nichts). */
  quickCapture: (caseId: string, data: { text?: string; audio?: Blob }) => {
    const fd = new FormData()
    if (data.text) fd.append('text', data.text)
    if (data.audio) fd.append('audio', data.audio, 'aufnahme.webm')
    return apiClient
      .post<{ transcript: string; draft: SceneDraft }>(`/cases/${caseId}/scenes/quick-capture`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      })
      .then(r => r.data)
  },

  get: (caseId: string, sceneId: string) =>
    apiClient.get<Scene>(`/cases/${caseId}/scenes/${sceneId}`).then(r => r.data),

  create: (caseId: string, data: SceneCreate) =>
    apiClient.post<Scene>(`/cases/${caseId}/scenes`, data).then(r => r.data),

  update: (caseId: string, sceneId: string, data: Partial<SceneCreate>) =>
    apiClient.patch<Scene>(`/cases/${caseId}/scenes/${sceneId}`, data).then(r => r.data),

  confirm: (caseId: string, sceneId: string, data: {
    pattern_tags: string[]
    distress_score?: number
    safety_level?: string
  }) =>
    apiClient.post<Scene>(`/cases/${caseId}/scenes/${sceneId}/confirm`, data).then(r => r.data),

  delete: (caseId: string, sceneId: string) =>
    apiClient.delete(`/cases/${caseId}/scenes/${sceneId}`),
}
