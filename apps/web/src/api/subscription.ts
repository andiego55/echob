import { apiClient } from './client'
import type { AiUsageStatus, ProductType, SubscriptionStatus } from '@/types'

export const subscriptionApi = {
  getStatus: () =>
    apiClient.get<SubscriptionStatus>('/subscription/status').then(r => r.data),

  /** Monatliche KI-Kontingente (Berichte, Skalen) für Counter + Einstellungen. */
  getUsage: () =>
    apiClient.get<AiUsageStatus>('/subscription/usage').then(r => r.data),

  /** Startet einen Stripe-Checkout und liefert die Redirect-URL. */
  createCheckout: (product: ProductType) =>
    apiClient.post<{ url: string }>('/subscription/checkout', { product }).then(r => r.data),

  /** Sofort-Freischaltung nach dem Stripe-Redirect (Webhook-unabhängig). */
  verifyCheckout: (sessionId: string) =>
    apiClient
      .post<{ activated: boolean; plan: string | null }>('/subscription/checkout/verify', { session_id: sessionId })
      .then(r => r.data),

  /** Öffnet das Stripe Billing-Portal (Abo verwalten / kündigen). */
  createPortal: () =>
    apiClient.post<{ url: string }>('/subscription/portal').then(r => r.data),
}
