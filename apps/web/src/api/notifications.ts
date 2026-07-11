import { apiClient } from './client'

/** Nutzerseitige In-App-Benachrichtigungen. */
export interface ClientNotification {
  id: string
  kind: string
  body: string
  created_at: string
}

export const notificationsApi = {
  list: () =>
    apiClient.get<ClientNotification[]>('/notifications').then(r => r.data),
  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`).then(r => r.data),
}
