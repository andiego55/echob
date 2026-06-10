import { apiClient } from './client'
import type { UserProfile, ProfileModuleUpdate, EchoChatRequest, EchoChatResponse, EchoMessage } from '@/types'

export const profileApi = {
  get: () =>
    apiClient.get<UserProfile>('/profile').then(r => r.data),

  save: (data: { modules: Record<string, unknown>; summary: Record<string, unknown>; safety_status: string; completed_modules: string[] }) =>
    apiClient.put<UserProfile>('/profile', data).then(r => r.data),

  saveModule: (module_id: string, data: Record<string, unknown>) =>
    apiClient.put<UserProfile>('/profile/module', { module_id, data } satisfies ProfileModuleUpdate).then(r => r.data),

  echoChat: (data: EchoChatRequest & { session_id: string }) =>
    apiClient.post<EchoChatResponse>('/profile/echo/chat', data).then(r => r.data),

  echoHistory: (session_id: string) =>
    apiClient.get<EchoMessage[]>('/profile/echo/history', { params: { session_id } }).then(r => r.data),

  saveSummaryText: (summary_text: string) =>
    apiClient.put<UserProfile>('/profile/summary-text', { summary_text }).then(r => r.data),
}
