import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { subscriptionApi } from '@/api/subscription'

/**
 * Einstellungen-Karte: Abo & Abrechnung. Zeigt den aktuellen Plan/Status und
 * führt zum Stripe-Portal (Abo verwalten/kündigen, Zahlungsmethode aktualisieren,
 * Rechnungen). Fängt den Fall „Abo nicht aktiv" (z. B. Zahlung offen) ab.
 */
const PLAN_LABELS: Record<string, string> = {
  trial: 'Kostenloser Testzugang',
  early_bird: 'Early Bird Abo',
  regular: 'Monatsabo',
  annual: 'Jahresabo',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function SubscriptionCard() {
  const [portalError, setPortalError] = useState<string | null>(null)
  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: subscriptionApi.getStatus,
  })

  const portal = useMutation({
    mutationFn: subscriptionApi.createPortal,
    onMutate: () => setPortalError(null),
    onSuccess: (data) => { window.location.href = data.url },
    onError: (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 400) {
        setPortalError('Für dein Konto liegt kein Zahlungskonto vor – es gibt kein Abo zu verwalten.')
      } else {
        setPortalError('Das Abrechnungsportal konnte nicht geöffnet werden. Bitte später erneut versuchen.')
      }
    },
  })

  const isPaidPlan = !!sub && sub.plan !== 'trial'
  const label = sub ? (PLAN_LABELS[sub.plan] ?? sub.plan) : ''

  return (
    <div className="mt-6 card">
      <h2 className="text-lg font-semibold text-navy">Abo &amp; Abrechnung</h2>

      {isLoading || !sub ? (
        <p className="mt-2 text-sm text-brand-muted">Wird geladen …</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-navy">{label}</span>
            {isPaidPlan ? (
              sub.is_active ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">aktiv</span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">nicht aktiv</span>
              )
            ) : sub.is_trial_active ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                noch {sub.trial_days_left} {sub.trial_days_left === 1 ? 'Tag' : 'Tage'}
              </span>
            ) : (
              <span className="rounded-full bg-brand-bg px-2 py-0.5 text-xs font-semibold text-brand-muted">abgelaufen</span>
            )}
          </div>

          {isPaidPlan && sub.subscription_ends_at && (
            <p className="mt-1 text-xs text-brand-muted">
              {sub.is_active ? 'Nächste Verlängerung' : 'Zugang war bis'}: {fmtDate(sub.subscription_ends_at)}
            </p>
          )}

          {isPaidPlan && !sub.is_active && (
            <p className="mt-2 rounded-brand border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Dein Abo ist aktuell nicht aktiv – möglicherweise ist eine Zahlung offen oder es wurde
              gekündigt. Im Abrechnungsportal kannst du die Zahlungsmethode aktualisieren oder das
              Abo endgültig beenden.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {isPaidPlan ? (
              <button
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="rounded-brand bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {portal.isPending ? 'Wird geöffnet …' : 'Abo verwalten / kündigen'}
              </button>
            ) : (
              <Link
                to="/app/upgrade"
                className="rounded-brand bg-accent px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-accent/90"
              >
                Tarife ansehen
              </Link>
            )}
            <Link to="/app/upgrade" className="text-sm text-accent hover:underline">
              Pläne &amp; Preise
            </Link>
          </div>

          {portalError && <p className="mt-2 text-sm text-red-600">{portalError}</p>}
          <p className="mt-3 text-xs text-brand-muted">
            Kündigungen werden zum Ende des laufenden Abrechnungszeitraums wirksam. Die Abwicklung
            läuft sicher über unseren Zahlungsdienstleister Stripe.
          </p>
        </>
      )}
    </div>
  )
}
