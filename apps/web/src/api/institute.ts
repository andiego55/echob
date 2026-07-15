import { apiClient } from './client'
import type { InstituteProfile } from '@/types'

/** Ausbildungsinstitut (eigene Domäne, /institute/*). */
export const instituteApi = {
  me: () =>
    apiClient.get<InstituteProfile>('/institute/me').then(r => r.data),
  register: (data: { name: string; contact_name?: string | null; access_code: string }) =>
    apiClient.post<InstituteProfile>('/institute/register', data).then(r => r.data),
  updateMe: (data: { name?: string; contact_name?: string | null }) =>
    apiClient.patch<InstituteProfile>('/institute/me', data).then(r => r.data),
}
