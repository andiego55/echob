/**
 * /app/cases/:caseId/reports — Berichtsliste
 */
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { reportsApi } from '@/api/reports'
import type { Report, ReportType } from '@/types'

const MAX_REPORTS = 20

const TYPE_META: Record<ReportType, { icon: string; color: string; bg: string; border: string }> = {
  short:        { icon: '⚡', color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200' },
  pattern:      { icon: '🔍', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  coaching_prep:{ icon: '🎯', color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  therapy_prep: { icon: '🏥', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  progress:     { icon: '📈', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
}

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

  const handleDelete = (reportId: string, label: string) => {
    if (window.confirm(`Bericht „${label}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      deleteMutation.mutate(reportId)
    }
  }

  const count = data?.reports.length ?? 0
  const atLimit = count >= MAX_REPORTS

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[900px] px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-navy">Berichte</h1>
            <p className="text-sm text-brand-muted mt-0.5">
              Strukturierte Auswertungen für Selbstreflexion, Coaching oder professionelle Begleitung.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
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
              <Link to={`/app/cases/${caseId}/reports/new`} className="btn-primary !py-2 !px-4 !text-sm">
                + Bericht erstellen
              </Link>
            )}
          </div>
        </div>

        {atLimit && (
          <div className="mb-5 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Maximale Anzahl von {MAX_REPORTS} Berichten erreicht. Lösche einen Bericht, um einen neuen zu erstellen.
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-brand-muted py-8">Wird geladen …</p>
        )}

        {data && data.reports.length === 0 && (
          <EmptyReports caseId={caseId!} />
        )}

        {data && data.reports.length > 0 && (
          <div className="space-y-3">
            {data.reports.map((r) => (
              <ReportCard
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

// ── Report-Card ───────────────────────────────────────────────────────────────

function ReportCard({ report: r, caseId, onDelete, isDeleting }: {
  report: Report
  caseId: string
  onDelete: (id: string, label: string) => void
  isDeleting: boolean
}) {
  const meta = TYPE_META[r.report_type as ReportType] ?? TYPE_META.pattern
  const firstSection = r.content?.sections?.[0]
  const previewText = firstSection?.text?.slice(0, 160).replace(/\n/g, ' ')
  const label = r.title ?? r.type_label

  return (
    <div className="rounded-brand border border-brand-border bg-white hover:border-accent/30 hover:shadow-sm transition-all overflow-hidden">
      <div className="flex items-stretch gap-0">

        {/* Farbiger Seitenstreifen */}
        <div className={`w-1 flex-shrink-0 ${meta.bg} border-r ${meta.border}`} />

        <div className="flex-1 px-5 py-4 min-w-0">
          {/* Typ-Badge + Datum */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} ${meta.border} border`}>
              {meta.icon} {r.type_label}
            </span>
            <span className="text-[11px] text-brand-muted">
              {new Date(r.created_at).toLocaleDateString('de-DE', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          </div>

          {/* Titel */}
          <p className="text-sm font-semibold text-navy leading-snug mb-1">{label}</p>

          {/* Preview-Text */}
          {previewText && (
            <p className="text-xs text-brand-muted line-clamp-2 leading-relaxed">
              {previewText}{previewText.length >= 160 ? ' …' : ''}
            </p>
          )}
        </div>

        {/* Aktionen */}
        <div className="flex flex-col items-end justify-center gap-2 px-4 py-4 flex-shrink-0">
          <Link
            to={`/app/cases/${caseId}/reports/${r.id}`}
            className="text-xs font-semibold text-accent hover:text-navy transition-colors whitespace-nowrap"
          >
            Öffnen →
          </Link>
          <button
            onClick={() => onDelete(r.id, label)}
            disabled={isDeleting}
            className="text-[11px] text-brand-muted/60 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            {isDeleting ? '…' : 'Löschen'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyReports({ caseId }: { caseId: string }) {
  return (
    <div className="card text-center py-14 max-w-md mx-auto">
      <div className="text-4xl mb-4">📄</div>
      <h2 className="text-lg font-semibold text-navy mb-2">Noch keine Berichte</h2>
      <p className="text-sm text-brand-muted mb-2 leading-relaxed max-w-xs mx-auto">
        Erstelle deinen ersten Bericht — als kompakte Übersicht, tiefe Musteranalyse oder Vorbereitung für professionelle Hilfe.
      </p>
      <p className="text-xs text-brand-muted mb-6">
        Tipp: Bestätige zuerst mindestens eine Szene, damit Echo genug Material hat.
      </p>
      <Link to={`/app/cases/${caseId}/reports/new`} className="btn-primary !py-2 !px-5 !text-sm">
        Ersten Bericht erstellen
      </Link>
    </div>
  )
}
