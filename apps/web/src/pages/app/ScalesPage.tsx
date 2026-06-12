/**
 * /app/cases/:caseId/scales — Muster- und Skalenübersicht
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { apiClient } from '@/api/client'
import { apiErrorText } from '@/utils/apiError'
import type { ScalesOverview, ScaleScore } from '@/types'

function fetchScales(caseId: string) {
  return apiClient.get<ScalesOverview>(`/cases/${caseId}/scales`).then(r => r.data)
}

function calculateScales(caseId: string) {
  return apiClient.post<ScalesOverview>(`/cases/${caseId}/scales/calculate`).then(r => r.data)
}

const QUALITY_LABELS = {
  insufficient: { label: 'Unzureichende Datenlage', cls: 'text-red-500' },
  limited:      { label: 'Begrenzte Datenlage',     cls: 'text-orange-500' },
  moderate:     { label: 'Moderate Datenlage',       cls: 'text-yellow-600' },
  good:         { label: 'Gute Datenlage',           cls: 'text-green-600' },
}

const GROUP_CONFIG: Record<string, { label: string; description: string; colorScheme: 'risk' | 'neutral' | 'dynamic' }> = {
  behavior:    { label: 'Verhaltensmuster', description: 'Beobachtete Verhaltensweisen der Fallperson in Konflikten und Alltagssituationen.', colorScheme: 'risk' },
  personality: { label: 'Persönlichkeitsprofil (Fallperson)', description: 'Einschätzung der Big-Five-Persönlichkeitsmerkmale aus deiner Beobachtungsperspektive.', colorScheme: 'neutral' },
  dynamics:    { label: 'Beziehungsdynamik', description: 'Übergeordnete Muster der Beziehungsgestaltung und mögliche klinisch relevante Züge.', colorScheme: 'dynamic' },
}

const SCALE_META: Record<string, { low: string; high: string; group: string }> = {
  boundary_violation:          { low: 'Respektiert Grenzen', high: 'Missachtet Grenzen', group: 'behavior' },
  guilt_shifting:              { low: 'Keine Schuldumkehr', high: 'Systematische Schuldumkehr', group: 'behavior' },
  control_isolation:           { low: 'Keine Kontrolle', high: 'Starke Kontrolle & Isolation', group: 'behavior' },
  proximity_distance:          { low: 'Konstantes Verhalten', high: 'Extremes Wechselverhalten', group: 'behavior' },
  conflict_escalation:         { low: 'Konstruktiver Umgang', high: 'Starke Eskalation', group: 'behavior' },
  perception_distortion:       { low: 'Keine Verzerrung', high: 'Systematisches Gaslighting', group: 'behavior' },
  safety_risk:                 { low: 'Kein Risiko', high: 'Erhebliches Risiko', group: 'behavior' },
  personality_openness:        { low: 'Starres Denken', high: 'Sehr offen', group: 'personality' },
  personality_conscientiousness: { low: 'Unzuverlässig', high: 'Sehr verlässlich', group: 'personality' },
  personality_extraversion:    { low: 'Zurückhaltend', high: 'Sehr dominant', group: 'personality' },
  personality_agreeableness:   { low: 'Konfliktsuchend', high: 'Sehr kooperativ', group: 'personality' },
  personality_neuroticism:     { low: 'Emotional stabil', high: 'Stark instabil', group: 'personality' },
  responsibility_deflection:   { low: 'Übernimmt Verantwortung', high: 'Weist alles ab', group: 'dynamics' },
  cluster_b_traits:            { low: 'Keine Anzeichen', high: 'Starke Anzeichen', group: 'dynamics' },
  empathy_deficit:             { low: 'Ausgeprägte Empathie', high: 'Deutlicher Mangel', group: 'dynamics' },
}

function groupScores(scores: ScaleScore[]) {
  const groups: Record<string, ScaleScore[]> = { behavior: [], personality: [], dynamics: [] }
  for (const s of scores) {
    const g = SCALE_META[s.scale_key]?.group ?? 'behavior'
    groups[g].push(s)
  }
  return groups
}

export default function ScalesPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const [expandedScale, setExpandedScale] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['scales', caseId],
    queryFn: () => fetchScales(caseId!),
    enabled: !!caseId,
  })

  const calcMutation = useMutation({
    mutationFn: () => calculateScales(caseId!),
    onSuccess: (result) => {
      qc.setQueryData(['scales', caseId], result)
    },
  })

  const groups = data ? groupScores(data.scores) : null
  const hasScores = (data?.scores.length ?? 0) > 0

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-navy">Muster & Skalen</h1>
            <p className="text-sm text-brand-muted mt-1 max-w-xl">
              KI-gestützte Einschätzung von Verhaltensmustern, Persönlichkeitsmerkmalen und Beziehungsdynamiken auf Basis deiner dokumentierten Szenen und Reflexionen.
            </p>
          </div>
          <button
            onClick={() => calcMutation.mutate()}
            disabled={calcMutation.isPending}
            className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0 disabled:opacity-50"
          >
            {calcMutation.isPending ? 'Wird berechnet …' : hasScores ? 'Neu berechnen' : 'Skalen berechnen'}
          </button>
        </div>

        {isLoading && <p className="text-sm text-brand-muted">Wird geladen …</p>}

        {calcMutation.isError && (
          <div className="mb-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiErrorText(calcMutation.error, 'Berechnung fehlgeschlagen. Bitte versuche es erneut.')}
          </div>
        )}

        {data && (
          <>
            {/* Datenlage-Banner */}
            <div className="card mb-6 flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-xs text-brand-muted mb-0.5">Datenlage</p>
                <p className={`text-sm font-semibold ${QUALITY_LABELS[data.data_quality].cls}`}>
                  {QUALITY_LABELS[data.data_quality].label}
                </p>
              </div>
              <div className="border-l border-brand-border pl-6">
                <p className="text-xs text-brand-muted mb-0.5">Bestätigte Szenen</p>
                <p className="text-sm font-semibold text-navy">{data.total_scenes}</p>
              </div>
              {data.total_scenes < 3 && (
                <p className="text-xs text-brand-muted ml-auto max-w-xs">
                  Für aussagekräftige Muster werden mindestens 3 bestätigte Szenen empfohlen.
                </p>
              )}
            </div>

            {!hasScores ? (
              <EmptyScales onCalculate={() => calcMutation.mutate()} isPending={calcMutation.isPending} />
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
                        <p className="text-xs text-brand-muted mt-0.5">{cfg.description}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {scores.map(s => (
                          <ScaleCard
                            key={s.id}
                            score={s}
                            colorScheme={cfg.colorScheme}
                            expanded={expandedScale === s.scale_key}
                            onToggle={() => setExpandedScale(expandedScale === s.scale_key ? null : s.scale_key)}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-8 rounded-brand bg-brand-bg border border-brand-border px-4 py-3">
              <p className="text-xs text-brand-muted">{data.disclaimer}</p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

function ScaleCard({ score: s, colorScheme, expanded, onToggle }: {
  score: ScaleScore
  colorScheme: 'risk' | 'neutral' | 'dynamic'
  expanded: boolean
  onToggle: () => void
}) {
  const pct = Math.round(s.score)
  const meta = SCALE_META[s.scale_key]

  const barColor = (() => {
    if (colorScheme === 'neutral') return 'bg-blue-400'
    if (colorScheme === 'dynamic') return s.score >= 70 ? 'bg-purple-500' : s.score >= 40 ? 'bg-purple-400' : 'bg-purple-300'
    // risk
    return s.score >= 70 ? 'bg-red-500' : s.score >= 40 ? 'bg-orange-400' : 'bg-green-400'
  })()

  const confidenceBadge = {
    high:   { cls: 'bg-green-100 text-green-800',  label: 'Hohe Sicherheit' },
    medium: { cls: 'bg-yellow-100 text-yellow-800', label: 'Mittlere Sicherheit' },
    low:    { cls: 'bg-brand-bg text-brand-muted',  label: 'Geringe Sicherheit' },
  }[s.confidence]

  return (
    <div className="card cursor-pointer select-none" onClick={onToggle}>
      {/* Titel + Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-navy leading-tight">{s.label}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${confidenceBadge.cls}`}>
          {confidenceBadge.label}
        </span>
      </div>

      {/* Balken */}
      <div className="h-2 bg-brand-border rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Wert */}
      <div className="flex justify-between text-xs text-brand-muted mb-2">
        <span>0 %</span>
        <span className="font-semibold text-navy">{Math.round(s.score)} %</span>
        <span>100 %</span>
      </div>

      {/* Endpunkt-Labels */}
      {meta && (
        <div className="flex justify-between text-xs text-brand-muted/60 mb-2">
          <span className="max-w-[45%] leading-tight">{meta.low}</span>
          <span className="max-w-[45%] text-right leading-tight">{meta.high}</span>
        </div>
      )}

      {/* Expandierter Bereich */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-brand-border space-y-1.5" onClick={e => e.stopPropagation()}>
          {s.notes && (
            <p className="text-xs text-brand-muted italic">{s.notes}</p>
          )}
          <p className="text-xs text-brand-muted">
            Basiert auf {s.scene_count} {s.scene_count === 1 ? 'Szene' : 'Szenen'}
          </p>
        </div>
      )}

      <p className="text-xs text-accent mt-2">{expanded ? '▲ Weniger' : '▼ Details'}</p>
    </div>
  )
}

function EmptyScales({ onCalculate, isPending }: { onCalculate: () => void; isPending: boolean }) {
  return (
    <div className="card text-center py-12 max-w-md mx-auto">
      <div className="text-4xl mb-4">📊</div>
      <h2 className="text-lg font-semibold text-navy mb-2">Noch keine Skalenwerte</h2>
      <p className="text-sm text-brand-muted mb-6">
        Klicke auf "Skalen berechnen", um eine KI-gestützte Einschätzung der Beziehungsmuster zu erhalten. Je mehr Szenen und Reflexionen vorliegen, desto aussagekräftiger die Ergebnisse.
      </p>
      <button
        onClick={onCalculate}
        disabled={isPending}
        className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
      >
        {isPending ? 'Wird berechnet …' : 'Skalen berechnen'}
      </button>
    </div>
  )
}
