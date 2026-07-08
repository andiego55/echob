import { useQuery } from '@tanstack/react-query'
import { subscriptionApi } from '@/api/subscription'
import type { AiUsageQuota } from '@/types'

/**
 * Einstellungen-Karte: KI-Kontingente des laufenden Monats (Berichte, Skalen).
 * Reiner Zähler/Überblick — die eigentliche Sperre setzt das Backend durch.
 */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function UsageCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: subscriptionApi.getUsage,
  })

  return (
    <div className="mt-6 card">
      <h2 className="text-lg font-semibold text-navy">Kontingente diesen Monat</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Berichte und Skalen-Analysen sind pro Monat begrenzt. Dein Verbrauch setzt sich
        automatisch zum Monatsbeginn zurück.
      </p>

      {isLoading || !data ? (
        <p className="mt-3 text-sm text-brand-muted">Wird geladen …</p>
      ) : (
        <>
          <div className="mt-5 space-y-5">
            {data.quotas.map(q => <QuotaRow key={q.kind} q={q} />)}
          </div>
          <p className="mt-4 text-xs text-brand-muted">
            Setzt sich am {fmtDate(data.period_resets_at)} zurück.
          </p>
        </>
      )}
    </div>
  )
}

function QuotaRow({ q }: { q: AiUsageQuota }) {
  if (q.unlimited || q.limit === null) {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-navy">{q.label}</span>
        <span className="text-sm text-brand-muted">{q.used} genutzt · unbegrenzt</span>
      </div>
    )
  }

  const remaining = q.remaining ?? 0
  const pct = q.limit > 0 ? Math.min(100, Math.round((q.used / q.limit) * 100)) : 0
  const low = remaining <= 3
  const empty = remaining <= 0
  const barColor = empty ? 'bg-red-500' : low ? 'bg-amber-400' : 'bg-accent'
  const hintColor = empty ? 'text-red-600' : low ? 'text-amber-700' : 'text-brand-muted'

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-navy">{q.label}</span>
        <span className="text-sm text-brand-muted">{q.used} von {q.limit} genutzt</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-border">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1.5 text-xs font-medium ${hintColor}`}>
        {empty ? 'Kontingent aufgebraucht' : `Noch ${remaining} übrig`}
      </p>
    </div>
  )
}
