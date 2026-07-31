/**
 * /student/cases/:id/hypotheses — Hypothesen-Übersicht (student-scoped).
 * Listet die geführten Hypothesen-Dialoge und gespeicherte Arbeitshypothesen.
 */
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import HypothesisIcon from '@/components/HypothesisIcon'
import HypothesisSummary from '@/components/HypothesisSummary'
import { studentApi } from '@/api/student'
import { HYPOTHESES } from '@/api/hypotheses'

export default function StudentHypothesesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: saved = [] } = useQuery({
    queryKey: ['student-hypotheses', id],
    queryFn: () => studentApi.hypotheses(id!),
    enabled: !!id,
  })

  const remove = useMutation({
    mutationFn: (type: string) => studentApi.hypRemove(id!, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-hypotheses', id] }),
  })

  const byType = Object.fromEntries(saved.map(s => [s.hypothesis_type, s]))

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-5">
        <header>
          <h1 className="text-xl font-bold text-navy">Hypothesen</h1>
          <p className="text-sm text-brand-muted mt-1 max-w-2xl">
            Geführte Dialoge mit Echo, um <strong className="text-navy">tastende Arbeitshypothesen</strong> zu Mustern,
            Persönlichkeitsstruktur, Bindung und Prägungen zu entwickeln. Echo kennt den vollen Fallkontext
            (Onboarding, Szenen, Selbstbild, Fremdeinschätzung). <strong className="text-navy">Hypothesen sind keine Diagnosen.</strong>
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
                    onClick={() => navigate(`/student/cases/${id}/hypotheses/${h.id}`)}
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
          EchoB stellt keine Diagnosen. Hypothesen sind vorläufige Arbeitsannahmen und ersetzen keine fachliche Abklärung.
          Übungsraum – keine echten Patient:innen.
        </p>
      </div>
    </StudentShell>
  )
}
