/**
 * /student/cases/:id/review — Verlauf & Rückblick der/des Studierenden.
 * Quantitative Trends (deterministisch) + gespeicherte LLM-Rückblicke.
 */
import { type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { studentApi } from '@/api/student'
import { apiErrorText } from '@/utils/apiError'
import { SCALE_LABELS } from '@/types'
import type { CaseTrends, DistressPoint, TrendMonth, ScaleKey } from '@/types'

export default function StudentReviewPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: trends, isLoading } = useQuery({
    queryKey: ['student-trends', id],
    queryFn: () => studentApi.reviewTrends(id!),
    enabled: !!id,
  })
  const { data: reviewData } = useQuery({
    queryKey: ['student-reviews', id],
    queryFn: () => studentApi.reviews(id!),
    enabled: !!id,
  })
  const reviews = reviewData?.reviews ?? []

  const generate = useMutation({
    mutationFn: () => studentApi.reviewCreate(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-reviews', id] }),
  })
  const remove = useMutation({
    mutationFn: (rid: string) => studentApi.reviewDelete(id!, rid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-reviews', id] }),
  })

  const hasData = !!trends && trends.confirmed_scenes > 0

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-navy">Verlauf &amp; Rückblick</h1>
          <p className="mt-1 text-sm text-brand-muted">Muster über die Zeit – die zwischen einzelnen Szenen leicht untergehen.</p>
        </header>

        {isLoading && <p className="text-sm text-brand-muted">Lädt …</p>}

        {!isLoading && !hasData && (
          <div className="card py-10 text-center">
            <p className="text-sm text-brand-muted">Keine datierten Szenen mit Belastungswert – hier zeigt sich der Verlauf, sobald welche vorliegen.</p>
          </div>
        )}

        {hasData && trends && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Bestätigte Szenen" value={`${trends.confirmed_scenes}`} />
              <Stat label="Zeitraum" value={periodLabel(trends)} />
              <Stat label="Belastungs-Tendenz" value={tendencyLabel(trends.distress_series)} />
              <Stat label="Muster-Tags" value={`${trends.top_tags.length}`} />
            </div>

            <Section title="Belastung über die Zeit">
              <DistressChart points={trends.distress_series} />
            </Section>

            {trends.scenes_by_month.length > 0 && (
              <Section title="Szenen pro Monat"><MonthBars months={trends.scenes_by_month} /></Section>
            )}

            {trends.top_tags.length > 0 && (
              <Section title="Häufigste Muster">
                <div className="space-y-2">
                  {trends.top_tags.map(t => (
                    <BarRow key={t.tag} label={t.tag} value={t.count} max={trends.top_tags[0].count} suffix="×" />
                  ))}
                </div>
              </Section>
            )}

            {trends.scales.length > 0 && (
              <Section title="Skalen (aktueller Stand)">
                <div className="space-y-2">
                  {trends.scales.map(s => (
                    <BarRow key={s.scale_key} label={SCALE_LABELS[s.scale_key as ScaleKey] ?? s.scale_key} value={s.score} max={5} suffix="/5" />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        <Section title="Rückblick">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-sm text-brand-muted">
              Echo fasst den Verlauf in Worte und benennt wiederkehrende Muster – ein Ritual, das du regelmäßig wiederholen kannst.
            </p>
            <button onClick={() => generate.mutate()} disabled={generate.isPending || !hasData}
              className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0 disabled:opacity-40">
              {generate.isPending ? 'Erstellt …' : '+ Rückblick erzeugen'}
            </button>
          </div>

          {generate.isError && (
            <p className="mb-3 text-xs text-red-600">{apiErrorText(generate.error, 'Rückblick konnte nicht erstellt werden.')}</p>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-brand-muted/70">Noch kein Rückblick erstellt.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <article key={r.id} className="rounded-brand border border-brand-border bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-brand-muted">
                      {new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {' · '}{r.scene_count} Szenen
                    </span>
                    <button onClick={() => { if (window.confirm('Diesen Rückblick löschen?')) remove.mutate(r.id) }}
                      className="text-xs text-brand-muted transition-colors hover:text-red-600">Löschen</button>
                  </div>
                  <div className="text-sm leading-relaxed text-brand-text"><MarkdownMessage content={r.narrative} /></div>
                </article>
              ))}
            </div>
          )}
        </Section>
      </div>
    </StudentShell>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card"><h2 className="mb-3 text-sm font-bold text-navy">{title}</h2>{children}</section>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-brand border border-brand-border bg-white px-3 py-2.5">
      <p className="text-[11px] text-brand-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-navy">{value}</p>
    </div>
  )
}

function BarRow({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 flex-shrink-0 truncate text-xs text-brand-text" title={label}>{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-bg">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 flex-shrink-0 text-right text-xs tabular-nums text-brand-muted">{value}{suffix}</span>
    </div>
  )
}

function MonthBars({ months }: { months: TrendMonth[] }) {
  const max = Math.max(...months.map(m => m.count), 1)
  return (
    <div className="flex h-32 items-end gap-2">
      {months.map(m => (
        <div key={m.period} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex h-full w-full items-end justify-center">
            <div className="w-7 max-w-full rounded-t bg-accent/70 transition-colors hover:bg-accent"
              style={{ height: `${(m.count / max) * 100}%` }}
              title={`${m.count} Szene(n)${m.avg_distress != null ? ` · Ø Belastung ${m.avg_distress}/5` : ''}`} />
          </div>
          <span className="w-full truncate text-center text-[10px] text-brand-muted">{m.label}</span>
        </div>
      ))}
    </div>
  )
}

function DistressChart({ points }: { points: DistressPoint[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-brand-muted/70">Zu wenige datierte Szenen mit Belastungswert für einen Verlauf.</p>
  }
  const W = 600, H = 170
  const pad = { l: 22, r: 12, t: 12, b: 24 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const n = points.length
  const x = (i: number) => pad.l + (i / (n - 1)) * innerW
  const y = (v: number) => pad.t + innerH - ((v - 1) / 4) * innerH
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.distress).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)},${(pad.t + innerH).toFixed(1)} L${x(0).toFixed(1)},${(pad.t + innerH).toFixed(1)} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Belastungsverlauf über die Zeit">
      {[1, 2, 3, 4, 5].map(v => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-brand-border" strokeWidth={1} />
          <text x={2} y={y(v) + 3} className="fill-brand-muted" fontSize={9}>{v}</text>
        </g>
      ))}
      <path d={area} className="fill-accent/10" />
      <path d={line} className="stroke-accent" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.distress)} r={2.5} className="fill-accent">
          <title>{`${p.title}: ${p.distress}/5`}</title>
        </circle>
      ))}
    </svg>
  )
}

function periodLabel(t: CaseTrends): string {
  if (!t.period_start || !t.period_end) return '–'
  const fmt = (d: string) => new Date(d).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
  const a = fmt(t.period_start), b = fmt(t.period_end)
  return a === b ? a : `${a} – ${b}`
}

function tendencyLabel(series: DistressPoint[]): string {
  const vals = series.map(p => p.distress)
  if (vals.length < 3) return '–'
  const third = Math.max(1, Math.floor(vals.length / 3))
  const first = vals.slice(0, third).reduce((a, b) => a + b, 0) / third
  const last = vals.slice(-third).reduce((a, b) => a + b, 0) / third
  const diff = last - first
  if (diff >= 0.6) return 'steigend ↗'
  if (diff <= -0.6) return 'sinkend ↘'
  return 'stabil →'
}
