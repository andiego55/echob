/**
 * /app/cases/:caseId/scales — Muster- und Skalenübersicht
 */
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { apiClient } from '@/api/client'
import type { ScalesOverview, ScaleScore } from '@/types'

function fetchScales(caseId: string) {
  return apiClient.get<ScalesOverview>(`/cases/${caseId}/scales`).then(r => r.data)
}

const QUALITY_LABELS = {
  insufficient: { label: 'Unzureichende Datenlage', cls: 'text-red-600' },
  limited:      { label: 'Begrenzte Datenlage',      cls: 'text-orange-600' },
  moderate:     { label: 'Moderate Datenlage',        cls: 'text-yellow-600' },
  good:         { label: 'Gute Datenlage',            cls: 'text-green-600' },
}

export default function ScalesPage() {
  const { caseId } = useParams<{ caseId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['scales', caseId],
    queryFn: () => fetchScales(caseId!),
    enabled: !!caseId,
  })

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-navy">Muster & Skalen</h1>
          <p className="text-sm text-brand-muted mt-1">
            Nichtdiagnostische Übersicht über mögliche Beziehungsmuster auf Basis deiner dokumentierten Szenen.
          </p>
        </div>

        {isLoading && <p className="text-sm text-brand-muted">Wird geladen …</p>}

        {data && (
          <>
            {/* Datenqualität */}
            <div className="card mb-6 flex items-center gap-4">
              <div>
                <p className="text-xs text-brand-muted mb-0.5">Datenlage</p>
                <p className={`text-sm font-semibold ${QUALITY_LABELS[data.data_quality].cls}`}>
                  {QUALITY_LABELS[data.data_quality].label}
                </p>
              </div>
              <div className="border-l border-brand-border pl-4">
                <p className="text-xs text-brand-muted mb-0.5">Szenen (bestätigt)</p>
                <p className="text-sm font-semibold text-navy">{data.total_scenes}</p>
              </div>
              {data.total_scenes < 3 && (
                <p className="ml-auto text-xs text-brand-muted max-w-xs">
                  Dokumentiere mindestens 3 bestätigte Szenen für aussagekräftige Muster.
                </p>
              )}
            </div>

            {/* Skalen */}
            {data.scores.length === 0 ? (
              <EmptyScales />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.scores.map((s) => (
                  <ScaleCard key={s.id} score={s} />
                ))}
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

function ScaleCard({ score: s }: { score: ScaleScore }) {
  const pct = Math.round((s.score / 5) * 100)
  const barColor = s.score >= 4 ? 'bg-red-400' : s.score >= 2.5 ? 'bg-orange-400' : 'bg-green-400'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-navy">{s.label}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          s.confidence === 'high'   ? 'bg-green-100 text-green-800' :
          s.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-brand-bg text-brand-muted'
        }`}>
          {s.confidence === 'high' ? 'Hohe Sicherheit' : s.confidence === 'medium' ? 'Mittlere Sicherheit' : 'Geringe Sicherheit'}
        </span>
      </div>

      {/* Balken */}
      <div className="h-2 bg-brand-border rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-brand-muted mb-3">
        <span>0</span>
        <span className="font-medium text-navy">{s.score.toFixed(1)} / 5</span>
        <span>5</span>
      </div>

      <p className="text-xs text-brand-muted">
        Basiert auf {s.scene_count} {s.scene_count === 1 ? 'Szene' : 'Szenen'}
      </p>

      {s.notes && (
        <p className="mt-2 text-xs text-brand-muted italic">{s.notes}</p>
      )}
    </div>
  )
}

function EmptyScales() {
  return (
    <div className="card text-center py-12 max-w-md mx-auto">
      <div className="text-4xl mb-4">📊</div>
      <h2 className="text-lg font-semibold text-navy mb-2">Noch keine Skalenwerte</h2>
      <p className="text-sm text-brand-muted">
        Skalenwerte werden berechnet, sobald du Beziehungsszenen dokumentiert und bestätigt hast.
      </p>
    </div>
  )
}
