import { apiClient } from './client'
import type {
  InstituteProfile,
  GenerationInput,
  ExampleDetail,
  ExampleSummary,
} from '@/types'

/** Ausbildungsinstitut (eigene Domäne, /institute/*). */
export const instituteApi = {
  me: () =>
    apiClient.get<InstituteProfile>('/institute/me').then(r => r.data),
  register: (data: { name: string; contact_name?: string | null; access_code: string }) =>
    apiClient.post<InstituteProfile>('/institute/register', data).then(r => r.data),
  updateMe: (data: { name?: string; contact_name?: string | null }) =>
    apiClient.patch<InstituteProfile>('/institute/me', data).then(r => r.data),

  // Beispielfälle (KI-Generierung) — generate läuft lange (mehrere LLM-Aufrufe)
  generateExample: (input: GenerationInput) =>
    apiClient.post<ExampleDetail>('/institute/examples/generate', input, { timeout: 300_000 }).then(r => r.data),
  listExamples: () =>
    apiClient.get<ExampleSummary[]>('/institute/examples').then(r => r.data),
  getExample: (id: string) =>
    apiClient.get<ExampleDetail>(`/institute/examples/${id}`).then(r => r.data),
  patchExample: (id: string, data: { title?: string; status?: string }) =>
    apiClient.patch<ExampleDetail>(`/institute/examples/${id}`, data).then(r => r.data),
  deleteExample: (id: string) =>
    apiClient.delete(`/institute/examples/${id}`).then(r => r.data),
}
