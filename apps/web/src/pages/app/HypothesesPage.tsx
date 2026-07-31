/**
 * /app/cases/:caseId/hypotheses — Hypothesen-Übersicht
 * Listet die Hypothesen-Dialoge und gespeicherte Arbeitshypothesen.
 */
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import HypothesisIcon from '@/components/HypothesisIcon'
import HypothesisSummary from '@/components/HypothesisSummary'
import { hypothesesApi, HYPOTHESES } from '@/api/hypotheses'

export default function HypothesesPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: saved = [] } = useQuery({
    queryKey: ['hypotheses', caseId],
    queryFn: () => hypothesesApi.list(caseId!),
    enabled: !!caseId,
  })

  const remove = useMutation({
    mutationFn: (type: string) => hypothesesApi.remove(caseId!, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hypotheses', caseId] }),
  })

  const byType = Object.fromEntries(saved.map(s => [s.hypothesis_type, s]))

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-navy">Hypothesen</h1>
          <p className="text-sm text-brand-muted mt-1 max-w-2xl">
            Geführte Dialoge mit Echo, um <strong className="text-navy">tastende Arbeitshypothesen</strong> zu Mustern,
            Persönlichkeitsstruktur, Bindung und Prägungen zu entwickeln. Echo kennt den vollen Fallkontext
            (Szenen, Skalen, Verlauf, Profile). <strong className="text-navy">Hypothesen sind keine Diagnosen.</strong>
          </p>
        </header>

        <div className="space-y-3">
          {HYPOTHESES.map(h => {
            const s = byType[h.id]
            return (
              <div key={h.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <HypothesisIcon path={h.icon} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy">{h.label}</p>
                      <p className="text-xs text-brand-muted mt-0.5">{h.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/app/cases/${caseId}/hypotheses/${h.id}`)}
                    className="shrink-0 text-xs font-semibold text-accent hover:underline"
                  >
                    {s ? 'Dialog erneut führen →' : 'Dialog starten →'}
                  </button>
                </div>

                {s && (
                  <HypothesisSummary
                    summaryText={s.summary_text}
                    onDelete={() => { if (window.confirm('Diese Hypothese löschen?')) remove.mutate(h.id) }}
                    deleting={remove.isPending}
                  />
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-brand-muted/70 max-w-xl">
          EchoB stellt keine Diagnosen. Hypothesen sind vorläufige Arbeitsannahmen auf Basis deiner Angaben
          und ersetzen keine fachliche Abklärung.
        </p>
      </div>
    </AppShell>
  )
}
