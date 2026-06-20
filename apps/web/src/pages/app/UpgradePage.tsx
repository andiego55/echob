/**
 * /app/upgrade — Pricing & Subscription
 * Kauf läuft über Stripe Checkout; Abos werden über das Stripe-Portal verwaltet.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { subscriptionApi } from '@/api/subscription'
import type { ProductType } from '@/types'

const PLAN_LABELS: Record<string, string> = {
  trial: 'Testzugang',
  startpaket: 'Startpaket',
  early_bird: 'Early Bird Abo',
  regular: 'Monatsabo',
  annual: 'Jahresabo',
}

const STARTER_PACKAGE = {
  id: 'startpaket' as ProductType,
  name: 'Startpaket',
  badge: 'Empfohlen zum Einstieg',
  price: '99',
  period: 'einmalig',
  desc: 'Der ideale Einstieg: voller App-Zugang für einen Monat — plus eine persönliche Coaching-Stunde, in der wir gemeinsam deine Situation reflektieren und die App in deinen Prozess integrieren.',
  features: [
    '1 Monat App-Vollzugang',
    'Alle 5 Berichtstypen (Muster, Therapie, Coaching, Verlauf, Kurz)',
    'Alle Dialog- & Analyseformen',
    'Unbegrenzte Fälle & Szenen',
    'GPT-4o – bestes verfügbares KI-Modell',
    'Echo auf voller Analysestufe: alle Perspektiven & Tiefen aktiv',
    '1 persönliche Coaching-Stunde mit dem EchoB-Gründer (60 min)',
    'Terminvereinbarung direkt nach dem Kauf',
  ],
}

const PLANS = [
  {
    id: 'early_bird' as ProductType,
    name: 'Early Bird',
    badge: 'Bis November',
    price: '12,99',
    period: 'Monat',
    desc: 'Vollzugang zu allen Features. Günstigster Einstiegspreis – nur für kurze Zeit.',
    features: [
      'Unbegrenzte Fälle',
      'Unbegrenzte Szenen',
      'Alle Themendialoge',
      'Berichte & Skalenwerte',
      'Blog-Dialoge',
      'Datensicherung & Export',
    ],
    featured: true,
  },
  {
    id: 'regular' as ProductType,
    name: 'Monatsabo',
    badge: null,
    price: '24,99',
    period: 'Monat',
    desc: 'Vollzugang ohne Laufzeitbindung. Monatlich kündbar.',
    features: [
      'Unbegrenzte Fälle',
      'Unbegrenzte Szenen',
      'Alle Themendialoge',
      'Berichte & Skalenwerte',
      'Blog-Dialoge',
      'Datensicherung & Export',
    ],
    featured: false,
  },
  {
    id: 'annual' as ProductType,
    name: 'Jahresabo',
    badge: 'Spare 33 %',
    price: '199',
    period: 'Jahr',
    desc: 'Ein Jahr Vollzugang zum Vorzugspreis. Entspricht 16,58 €/Monat.',
    features: [
      'Unbegrenzte Fälle',
      'Unbegrenzte Szenen',
      'Alle Themendialoge',
      'Berichte & Skalenwerte',
      'Blog-Dialoge',
      'Datensicherung & Export',
      'Priorität bei neuen Features',
    ],
    featured: false,
  },
]

export default function UpgradePage() {
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const checkoutStatus = searchParams.get('status') // 'success' | 'cancelled' | null
  const checkoutSessionId = searchParams.get('session_id')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [pendingProduct, setPendingProduct] = useState<ProductType | null>(null)
  const [consent, setConsent] = useState(false)
  const verifiedRef = useRef(false)

  const { data: subscription } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: subscriptionApi.getStatus,
    // Fallback-Polling, falls die Sofort-Verifikation fehlschlägt (dann greift der Webhook)
    refetchInterval: checkoutStatus === 'success' ? 4000 : false,
  })

  // Sofort-Freischaltung: Session nach dem Stripe-Redirect direkt verifizieren
  const verifyMutation = useMutation({
    mutationFn: (sessionId: string) => subscriptionApi.verifyCheckout(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription-status'] }),
  })

  useEffect(() => {
    if (checkoutStatus === 'success' && checkoutSessionId && !verifiedRef.current) {
      verifiedRef.current = true
      verifyMutation.mutate(checkoutSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStatus, checkoutSessionId])

  const checkoutMutation = useMutation({
    mutationFn: (product: ProductType) => subscriptionApi.createCheckout(product),
    onMutate: (product) => { setPendingProduct(product); setCheckoutError(null) },
    onSuccess: (data) => { window.location.href = data.url },
    onError: (error: any) => {
      setPendingProduct(null)
      const detail = error?.response?.data?.detail
      setCheckoutError(
        typeof detail === 'string'
          ? detail
          : 'Der Checkout konnte nicht gestartet werden. Bitte versuche es erneut oder kontaktiere uns.',
      )
    },
  })

  const portalMutation = useMutation({
    mutationFn: subscriptionApi.createPortal,
    onSuccess: (data) => { window.location.href = data.url },
  })

  const buy = (product: ProductType) => {
    if (checkoutMutation.isPending) return
    if (!consent) {
      setCheckoutError('Bitte bestätige zuerst die AGB, die Widerrufsbelehrung und den sofortigen Leistungsbeginn (Häkchen).')
      return
    }
    checkoutMutation.mutate(product)
  }

  const isPaid = subscription && subscription.plan !== 'trial'
  const paidActive = isPaid && subscription.is_active

  return (
    <AppShell>
      <div className="mx-auto max-w-[1000px] px-6 py-10">

        <div className="mb-8">
          <Link to="/app" className="text-sm text-brand-muted hover:text-navy">← Zurück</Link>
          <h1 className="mt-4 text-2xl font-bold text-navy">Pläne & Angebote</h1>
          <p className="mt-1 text-sm text-brand-muted max-w-xl">
            Sichere Zahlung über Stripe – Kreditkarte, SEPA, PayPal & mehr. Sofortige Freischaltung.
            Alle Preise inkl. gesetzlicher MwSt.
          </p>
        </div>

        {/* Checkout-Ergebnis */}
        {checkoutStatus === 'success' && (
          <div className="mb-8 rounded-brand border border-green-200 bg-green-50 px-5 py-4 max-w-2xl">
            <p className="text-sm font-semibold text-green-800 mb-1">
              {paidActive ? '✓ Zahlung erfolgreich – dein Zugang ist freigeschaltet!' : '✓ Zahlung erfolgreich!'}
            </p>
            <p className="text-xs text-green-700">
              {paidActive
                ? `Dein Plan: ${PLAN_LABELS[subscription.plan]}. Viel Erfolg bei deiner Reflexionsarbeit!`
                : 'Dein Zugang wird in wenigen Sekunden freigeschaltet – diese Seite aktualisiert sich automatisch.'}
              {searchParams.get('product') === 'startpaket' &&
                ' Wir melden uns innerhalb von 24 Stunden per E-Mail zur Terminvereinbarung deiner Coaching-Stunde.'}
            </p>
          </div>
        )}
        {checkoutStatus === 'cancelled' && (
          <div className="mb-8 rounded-brand border border-brand-border bg-white px-5 py-4 max-w-2xl">
            <p className="text-sm text-brand-muted">
              Der Kauf wurde abgebrochen. Du kannst jederzeit erneut buchen – bei Fragen{' '}
              <a href="mailto:info@echo-b.de" className="text-accent font-medium">schreib uns</a>.
            </p>
          </div>
        )}
        {checkoutError && (
          <div className="mb-8 rounded-brand border border-red-200 bg-red-50 px-5 py-4 max-w-2xl">
            <p className="text-sm text-red-700">
              {checkoutError}{' '}
              <a href="mailto:info@echo-b.de?subject=EchoB%20Buchung" className="font-medium underline">
                Per E-Mail bestellen
              </a>
            </p>
          </div>
        )}

        {/* Aktueller Plan (bezahlte Nutzer) */}
        {paidActive && (
          <div className="mb-8 rounded-brand border border-green-200 bg-green-50/60 px-5 py-4 max-w-2xl flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-navy">
                Dein aktueller Plan: {PLAN_LABELS[subscription.plan]}
              </p>
              {subscription.subscription_ends_at && (
                <p className="text-xs text-brand-muted mt-0.5">
                  {subscription.plan === 'startpaket' ? 'Zugang bis' : 'Nächste Verlängerung'}:{' '}
                  {new Date(subscription.subscription_ends_at).toLocaleDateString('de-DE', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              )}
            </div>
            {subscription.plan !== 'startpaket' && (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
              >
                {portalMutation.isPending ? 'Wird geöffnet …' : 'Abo verwalten →'}
              </button>
            )}
          </div>
        )}

        {/* Trial info box */}
        {!paidActive && (
          <div className="mb-8 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 max-w-xl">
            <p className="text-sm font-semibold text-amber-800 mb-1">Kostenlose Testphase</p>
            <p className="text-xs text-amber-700">
              Mit dem Testzugang kannst du EchoB 3 Tage lang erkunden — mit 1 Fall, bis zu 5 Szenen
              und Zugang zu Kurzbericht & Coaching-Vorbereitung.
              Alle weiteren Berichte und Features sind ab dem Startpaket verfügbar.
            </p>
          </div>
        )}

        {/* Pflicht-Einwilligung vor dem Kauf (Widerruf + AGB) */}
        <label className="mb-6 flex items-start gap-3 rounded-brand border border-brand-border bg-white px-5 py-4 max-w-2xl cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => { setConsent(e.target.checked); setCheckoutError(null) }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
          />
          <span className="text-xs text-brand-muted leading-relaxed">
            Ich akzeptiere die <Link to="/agb" className="text-accent hover:underline">AGB</Link> und die{' '}
            <Link to="/widerruf" className="text-accent hover:underline">Widerrufsbelehrung</Link>. Mir ist
            bekannt, dass die Leistung mit dem Kauf sofort beginnt und mein Widerrufsrecht bei vollständiger
            Erfüllung erlischt. Es gilt die{' '}
            <Link to="/datenschutz" className="text-accent hover:underline">Datenschutzerklärung</Link>.
          </span>
        </label>

        {/* Startpaket */}
        <div className="mb-8 rounded-brand border-2 border-accent bg-accent/5 p-6 max-w-2xl shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <span className="text-base font-bold text-navy">{STARTER_PACKAGE.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white">
              {STARTER_PACKAGE.badge}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-3xl font-extrabold text-navy">{STARTER_PACKAGE.price} €</span>
            <span className="text-xs text-brand-muted ml-1">/ {STARTER_PACKAGE.period} · inkl. MwSt.</span>
          </div>
          <p className="text-sm text-brand-muted mb-5 leading-relaxed max-w-lg">{STARTER_PACKAGE.desc}</p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 mb-6">
            {STARTER_PACKAGE.features.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-navy">
                <span className="text-accent mt-0.5 shrink-0">✓</span>
                {f}
              </div>
            ))}
          </div>
          <button
            onClick={() => buy(STARTER_PACKAGE.id)}
            disabled={checkoutMutation.isPending}
            className="inline-block text-sm font-semibold px-6 py-2.5 rounded-brand bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {pendingProduct === STARTER_PACKAGE.id ? 'Checkout wird geöffnet …' : 'Zahlungspflichtig bestellen'}
          </button>
        </div>

        <h2 className="text-sm font-semibold text-navy mb-4">Oder: App-Abo ohne Coaching</h2>

        {/* Pricing grid */}
        <div className="grid gap-5 sm:grid-cols-3 mb-10">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-brand border p-6 flex flex-col ${
                plan.featured
                  ? 'border-accent bg-accent/5 shadow-md'
                  : 'border-brand-border bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-bold text-navy">{plan.name}</span>
                {plan.badge && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    plan.featured ? 'bg-accent text-white' : 'bg-navy/10 text-navy'
                  }`}>
                    {plan.badge}
                  </span>
                )}
              </div>
              <div className="mb-3">
                <span className="text-3xl font-extrabold text-navy">{plan.price} €</span>
                <span className="text-xs text-brand-muted ml-1">/ {plan.period} · inkl. MwSt.</span>
              </div>
              <p className="text-xs text-brand-muted mb-5 leading-relaxed">{plan.desc}</p>
              <ul className="space-y-1.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-navy">
                    <span className="text-accent mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => buy(plan.id)}
                disabled={checkoutMutation.isPending || subscription?.plan === plan.id}
                className={`block w-full text-center text-sm font-semibold py-2.5 rounded-brand transition-colors disabled:opacity-60 ${
                  plan.featured
                    ? 'bg-accent text-white hover:bg-accent/90'
                    : 'bg-navy text-white hover:bg-navy/90'
                }`}
              >
                {subscription?.plan === plan.id && subscription.is_active
                  ? '✓ Dein aktueller Plan'
                  : pendingProduct === plan.id
                    ? 'Checkout wird geöffnet …'
                    : 'Zahlungspflichtig abonnieren'}
              </button>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="rounded-brand border border-brand-border bg-white px-6 py-5 max-w-xl">
          <p className="text-sm font-semibold text-navy mb-2">So läuft die Buchung</p>
          <ol className="space-y-1.5 text-xs text-brand-muted list-decimal list-inside">
            <li>Klicke auf „Kaufen" bzw. „Abonnieren" — du wirst zur sicheren Stripe-Zahlungsseite weitergeleitet.</li>
            <li>Bezahle per Kreditkarte, SEPA-Lastschrift oder anderen Methoden.</li>
            <li>Dein Zugang wird automatisch und sofort freigeschaltet.</li>
          </ol>
          <p className="mt-3 text-xs text-brand-muted">
            Abos sind jederzeit über „Abo verwalten" kündbar.
          </p>
          <div className="mt-4 text-xs text-brand-muted">
            Fragen? <a href="tel:+4917359089060" className="text-accent font-medium">0173 5908906</a>
            {' · '}
            <a href="mailto:info@echo-b.de" className="text-accent font-medium">info@echo-b.de</a>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
