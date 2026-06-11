import { apiClient } from './client'
import type { ProductType, SubscriptionStatus } from '@/types'

export const subscriptionApi = {
  getStatus: () =>
    apiClient.get<SubscriptionStatus>('/subscription/status').then(r => r.data),

  /** Startet einen Stripe-Checkout und liefert die Redirect-URL. */
  createCheckout: (product: ProductType) =>
    apiClient.post<{ url: string }>('/subscription/checkout', { product }).then(r => r.data),

  /** Öffnet das Stripe Billing-Portal (Abo verwalten / kündigen). */
  createPortal: () =>
    apiClient.post<{ url: string }>('/subscription/portal').then(r => r.data),
}
