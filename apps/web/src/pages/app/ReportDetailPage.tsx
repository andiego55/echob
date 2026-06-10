/**
 * /app/cases/:caseId/reports/:reportId — Bericht ansehen
 * Zeigt den vollständigen Bericht mit Abschnitten und Disclaimer.
 */
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { reportsApi } from '@/api/reports'

export default function ReportDetailPage() {
  const { caseId, reportId } = useParams<{ caseId: string; reportId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', caseId, reportId],
    queryFn: () => reportsApi.get(caseId!, reportId!),
    enabled: !!caseId && !!reportId,
  })

  const archiveMutation = useMutation({
    mutationFn: () => reportsApi.archive(caseId!, reportId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports', caseId] })
      navigate(`/app/cases/${caseId}/reports`)
    },
  })

  if (isLoading || !report) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="px-6 py-10 text-sm text-brand-muted">Bericht wird geladen …</div>
      </AppShell>
    )
  }

  const sections = report.content?.sections ?? []

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[780px] px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <span className="label mb-2">{report.type_label}</span>
          <h1 className="mt-1 text-xl font-bold text-navy">
            {report.title ?? report.type_label}
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Erstellt am {new Date(report.created_at).toLocaleDateString('de-DE', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 rounded-brand bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs text-amber-800">{report.disclaimer}</p>
        </div>

        {/* Abschnitte */}
        {sections.length > 0 ? (
          <div className="space-y-6">
            {sections.map((section: { heading: string; text: string }, i: number) => (
              <div key={i} className="card">
                <h2 className="text-sm font-bold text-navy mb-2">{section.heading}</h2>
                <p className="text-sm text-brand-text whitespace-pre-wrap">{section.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-sm text-brand-muted">
              Dieser Bericht hat noch keinen generierten Inhalt.
            </p>
          </div>
        )}

        {/* Aktionen */}
        <div className="mt-8 flex gap-3 flex-wrap">
          <button
            onClick={() => window.print()}
            className="btn-outline !py-2 !px-4 !text-sm"
          >
            🖨️ Drucken / PDF
          </button>
          <button
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Bericht archivieren
          </button>
        </div>
      </div>
    </AppShell>
  )
}
