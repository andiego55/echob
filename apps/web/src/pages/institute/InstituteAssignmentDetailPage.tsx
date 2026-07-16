/**
 * /institute/assignments/:id — Aufgabe zuweisen + eingereichte Antworten mit Rückmeldung.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import { KindBadge } from './InstituteAssignmentsPage'
import type { StudentAssignmentRow, AssignmentStatus } from '@/types'

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: 'Zugewiesen', in_progress: 'In Arbeit', submitted: 'Eingereicht', reviewed: 'Gesichtet',
}
const STATUS_CLS: Record<AssignmentStatus, string> = {
  assigned: 'bg-slate-100 text-slate-600', in_progress: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700', reviewed: 'bg-green-100 text-green-700',
}

export default function InstituteAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [picked, setPicked] = useState<string[]>([])

  const { data, isLoading } = useQuery({ queryKey: ['institute-assignment', id], queryFn: () => instituteApi.assignment(id!), enabled: !!id })
  const { data: studentsData } = useQuery({ queryKey: ['institute-students'], queryFn: () => instituteApi.listStudents() })

  const del = useMutation({
    mutationFn: () => instituteApi.assignmentDelete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institute-assignments'] }); navigate('/institute/assignments') },
  })
  const assign = useMutation({
    mutationFn: (v: { student_ids?: string[]; to_all?: boolean }) => instituteApi.assignmentAssign(id!, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institute-assignment', id] }); setPicked([]) },
  })

  if (isLoading || !data) {
    return <InstituteShell><div className="px-6 py-10 text-sm text-brand-muted">Lädt …</div></InstituteShell>
  }

  const assignedIds = new Set(data.students.map(s => s.student_id))
  const unassigned = (studentsData?.students ?? []).filter(s => !assignedIds.has(s.id))
  const toggle = (sid: string) => setPicked(p => p.includes(sid) ? p.filter(x => x !== sid) : [...p, sid])

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[820px] px-6 py-8 space-y-6">
        <button onClick={() => navigate('/institute/assignments')} className="text-xs text-brand-muted hover:text-navy transition-colors">← Alle Aufgaben</button>

        <header className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><KindBadge kind={data.kind} /><h1 className="text-lg font-bold text-navy">{data.title}</h1></div>
              {data.instructions && <p className="mt-2 text-sm text-brand-text whitespace-pre-wrap">{data.instructions}</p>}
              {data.payload.link && (
                <a href={data.payload.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-accent hover:underline">{data.payload.link} ↗</a>
              )}
            </div>
            <button onClick={() => { if (window.confirm('Diese Aufgabe löschen? Alle Zuweisungen gehen verloren.')) del.mutate() }}
              className="shrink-0 text-xs text-brand-muted hover:text-red-600">Löschen</button>
          </div>
        </header>

        {/* Zuweisen */}
        <section className="card">
          <h2 className="text-sm font-bold text-navy mb-2">Zuweisen</h2>
          {unassigned.length === 0 ? (
            <p className="text-sm text-brand-muted">Allen aktiven Studierenden zugewiesen.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(s => (
                  <button key={s.id} onClick={() => toggle(s.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${picked.includes(s.id) ? 'border-accent bg-accent/10 text-accent' : 'border-brand-border text-brand-muted hover:border-accent/50'}`}>
                    {s.display_name || 'Studierende:r'}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button onClick={() => assign.mutate({ student_ids: picked })} disabled={picked.length === 0 || assign.isPending}
                  className="btn-primary !py-1.5 !px-4 !text-sm disabled:opacity-40">
                  {assign.isPending ? 'Zuweisen …' : `Ausgewählte zuweisen (${picked.length})`}
                </button>
                <button onClick={() => assign.mutate({ to_all: true })} disabled={assign.isPending}
                  className="text-sm text-brand-muted hover:text-accent">Allen zuweisen</button>
              </div>
            </>
          )}
        </section>

        {/* Antworten */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-navy">Zuweisungen &amp; Antworten ({data.students.length})</h2>
          {data.students.length === 0 ? (
            <div className="card text-sm text-brand-muted">Noch niemandem zugewiesen.</div>
          ) : (
            data.students.map(s => <ResponseCard key={s.id} row={s} assignmentId={id!} />)
          )}
        </section>
      </div>
    </InstituteShell>
  )
}

function ResponseCard({ row, assignmentId }: { row: StudentAssignmentRow; assignmentId: string }) {
  const qc = useQueryClient()
  const [feedback, setFeedback] = useState(row.feedback ?? '')
  const [open, setOpen] = useState(false)
  const review = useMutation({
    mutationFn: () => instituteApi.reviewStudentAssignment(row.id, feedback.trim() || null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-assignment', assignmentId] }),
  })
  const hasResponse = !!row.response?.text

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-navy truncate">{row.student_name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[row.status]}`}>{STATUS_LABEL[row.status]}</span>
        </div>
        {(hasResponse || row.feedback) && (
          <button onClick={() => setOpen(o => !o)} className="shrink-0 text-xs text-accent hover:underline">{open ? 'Zuklappen' : 'Öffnen'}</button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-brand-border pt-3">
          {hasResponse ? (
            <div>
              <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide mb-1">Antwort</p>
              <p className="text-sm text-brand-text whitespace-pre-wrap">{row.response!.text}</p>
            </div>
          ) : (
            <p className="text-sm text-brand-muted">Noch keine Antwort eingereicht.</p>
          )}
          <div>
            <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide mb-1">Rückmeldung</p>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Deine Rückmeldung …"
              className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
            <div className="mt-2 flex items-center gap-3">
              <button onClick={() => review.mutate()} disabled={review.isPending} className="btn-primary !py-1.5 !px-4 !text-sm">
                {review.isPending ? 'Senden …' : row.status === 'reviewed' ? 'Rückmeldung aktualisieren' : 'Rückmeldung senden'}
              </button>
              {review.isSuccess && <span className="text-xs font-medium text-green-600">✓ Gesendet</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
