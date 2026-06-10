/**
 * /app/cases/:caseId/reports — Berichtsliste
 */
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { reportsApi } from '@/api/reports'
import type { Report } from '@/types'

const MAX_REPORTS = 20

export default function ReportsPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reports', caseId],
    queryFn: () => reportsApi.list(caseId!),
    enabled: !!caseId,
  })

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => reportsApi.delete(caseId!, reportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', caseId] }),
  })

  const handleDelete = (reportId: string, title: string) => {
    if (window.confirm(`Bericht „${title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      deleteMutation.mutate(reportId)
    }
  }

  const count = data?.reports.length ?? 0
  const atLimit = count >= MAX_REPORTS

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-navy">Berichte</h1>
            <p className="text-sm text-brand-muted mt-1">
              Strukturierte Zusammenfassungen für Selbstreflexion, Coaching oder professionelle Hilfe.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {count > 0 && (
              <span className={`text-xs ${atLimit ? 'text-red-500 font-medium' : 'text-brand-muted'}`}>
                {count} / {MAX_REPORTS}
              </span>
            )}
            {atLimit ? (
              <span
                title="Maximale Anzahl erreicht. Bitte lösche einen Bericht."
                className="btn-primary !py-2 !px-4 !text-sm opacity-40 cursor-not-allowed"
              >
                + Bericht erstellen
              </span>
            ) : (
              <Link
                to={`/app/cases/${caseId}/reports/new`}
                className="btn-primary !py-2 !px-4 !text-sm"
              >
                + Bericht erstellen
              </Link>
            )}
          </div>
        </div>

        {atLimit && (
          <div className="mb-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Du hast die maximale Anzahl von {MAX_REPORTS} Berichten erreicht. Lösche einen Bericht, um einen neuen zu erstellen.
          </div>
        )}

        {isLoading && <p className="text-sm text-brand-muted">Wird geladen …</p>}

        {data && data.reports.length === 0 && <EmptyReports caseId={caseId!} />}

        {data && data.reports.length > 0 && (
          <div className="space-y-3">
            {data.reports.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                caseId={caseId!}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === r.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function ReportRow({ report: r, caseId, onDelete, isDeleting }: {
  report: Report
  caseId: string
  onDelete: (id: string, title: string) => void
  isDeleting: boolean
}) {
  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="label">{r.type_label}</span>
        </div>
        <p className="text-sm font-semibold text-navy">{r.title ?? r.type_label}</p>
        <p className="text-xs text-brand-muted mt-0.5">
          {new Date(r.created_at).toLocaleDateString('de-DE', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={`/app/cases/${caseId}/reports/${r.id}`}
          className="rounded-brand border border-brand-border bg-white px-4 py-1.5 text-xs font-medium text-navy hover:bg-brand-bg transition-colors"
        >
          Öffnen
        </Link>
        <button
          onClick={() => onDelete(r.id, r.title ?? r.type_label)}
          disabled={isDeleting}
          className="rounded-brand border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {isDeleting ? '…' : 'Löschen'}
        </button>
      </div>
    </div>
  )
}

function EmptyReports({ caseId }: { caseId: string }) {
  return (
    <div className="card text-center py-12 max-w-md mx-auto">
      <div className="text-4xl mb-4">📄</div>
      <h2 className="text-lg font-semibold text-navy mb-2">Noch keine Berichte</h2>
      <p className="text-sm text-brand-muted mb-6">
        Erstelle einen Bericht, um deinen Fall strukturiert zusammenzufassen.
      </p>
      <Link to={`/app/cases/${caseId}/reports/new`} className="btn-primary !py-2 !px-5 !text-sm">
        Ersten Bericht erstellen
      </Link>
    </div>
  )
}
