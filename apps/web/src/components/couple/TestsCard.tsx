/**
 * Tests, die beide ausfüllen und vergleichen.
 *
 * Zugelassen ist nur, was zu zweit vertretbar ist (siehe selftests/couple.ts) –
 * Tests, in denen eine Person die andere einschätzt, gehören in den privaten Bereich.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coupleTestsApi } from '@/api/coupleTests'
import { SELF_TESTS } from '@/selftests'
import { isCoupleSafe } from '@/selftests/couple'

// ── Tests zu zweit ────────────────────────────────────────────────────────────

export default function TestsCard({ coupleId }: { coupleId: string }) {
  const { data: started = [] } = useQuery({
    queryKey: ['couple-tests', coupleId],
    queryFn: () => coupleTestsApi.list(coupleId),
    enabled: !!coupleId,
  })

  const suitable = SELF_TESTS.filter(isCoupleSafe)
  const startedSlugs = new Set(started.map(s => s.slug))
  const offer = [
    ...suitable.filter(t => startedSlugs.has(t.slug)),
    ...suitable.filter(t => !startedSlugs.has(t.slug)).slice(0, 6),
  ]

  return (
    <div className="card">
      <h2 className="card-title">Tests zu zweit</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Beide füllen denselben Test aus, danach legt ihr die Ergebnisse nebeneinander. Das
        Ergebnis der anderen Person siehst du erst, wenn du selbst geantwortet hast.
      </p>

      {offer.length === 0 && (
        <div className="mt-4 rounded-brand border border-dashed border-brand-border px-4 py-5">
          <p className="text-sm font-semibold text-navy">Gerade keine passenden Tests</p>
          <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
            Im Paarraum gibt es nur Tests, die zu zweit vertretbar sind. Tests, in denen eine
            Person die andere einschätzt, bleiben bewusst in deinem privaten Bereich.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {offer.map(t => {
          const state = started.find(s => s.slug === t.slug)
          const label = !state ? 'Neu'
            : state.done >= 2 ? 'Beide fertig'
            : state.mine ? 'Du bist fertig' : 'Partner:in ist fertig'
          return (
            <Link
              key={t.slug}
              to={`/app/paar/${coupleId}/test/${t.slug}`}
              className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-3 no-underline transition hover:border-accent/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{t.title}</p>
                <p className="mt-0.5 truncate text-xs text-brand-muted">{t.teaser}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${
                state?.done && state.done >= 2 ? 'bg-green-50 text-green-700' : 'bg-brand-bg text-brand-muted'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
