import { apiClient } from './client'
import type { UserProfile, ProfileModuleUpdate, EchoChatRequest, EchoChatResponse, EchoMessage } from '@/types'

export interface EchoSettings {
  echo_mode: string
  echo_tone: number | null
  echo_depth: number | null
  echo_custom_steering: string | null
}

export const profileApi = {
  getEchoSettings: () =>
    apiClient.get<EchoSettings>('/profile/echo-settings').then(r => r.data),
  saveEchoSettings: (data: EchoSettings) =>
    apiClient.put<EchoSettings>('/profile/echo-settings', data).then(r => r.data),

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

  saveDisplayName: (display_name: string) =>
    apiClient.put<UserProfile>('/profile/display-name', { display_name }).then(r => r.data),
}
