/**
 * /app/cases/:caseId/review — Verlauf & Rückblick
 * Quantitative Trends (live, deterministisch) + gespeicherte LLM-Rückblicke.
 */
import { type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { reviewsApi } from '@/api/reviews'
import { apiErrorText } from '@/utils/apiError'
import { SCALE_LABELS } from '@/types'
import type { CaseTrends, DistressPoint, TrendMonth } from '@/types'

export default function ReviewPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['case-trends', caseId],
    queryFn: () => reviewsApi.trends(caseId!),
    enabled: !!caseId,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['case-reviews', caseId],
    queryFn: () => reviewsApi.list(caseId!),
    enabled: !!caseId,
  })

  const generate = useMutation({
    mutationFn: () => reviewsApi.generate(caseId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-reviews', caseId] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => reviewsApi.remove(caseId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-reviews', caseId] }),
  })

  const hasData = !!trends && trends.confirmed_scenes > 0

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="mx-auto max-w-[900px] px-6 py-6 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-navy">Verlauf &amp; Rückblick</h1>
          <p className="text-sm text-brand-muted mt-1">
            Muster über die Zeit – die im Alltag zwischen einzelnen Szenen leicht untergehen.
          </p>
        </header>

        {trendsLoading && <p className="text-sm text-brand-muted">Lädt …</p>}

        {!trendsLoading && !hasData && (
          <div className="card text-center py-10">
            <p className="text-sm text-brand-muted">
              Noch keine bestätigten Szenen. Dokumentiere ein paar Szenen, dann zeigt sich hier dein Verlauf.
            </p>
          </div>
        )}

        {hasData && trends && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Bestätigte Szenen" value={`${trends.confirmed_scenes}`} />
              <Stat label="Zeitraum" value={periodLabel(trends)} />
              <Stat label="Belastungs-Tendenz" value={tendencyLabel(trends.distress_series)} />
              <Stat label="Muster-Tags" value={`${trends.top_tags.length}`} />
            </div>

            <Section title="Belastung über die Zeit">
              <DistressChart points={trends.distress_series} />
            </Section>

            {trends.scenes_by_month.length > 0 && (
              <Section title="Szenen pro Monat">
                <MonthBars months={trends.scenes_by_month} />
              </Section>
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
                    <BarRow
                      key={s.scale_key}
                      label={SCALE_LABELS[s.scale_key] ?? s.scale_key}
                      value={s.score}
                      max={5}
                      suffix="/5"
                    />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* Rückblick (Narrativ) */}
        <Section title="Rückblick">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <p className="text-sm text-brand-muted max-w-md">
              Echo fasst deinen Verlauf in Worte und benennt wiederkehrende Muster – als Ritual, das du regelmäßig wiederholen kannst.
            </p>
            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || !hasData}
              className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-40 flex-shrink-0"
            >
              {generate.isPending ? 'Erstellt …' : '+ Rückblick erzeugen'}
            </button>
          </div>

          {generate.isError && (
            <p className="text-xs text-red-600 mb-3">
              {apiErrorText(generate.error, 'Rückblick konnte nicht erstellt werden.')}
            </p>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-brand-muted/70">Noch kein Rückblick erstellt.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <article key={r.id} className="rounded-brand border border-brand-border bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-brand-muted">
                      {new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {' · '}{r.scene_count} Szenen
                    </span>
                    <button
                      onClick={() => { if (window.confirm('Diesen Rückblick löschen?')) remove.mutate(r.id) }}
                      className="text-xs text-brand-muted hover:text-red-600 transition-colors"
                    >
                      Löschen
                    </button>
                  </div>
                  <div className="text-sm text-brand-text leading-relaxed">
                    <MarkdownMessage content={r.narrative} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </Section>
      </div>
    </AppShell>
  )
}

// ── Hilfs-Komponenten ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-sm font-bold text-navy mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-brand border border-brand-border bg-white px-3 py-2.5">
      <p className="text-[11px] text-brand-muted">{label}</p>
      <p className="text-sm font-semibold text-navy mt-0.5 truncate">{value}</p>
    </div>
  )
}

function BarRow({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 flex-shrink-0 text-xs text-brand-text truncate" title={label}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-brand-bg overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 flex-shrink-0 text-right text-xs text-brand-muted tabular-nums">{value}{suffix}</span>
    </div>
  )
}

function MonthBars({ months }: { months: TrendMonth[] }) {
  const max = Math.max(...months.map(m => m.count), 1)
  return (
    <div className="flex items-end gap-2 h-32">
      {months.map(m => (
        <div key={m.period} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex items-end justify-center h-full">
            <div
              className="w-7 max-w-full rounded-t bg-accent/70 hover:bg-accent transition-colors"
              style={{ height: `${(m.count / max) * 100}%` }}
              title={`${m.count} Szene(n)${m.avg_distress != null ? ` · Ø Belastung ${m.avg_distress}/5` : ''}`}
            />
          </div>
          <span className="text-[10px] text-brand-muted truncate w-full text-center">{m.label}</span>
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
  const y = (v: number) => pad.t + innerH - ((v - 1) / 4) * innerH   // 1..5 → unten..oben
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.distress).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)},${(pad.t + innerH).toFixed(1)} L${x(0).toFixed(1)},${(pad.t + innerH).toFixed(1)} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Belastungsverlauf über die Zeit">
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

// ── Formatierungshelfer ───────────────────────────────────────────────────────

function periodLabel(t: CaseTrends): string {
  if (!t.period_start || !t.period_end) return '–'
  const fmt = (d: string) => new Date(d).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
  const a = fmt(t.period_start)
  const b = fmt(t.period_end)
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
