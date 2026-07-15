/**
 * /student/cases/:id/reports/new — Berichtstyp wählen → Echo generiert (Layout wie Nutzer).
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import { studentApi } from '@/api/student'
import { REPORT_TYPES } from './reportMeta'
import type { ReportType } from '@/types'

export default function StudentReportNewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<ReportType | null>(null)

  const gen = useMutation({
    mutationFn: (type: ReportType) => studentApi.reportCreate(id!, { report_type: type }),
    onSuccess: (rep) => navigate(`/student/cases/${id}/reports/${rep.id}`, { replace: true }),
  })

  if (gen.isPending) {
    return (
      <StudentShell>
        <StudentCaseNav copyId={id!} />
        <div className="mx-auto flex max-w-[600px] flex-col items-center px-6 py-24 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-border border-t-accent" />
          <h1 className="mt-6 text-lg font-bold text-navy">Bericht wird erstellt …</h1>
          <p className="mt-2 text-sm text-brand-muted">Echo wertet den Fall aus. Das dauert einen Moment.</p>
        </div>
      </StudentShell>
    )
  }

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[820px] px-6 py-8">
        <Link to={`/student/cases/${id}/reports`} className="text-sm text-brand-muted no-underline hover:text-navy">← Zurück zu den Berichten</Link>
        <h1 className="mt-4 text-xl font-bold text-navy">Bericht erstellen</h1>
        <p className="mt-1 text-sm text-brand-muted">Wähle einen Berichtstyp – Echo erzeugt ihn aus dem Fallmaterial.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {REPORT_TYPES.map(t => (
            <button
              key={t.type}
              type="button"
              onClick={() => { setSelected(t.type); gen.mutate(t.type) }}
              className={`rounded-brand border-2 p-5 text-left transition-all ${
                selected === t.type ? 'border-accent bg-accent/5' : 'border-brand-border bg-white hover:border-accent/40 hover:bg-brand-bg'
              }`}
            >
              <p className="text-sm font-bold text-navy">{t.label}</p>
              <p className="mt-0.5 text-[11px] font-medium text-accent">{t.tagline}</p>
              <p className="mt-2 text-xs leading-relaxed text-brand-muted">{t.desc}</p>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-brand-muted/70">{t.sections} Abschnitte · {t.audience}</p>
            </button>
          ))}
        </div>

        {gen.isError && (
          <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            Bericht konnte nicht erstellt werden. Bitte versuche es erneut.
          </p>
        )}
      </div>
    </StudentShell>
  )
}
