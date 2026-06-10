import { apiClient } from './client'
import type { Scene, SceneCreate } from '@/types'

export const scenesApi = {
  list: (caseId: string) =>
    apiClient.get<{ scenes: Scene[]; total: number }>(`/cases/${caseId}/scenes`).then(r => r.data),

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
