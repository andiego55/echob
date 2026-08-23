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
import Fehlermeldung from '@/components/Fehlermeldung'
import { useBestaetigen } from '@/components/Bestaetigung'

export default function HypothesesPage() {
  const bestaetigen = useBestaetigen()
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
      <div className="mx-auto max-w-[1100px] px-6 py-8 space-y-5">
        <header>
          <h1 className="page-title">Hypothesen</h1>
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
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <HypothesisIcon path={h.icon} />
                    <div className="min-w-0">
                      <p className="card-title">{h.label}</p>
                      <p className="text-xs text-brand-muted mt-0.5">{h.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/app/cases/${caseId}/hypotheses/${h.id}`)}
                    className="text-xs font-semibold text-accent hover:underline sm:shrink-0"
                  >
                    {s ? 'Dialog erneut führen →' : 'Dialog starten →'}
                  </button>
                </div>

                {s && (
                  <HypothesisSummary
                    summaryText={s.summary_text}
                    onDelete={async () => { if (await bestaetigen({ titel: 'Hypothese löschen?', text: 'Die Arbeitshypothese verschwindet. Den Dialog dazu kannst du neu führen.', knopf: 'Löschen', gefahr: true })) remove.mutate(h.id) }}
                    deleting={remove.isPending}
                  />
                )}
                <Fehlermeldung error={remove.error} />
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
