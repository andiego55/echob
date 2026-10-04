import { apiClient } from './client'
import type { AiUsageStatus, ProductType, SubscriptionStatus } from '@/types'
import { KAUF_EINWILLIGUNG_TEXT, RECHTSSTAND } from '@/lib/rechtsstand'

export const subscriptionApi = {
  getStatus: () =>
    apiClient.get<SubscriptionStatus>('/subscription/status').then(r => r.data),

  /** Monatliche KI-Kontingente (Berichte, Skalen, Fall-FAQ) für Counter + Einstellungen. */
  getUsage: () =>
    apiClient.get<AiUsageStatus>('/subscription/usage').then(r => r.data),

  /** Startet einen Stripe-Checkout und liefert die Redirect-URL. */
  /**
   * Kauf starten — mit dem Nachweis der Einwilligung.
   *
   * Die Fassungen kommen aus `lib/rechtsstand.ts`: Es muss nachvollziehbar bleiben,
   * WELCHE AGB und WELCHE Widerrufsbelehrung neben dem Haekchen verlinkt waren.
   */
  createCheckout: (product: ProductType) =>
    apiClient.post<{ url: string }>('/subscription/checkout', {
      product,
      einwilligung: {
        text: KAUF_EINWILLIGUNG_TEXT,
        agb_fassung: RECHTSSTAND.agb.fassung,
        widerruf_fassung: RECHTSSTAND.widerruf.fassung,
        datenschutz_fassung: RECHTSSTAND.datenschutz.fassung,
      },
    }).then(r => r.data),

  /** Sofort-Freischaltung nach dem Stripe-Redirect (Webhook-unabhängig). */
  verifyCheckout: (sessionId: string) =>
    apiClient
      .post<{ activated: boolean; plan: string | null }>('/subscription/checkout/verify', { session_id: sessionId })
      .then(r => r.data),

  /** Öffnet das Stripe Billing-Portal (Abo verwalten / kündigen). */
  createPortal: () =>
    apiClient.post<{ url: string }>('/subscription/portal').then(r => r.data),
}
