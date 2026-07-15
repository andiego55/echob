/**
 * /student/cases/:id/reports/:reportId — Bericht ansehen/bearbeiten (Layout wie Nutzer).
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import { Spinner } from '@/components/auth/StudentRoute'
import { studentApi } from '@/api/student'
import { TYPE_META } from './reportMeta'
import type { ReportType } from '@/types'

export default function StudentReportDetailPage() {
  const { id, reportId } = useParams<{ id: string; reportId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<{ heading: string; text: string }[]>([])

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['student-report', reportId],
    queryFn: () => studentApi.report(id!, reportId!),
    enabled: !!id && !!reportId,
  })

  const save = useMutation({
    mutationFn: () => studentApi.reportUpdate(id!, reportId!, values),
    onSuccess: (r) => { qc.setQueryData(['student-report', reportId], r); setEditing(false) },
  })
  const del = useMutation({
    mutationFn: () => studentApi.reportDelete(id!, reportId!),
    onSuccess: () => navigate(`/student/cases/${id}/reports`, { replace: true }),
  })

  if (isLoading) return <Spinner />
  if (isError || !report) {
    return (
      <StudentShell>
        <StudentCaseNav copyId={id!} />
        <div className="mx-auto max-w-[820px] px-6 py-10"><p className="text-sm text-red-600">Bericht nicht gefunden.</p></div>
      </StudentShell>
    )
  }

  const meta = TYPE_META[report.report_type as ReportType] ?? TYPE_META.pattern
  const sections = report.content?.sections ?? []

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[820px] px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-brand-border pb-5">
          <div className="flex-1">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color} ${meta.border}`}>{report.type_label}</span>
            <h1 className="mt-3 text-[1.35rem] font-bold leading-snug text-navy">{report.title ?? report.type_label}</h1>
            <p className="mt-1.5 text-xs text-brand-muted">{sections.length} Abschnitte</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            {sections.length > 0 && !editing && (
              <button
                onClick={() => { setValues(sections.map(s => ({ heading: s.heading, text: s.text }))); setEditing(true) }}
                className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-brand-muted hover:text-navy transition-colors"
              >
                Bearbeiten
              </button>
            )}
            <Link to={`/student/cases/${id}/reports`} className="px-3 py-1.5 text-xs font-medium text-brand-muted no-underline hover:text-navy transition-colors">← Übersicht</Link>
          </div>
        </div>

        <div className="mb-6 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-amber-800">{report.disclaimer}</p>
        </div>

        {editing ? (
          <div className="space-y-5">
            {values.map((sec, i) => (
              <div key={i} className={`space-y-3 rounded-brand border p-5 ${meta.border} ${meta.bg}`}>
                <input
                  className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm font-bold text-navy focus:outline-none focus:ring-1 focus:ring-accent"
                  value={sec.heading}
                  onChange={e => { const n = [...values]; n[i] = { ...n[i], heading: e.target.value }; setValues(n) }}
                />
                <textarea
                  rows={8}
                  className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-accent"
                  value={sec.text}
                  onChange={e => { const n = [...values]; n[i] = { ...n[i], text: e.target.value }; setValues(n) }}
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary !py-2 !px-4 !text-sm">
                {save.isPending ? 'Speichern …' : 'Änderungen speichern'}
              </button>
              <button onClick={() => { setEditing(false); setValues([]) }} className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy">Abbrechen</button>
              {save.isError && <p className="self-center text-xs text-red-600">Speichern fehlgeschlagen.</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {sections.map((s, i) => (
              <div key={i} className={`rounded-brand border p-5 ${meta.border} ${meta.bg}`}>
                <h2 className="mb-2 text-sm font-bold text-navy">{s.heading}</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{s.text}</p>
              </div>
            ))}
          </div>
        )}

        {!editing && (
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-brand-border pt-6">
            <Link to={`/student/cases/${id}/reports`} className="text-sm text-brand-muted no-underline hover:text-navy transition-colors">← Zurück</Link>
            <button onClick={() => { if (window.confirm('Bericht löschen?')) del.mutate() }} disabled={del.isPending} className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-40">
              {del.isPending ? 'Wird gelöscht …' : 'Bericht löschen'}
            </button>
          </div>
        )}
      </div>
    </StudentShell>
  )
}
