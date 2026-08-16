/**
 * Fortschritt des Paarraums: Punkte, Stufe, Serie und Meilensteine.
 *
 * Bewusst kooperativ. Beide Beiträge stehen nebeneinander, aber es gibt keinen Platz eins,
 * keine Prozent-vom-Partner-Anzeige und keine Bewertung, wer mehr tut. Die meisten Punkte
 * gibt es fürs Einhalten einer Abmachung – nicht fürs Vielklicken.
 */
import { useQuery } from '@tanstack/react-query'
import { coupleApi } from '@/api/couple'

export default function ProgressCard({ coupleId }: { coupleId: string }) {
  const { data } = useQuery({
    queryKey: ['couple-progress', coupleId],
    queryFn: () => coupleApi.progress(coupleId),
    enabled: !!coupleId,
  })

  if (!data) return null

  const reached = data.milestones.filter(m => m.reached)
  const next = data.milestones.find(m => !m.reached)
  const toNext = data.level.next_at ? data.level.next_at - data.total_points : null
  const pct = data.level.next_at
    ? Math.min(100, Math.round((data.total_points / data.level.next_at) * 100))
    : 100

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy">Euer Weg</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Punkte gibt es fürs Dranbleiben – am meisten fürs Einhalten.
          </p>
        </div>
        {data.streak_weeks > 0 && (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[0.7rem] font-semibold text-accent">
            {data.streak_weeks} {data.streak_weeks === 1 ? 'Woche' : 'Wochen'} in Folge
          </span>
        )}
      </div>

      {/* Stufe + gemeinsamer Fortschritt */}
      <div className="mt-4 rounded-brand border border-brand-border px-4 py-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-brand-muted">Stufe</p>
            <p className="text-lg font-bold text-navy">{data.level.name}</p>
          </div>
          <p className="text-lg font-bold text-navy">
            {data.total_points}
            <span className="ml-1 text-xs font-normal text-brand-muted">gemeinsam</span>
          </p>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-brand-bg">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        {toNext !== null && toNext > 0 && (
          <p className="mt-1.5 text-[0.7rem] text-brand-muted">
            Noch {toNext} Punkte bis „{data.level.next_name}“.
          </p>
        )}
      </div>

      {/* Beide Beiträge – nebeneinander, nicht gegeneinander */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.members.map(m => (
          <div key={m.user_id} className="rounded-brand bg-brand-bg px-3.5 py-2.5">
            <p className="text-xs text-brand-muted">{m.name}</p>
            <p className="text-sm font-bold text-navy">{m.points} Punkte</p>
          </div>
        ))}
      </div>

      {/* Meilensteine */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-navy">
          Meilensteine <span className="font-normal text-brand-muted">({reached.length}/{data.milestones.length})</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.milestones.map(m => (
            <span
              key={m.key}
              title={m.description}
              className={`rounded-full border px-2.5 py-1 text-[0.7rem] transition ${
                m.reached
                  ? 'border-accent bg-accent/10 font-medium text-accent'
                  : 'border-brand-border text-brand-muted/70'
              }`}
            >
              {m.title}
            </span>
          ))}
        </div>
        {next && (
          <p className="mt-2 text-[0.7rem] text-brand-muted">Als Nächstes: {next.description}</p>
        )}
      </div>

      {/* Verlauf */}
      {data.recent.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-navy">
            Was zuletzt passiert ist
          </summary>
          <div className="mt-2 space-y-1.5">
            {data.recent.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 text-brand-muted">
                  <span className="font-medium text-navy">{e.name}</span> · {e.label}
                </span>
                <span className="shrink-0 text-brand-muted">+{e.points}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
