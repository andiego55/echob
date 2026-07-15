import { apiClient } from './client'
import type {
  InstituteProfile,
  GenerationInput,
  GenerationStart,
  GenerationStatus,
  ExampleDetail,
  ExampleSummary,
  InstituteStudent,
  StudentInvite,
} from '@/types'

/** Ausbildungsinstitut (eigene Domäne, /institute/*). */
export const instituteApi = {
  me: () =>
    apiClient.get<InstituteProfile>('/institute/me').then(r => r.data),
  register: (data: { name: string; contact_name?: string | null; access_code: string }) =>
    apiClient.post<InstituteProfile>('/institute/register', data).then(r => r.data),
  updateMe: (data: { name?: string; contact_name?: string | null }) =>
    apiClient.patch<InstituteProfile>('/institute/me', data).then(r => r.data),

  // Beispielfälle (KI-Generierung) — asynchron: start liefert eine generation_id,
  // Status wird gepollt (die Generierung läuft im Hintergrund weiter).
  generateExample: (input: GenerationInput) =>
    apiClient.post<GenerationStart>('/institute/examples/generate', input).then(r => r.data),
  getGeneration: (id: string) =>
    apiClient.get<GenerationStatus>(`/institute/examples/generations/${id}`).then(r => r.data),
  listExamples: () =>
    apiClient.get<ExampleSummary[]>('/institute/examples').then(r => r.data),
  getExample: (id: string) =>
    apiClient.get<ExampleDetail>(`/institute/examples/${id}`).then(r => r.data),
  patchExample: (id: string, data: { title?: string; status?: string }) =>
    apiClient.patch<ExampleDetail>(`/institute/examples/${id}`, data).then(r => r.data),
  deleteExample: (id: string) =>
    apiClient.delete(`/institute/examples/${id}`).then(r => r.data),

  // Studierende (Einladungen + Verwaltung)
  listStudents: () =>
    apiClient.get<{ quota: number; students: InstituteStudent[]; invites: StudentInvite[] }>('/institute/students').then(r => r.data),
  inviteStudent: (label?: string | null) =>
    apiClient.post<StudentInvite>('/institute/students/invite', { label }).then(r => r.data),
  removeStudent: (id: string) =>
    apiClient.delete(`/institute/students/${id}`).then(r => r.data),
  revokeStudentInvite: (id: string) =>
    apiClient.delete(`/institute/student-invites/${id}`).then(r => r.data),

  // Freigabe eines Beispiels an Studierende (Klon je Student)
  assignExample: (id: string, studentIds: string[]) =>
    apiClient.post<{ assigned: string[] }>(`/institute/examples/${id}/assign`, { student_ids: studentIds }).then(r => r.data),
  exampleAssignments: (id: string) =>
    apiClient.get<{ student_ids: string[] }>(`/institute/examples/${id}/assignments`).then(r => r.data),
}
