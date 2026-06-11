import { apiClient } from './client'
import type { SubscriptionStatus } from '@/types'

export const subscriptionApi = {
  getStatus: () =>
    apiClient.get<SubscriptionStatus>('/subscription/status').then(r => r.data),
}
