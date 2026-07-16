/**
 * /student/cases/:id/scales — Muster & Skalen (KI-Einschätzung der Fallperson).
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import { studentApi } from '@/api/student'
import { apiErrorText } from '@/utils/apiError'
import type { ScalesOverview, ScaleScore } from '@/types'

const QUALITY_LABELS = {
  insufficient: { label: 'Unzureichende Datenlage', cls: 'text-red-500' },
  limited:      { label: 'Begrenzte Datenlage',     cls: 'text-orange-500' },
  moderate:     { label: 'Moderate Datenlage',       cls: 'text-yellow-600' },
  good:         { label: 'Gute Datenlage',           cls: 'text-green-600' },
}

const GROUP_CONFIG: Record<string, { label: string; description: string; colorScheme: 'risk' | 'neutral' | 'dynamic' }> = {
  behavior:    { label: 'Verhaltensmuster', description: 'Beobachtete Verhaltensweisen der Fallperson in Konflikten und Alltag.', colorScheme: 'risk' },
  personality: { label: 'Persönlichkeitsprofil (Fallperson)', description: 'Big-Five-Merkmale aus der Beobachtungsperspektive.', colorScheme: 'neutral' },
  dynamics:    { label: 'Beziehungsdynamik', description: 'Übergeordnete Muster der Beziehungsgestaltung und mögliche klinisch relevante Züge.', colorScheme: 'dynamic' },
}

const SCALE_META: Record<string, { low: string; high: string; group: string }> = {
  boundary_violation:            { low: 'Respektiert Grenzen', high: 'Missachtet Grenzen', group: 'behavior' },
  guilt_shifting:                { low: 'Keine Schuldumkehr', high: 'Systematische Schuldumkehr', group: 'behavior' },
  control_isolation:             { low: 'Keine Kontrolle', high: 'Starke Kontrolle & Isolation', group: 'behavior' },
  proximity_distance:            { low: 'Konstantes Verhalten', high: 'Extremes Wechselverhalten', group: 'behavior' },
  conflict_escalation:           { low: 'Konstruktiver Umgang', high: 'Starke Eskalation', group: 'behavior' },
  perception_distortion:         { low: 'Keine Verzerrung', high: 'Systematisches Gaslighting', group: 'behavior' },
  safety_risk:                   { low: 'Kein Risiko', high: 'Erhebliches Risiko', group: 'behavior' },
  personality_openness:          { low: 'Starres Denken', high: 'Sehr offen', group: 'personality' },
  personality_conscientiousness: { low: 'Unzuverlässig', high: 'Sehr verlässlich', group: 'personality' },
  personality_extraversion:      { low: 'Zurückhaltend', high: 'Sehr dominant', group: 'personality' },
  personality_agreeableness:     { low: 'Konfliktsuchend', high: 'Sehr kooperativ', group: 'personality' },
  personality_neuroticism:       { low: 'Emotional stabil', high: 'Stark instabil', group: 'personality' },
  responsibility_deflection:     { low: 'Übernimmt Verantwortung', high: 'Weist alles ab', group: 'dynamics' },
  cluster_b_traits:              { low: 'Keine Anzeichen', high: 'Starke Anzeichen', group: 'dynamics' },
  empathy_deficit:               { low: 'Ausgeprägte Empathie', high: 'Deutlicher Mangel', group: 'dynamics' },
}

function groupScores(scores: ScaleScore[]) {
  const groups: Record<string, ScaleScore[]> = { behavior: [], personality: [], dynamics: [] }
  for (const s of scores) groups[SCALE_META[s.scale_key]?.group ?? 'behavior'].push(s)
  return groups
}

export default function StudentScalesPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['student-scales', id],
    queryFn: () => studentApi.scales(id!),
    enabled: !!id,
  })
  const calc = useMutation({
    mutationFn: () => studentApi.scalesCalculate(id!),
    onSuccess: (result: ScalesOverview) => qc.setQueryData(['student-scales', id], result),
  })

  const groups = data ? groupScores(data.scores) : null
  const hasScores = (data?.scores.length ?? 0) > 0

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-navy">Muster &amp; Skalen</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-muted">
              KI-gestützte Einschätzung von Verhaltensmustern, Persönlichkeitsmerkmalen und Beziehungsdynamik der Fallperson – auf Basis der dokumentierten Szenen.
            </p>
          </div>
          <button onClick={() => calc.mutate()} disabled={calc.isPending}
            className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0 disabled:opacity-50">
            {calc.isPending ? 'Wird berechnet …' : hasScores ? 'Neu berechnen' : 'Skalen berechnen'}
          </button>
        </div>

        {isLoading && <p className="text-sm text-brand-muted">Wird geladen …</p>}

        {calc.isError && (
          <div className="mb-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiErrorText(calc.error, 'Berechnung fehlgeschlagen. Bitte versuche es erneut.')}
          </div>
        )}

        {data && (
          <>
            <div className="card mb-6 flex flex-wrap items-center gap-6">
              <div>
                <p className="mb-0.5 text-xs text-brand-muted">Datenlage</p>
                <p className={`text-sm font-semibold ${QUALITY_LABELS[data.data_quality].cls}`}>{QUALITY_LABELS[data.data_quality].label}</p>
              </div>
              <div className="border-l border-brand-border pl-6">
                <p className="mb-0.5 text-xs text-brand-muted">Bestätigte Szenen</p>
                <p className="text-sm font-semibold text-navy">{data.total_scenes}</p>
              </div>
              {data.total_scenes < 3 && (
                <p className="ml-auto max-w-xs text-xs text-brand-muted">Für aussagekräftige Muster werden mindestens 3 Szenen empfohlen.</p>
              )}
            </div>

            {!hasScores ? (
              <EmptyScales onCalculate={() => calc.mutate()} isPending={calc.isPending} />
            ) : (
              <div className="space-y-8">
                {(['behavior', 'personality', 'dynamics'] as const).map(group => {
                  const scores = groups?.[group] ?? []
                  if (scores.length === 0) return null
                  const cfg = GROUP_CONFIG[group]
                  return (
                    <section key={group}>
                      <div className="mb-3">
                        <h2 className="text-base font-bold text-navy">{cfg.label}</h2>
                        <p className="mt-0.5 text-xs text-brand-muted">{cfg.description}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {scores.map(s => (
                          <ScaleCard key={s.id} score={s} colorScheme={cfg.colorScheme}
                            expanded={expanded === s.scale_key}
                            onToggle={() => setExpanded(expanded === s.scale_key ? null : s.scale_key)} />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}

            <div className="mt-8 rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
              <p className="text-xs text-brand-muted">{data.disclaimer}</p>
            </div>
          </>
        )}
      </div>
    </StudentShell>
  )
}

function ScaleCard({ score: s, colorScheme, expanded, onToggle }: {
  score: ScaleScore; colorScheme: 'risk' | 'neutral' | 'dynamic'; expanded: boolean; onToggle: () => void
}) {
  const pct = Math.round(s.score)
  const meta = SCALE_META[s.scale_key]
  const barColor = (() => {
    if (colorScheme === 'neutral') return 'bg-blue-400'
    if (colorScheme === 'dynamic') return s.score >= 70 ? 'bg-purple-500' : s.score >= 40 ? 'bg-purple-400' : 'bg-purple-300'
    return s.score >= 70 ? 'bg-red-500' : s.score >= 40 ? 'bg-orange-400' : 'bg-green-400'
  })()
  const confidenceBadge = {
    high:   { cls: 'bg-green-100 text-green-800',   label: 'Hohe Sicherheit' },
    medium: { cls: 'bg-yellow-100 text-yellow-800', label: 'Mittlere Sicherheit' },
    low:    { cls: 'bg-brand-bg text-brand-muted',  label: 'Geringe Sicherheit' },
  }[s.confidence]

  return (
    <div className="card cursor-pointer select-none" onClick={onToggle}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-navy">{s.label}</p>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${confidenceBadge.cls}`}>{confidenceBadge.label}</span>
      </div>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-brand-border">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mb-2 flex justify-between text-xs text-brand-muted">
        <span>0 %</span><span className="font-semibold text-navy">{Math.round(s.score)} %</span><span>100 %</span>
      </div>
      {meta && (
        <div className="mb-2 flex justify-between text-xs text-brand-muted/60">
          <span className="max-w-[45%] leading-tight">{meta.low}</span>
          <span className="max-w-[45%] text-right leading-tight">{meta.high}</span>
        </div>
      )}
      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-brand-border pt-3" onClick={e => e.stopPropagation()}>
          {s.notes && <p className="text-xs italic text-brand-muted">{s.notes}</p>}
          <p className="text-xs text-brand-muted">Basiert auf {s.scene_count} {s.scene_count === 1 ? 'Szene' : 'Szenen'}</p>
        </div>
      )}
      <p className="mt-2 text-xs text-accent">{expanded ? '▲ Weniger' : '▼ Details'}</p>
    </div>
  )
}

function EmptyScales({ onCalculate, isPending }: { onCalculate: () => void; isPending: boolean }) {
  return (
    <div className="card mx-auto max-w-md py-12 text-center">
      <h2 className="mb-2 text-lg font-semibold text-navy">Noch keine Skalenwerte</h2>
      <p className="mb-6 text-sm text-brand-muted">
        Klick auf „Skalen berechnen", um eine KI-gestützte Einschätzung der Beziehungsmuster zu erhalten.
      </p>
      <button onClick={onCalculate} disabled={isPending} className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50">
        {isPending ? 'Wird berechnet …' : 'Skalen berechnen'}
      </button>
    </div>
  )
}
