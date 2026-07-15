/**
 * /student/cases/:id/reports — Berichtsliste (Layout wie Nutzer-Berichte).
 */
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import { studentApi } from '@/api/student'
import { TYPE_META } from './reportMeta'
import type { Report, ReportType } from '@/types'

const MAX = 20

export default function StudentReportsPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['student-reports', id], queryFn: () => studentApi.reports(id!), enabled: !!id })
  const del = useMutation({
    mutationFn: (rid: string) => studentApi.reportDelete(id!, rid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-reports', id] }),
  })

  const list = data?.reports ?? []
  const atLimit = list.length >= MAX

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-navy">Berichte</h1>
            <p className="mt-0.5 text-sm text-brand-muted">Strukturierte Auswertungen dieses Falls – als Übung.</p>
          </div>
          <div className="flex items-center gap-3">
            {list.length > 0 && (
              <span className={`text-xs ${atLimit ? 'font-medium text-red-500' : 'text-brand-muted'}`}>{list.length} / {MAX}</span>
            )}
            {atLimit ? (
              <span title="Maximum erreicht" className="btn-primary !cursor-not-allowed !py-2 !px-4 !text-sm opacity-40">+ Bericht erstellen</span>
            ) : (
              <Link to={`/student/cases/${id}/reports/new`} className="btn-primary !py-2 !px-4 !text-sm">+ Bericht erstellen</Link>
            )}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="card mx-auto max-w-md py-14 text-center">
            <h2 className="mb-2 text-lg font-semibold text-navy">Noch keine Berichte</h2>
            <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-brand-muted">
              Erstelle deinen ersten Bericht – als Kurzüberblick oder tiefe Musteranalyse.
            </p>
            <Link to={`/student/cases/${id}/reports/new`} className="btn-primary !py-2 !px-5 !text-sm">Ersten Bericht erstellen</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(r => (
              <ReportCard key={r.id} report={r} copyId={id!} onDelete={() => { if (window.confirm('Bericht löschen?')) del.mutate(r.id) }} />
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  )
}

function ReportCard({ report: r, copyId, onDelete }: { report: Report; copyId: string; onDelete: () => void }) {
  const meta = TYPE_META[r.report_type as ReportType] ?? TYPE_META.pattern
  const preview = r.content?.sections?.[0]?.text?.slice(0, 160).replace(/\n/g, ' ')
  return (
    <div className="overflow-hidden rounded-brand border border-brand-border bg-white transition-all hover:border-accent/30 hover:shadow-sm">
      <div className="flex items-stretch">
        <div className={`w-1 shrink-0 ${meta.bg} border-r ${meta.border}`} />
        <div className="min-w-0 flex-1 px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.bg} ${meta.color} ${meta.border}`}>{r.type_label}</span>
            <span className="text-[11px] text-brand-muted">
              {r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            </span>
          </div>
          <p className="mb-1 text-sm font-semibold text-navy">{r.title ?? r.type_label}</p>
          {preview && <p className="line-clamp-2 text-xs leading-relaxed text-brand-muted">{preview} …</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center gap-2 px-4 py-4">
          <Link to={`/student/cases/${copyId}/reports/${r.id}`} className="whitespace-nowrap text-xs font-semibold text-accent hover:text-navy transition-colors">Öffnen →</Link>
          <button onClick={onDelete} className="text-[11px] text-brand-muted/60 hover:text-red-500 transition-colors">Löschen</button>
        </div>
      </div>
    </div>
  )
}
