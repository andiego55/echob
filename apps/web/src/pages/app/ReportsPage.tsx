/**
 * /app/cases/:caseId/reports — Berichtsliste
 */
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { reportsApi } from '@/api/reports'
import type { Report } from '@/types'

export default function ReportsPage() {
  const { caseId } = useParams<{ caseId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['reports', caseId],
    queryFn: () => reportsApi.list(caseId!),
    enabled: !!caseId,
  })

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
          <Link
            to={`/app/cases/${caseId}/reports/new`}
            className="btn-primary !py-2 !px-4 !text-sm"
          >
            + Bericht erstellen
          </Link>
        </div>

        {isLoading && <p className="text-sm text-brand-muted">Wird geladen …</p>}

        {data && data.reports.length === 0 && <EmptyReports caseId={caseId!} />}

        {data && data.reports.length > 0 && (
          <div className="space-y-3">
            {data.reports.map((r) => (
              <ReportRow key={r.id} report={r} caseId={caseId!} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function ReportRow({ report: r, caseId }: { report: Report; caseId: string }) {
  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="label">{r.type_label}</span>
          {r.status === 'draft' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-border text-brand-muted">Entwurf</span>
          )}
        </div>
        <p className="text-sm font-semibold text-navy">{r.title ?? r.type_label}</p>
        <p className="text-xs text-brand-muted mt-0.5">
          {new Date(r.created_at).toLocaleDateString('de-DE', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
        </p>
      </div>
      <Link
        to={`/app/cases/${caseId}/reports/${r.id}`}
        className="btn-outline !py-1.5 !px-4 !text-xs flex-shrink-0"
      >
        Öffnen
      </Link>
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
