/**
 * /institute/assignments/:id — Aufgabe zuweisen + eingereichte Antworten mit Rückmeldung.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import { KindBadge, KIND_LABEL } from './InstituteAssignmentsPage'
import type { StudentAssignmentRow, AssignmentStatus, AssignmentDetail, AssignmentKind, Rubric, SubmissionScore } from '@/types'

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
  const [editing, setEditing] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['institute-assignment', id], queryFn: () => instituteApi.assignment(id!), enabled: !!id })
  const { data: studentsData } = useQuery({ queryKey: ['institute-students'], queryFn: () => instituteApi.listStudents() })
  const { data: rubrics = [] } = useQuery({ queryKey: ['institute-rubrics'], queryFn: () => instituteApi.rubrics() })

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
          {editing ? (
            <AssignmentEditForm
              data={data}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false)
                qc.invalidateQueries({ queryKey: ['institute-assignment', id] })
                qc.invalidateQueries({ queryKey: ['institute-assignments'] })
              }}
            />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><KindBadge kind={data.kind} /><h1 className="text-lg font-bold text-navy">{data.title}</h1></div>
                {data.instructions && <p className="mt-2 text-sm text-brand-text whitespace-pre-wrap">{data.instructions}</p>}
                {data.payload.link && (
                  <a href={data.payload.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-accent hover:underline">{data.payload.link} ↗</a>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button onClick={() => setEditing(true)} className="text-xs font-medium text-accent hover:text-navy transition-colors">Bearbeiten</button>
                <button onClick={() => { if (window.confirm('Diese Aufgabe löschen? Alle Zuweisungen gehen verloren.')) del.mutate() }}
                  className="text-xs text-brand-muted hover:text-red-600 transition-colors">Löschen</button>
              </div>
            </div>
          )}
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
                <button onClick={() => { if (window.confirm('Diese Aufgabe allen aktiven Studierenden zuweisen?')) assign.mutate({ to_all: true }) }} disabled={assign.isPending}
                  className="rounded-brand border border-brand-border px-4 py-1.5 text-sm font-medium text-navy transition-colors hover:border-accent hover:text-accent disabled:opacity-40">
                  Der ganzen Kohorte zuweisen
                </button>
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
            data.students.map(s => <ResponseCard key={s.id} row={s} assignmentId={id!} rubrics={rubrics} defaultRubricId={data.rubric_id ?? null} />)
          )}
        </section>
      </div>
    </InstituteShell>
  )
}

const EDIT_KINDS: AssignmentKind[] = ['task', 'reflection', 'resource']

function AssignmentEditForm({ data, onCancel, onSaved }: { data: AssignmentDetail; onCancel: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<AssignmentKind>(data.kind)
  const [title, setTitle] = useState(data.title)
  const [instructions, setInstructions] = useState(data.instructions ?? '')
  const [link, setLink] = useState(data.payload?.link ?? '')
  const [due, setDue] = useState(data.due_on ?? '')

  const save = useMutation({
    // rubric_id + status werden bewusst mitgeschickt, damit das PATCH sie nicht nullt.
    mutationFn: () => instituteApi.assignmentUpdate(data.id, {
      kind, title: title.trim(), instructions: instructions.trim() || null,
      link: kind === 'resource' ? (link.trim() || null) : null,
      due_on: due || null, rubric_id: data.rubric_id, status: data.status,
    }),
    onSuccess: onSaved,
  })

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-navy">Aufgabe bearbeiten</h2>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-brand-text">Typ</label>
        <div className="flex flex-wrap gap-2">
          {EDIT_KINDS.map(k => (
            <button key={k} onClick={() => setKind(k)}
              className={`rounded-brand border px-3 py-1.5 text-sm font-medium transition-colors ${kind === k ? 'border-accent bg-accent/5 text-navy' : 'border-brand-border text-brand-muted hover:border-accent/50'}`}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">Titel</label>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
          className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">{kind === 'resource' ? 'Beschreibung' : 'Aufgabenstellung'}</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={8}
          className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent" />
      </div>
      {kind === 'resource' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-text">Link (optional)</label>
          <input value={link} onChange={e => setLink(e.target.value)} maxLength={1000} placeholder="https://…"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">Frist (optional)</label>
        <input type="date" value={due} onChange={e => setDue(e.target.value)}
          className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div className="flex items-center gap-3 border-t border-brand-border pt-3">
        <button onClick={() => save.mutate()} disabled={!title.trim() || save.isPending} className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-40">
          {save.isPending ? 'Speichern …' : 'Speichern'}
        </button>
        <button onClick={onCancel} disabled={save.isPending} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
        {save.isError && <span className="text-xs text-red-600">Speichern fehlgeschlagen.</span>}
      </div>
    </div>
  )
}

const emptyScores = (r: Rubric): SubmissionScore[] =>
  r.criteria.map(c => ({ key: c.key, name: c.name, max_points: c.max_points, points: 0, note: '' }))

function ResponseCard({ row, assignmentId, rubrics, defaultRubricId }: {
  row: StudentAssignmentRow; assignmentId: string; rubrics: Rubric[]; defaultRubricId: string | null
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState(row.feedback ?? '')
  const [rubricId, setRubricId] = useState(defaultRubricId ?? '')
  const [scores, setScores] = useState<SubmissionScore[]>(row.scores ?? [])

  const aiEval = useMutation({
    mutationFn: () => instituteApi.aiEvaluateAssignment(row.id, rubricId),
    onSuccess: (res) => { setScores(res.scores); if (!feedback.trim()) setFeedback(res.feedback) },
  })
  const review = useMutation({
    mutationFn: () => instituteApi.reviewStudentAssignment(row.id, {
      feedback: feedback.trim() || null,
      scores: scores.length ? scores : undefined,
      total_points: scores.length ? scores.reduce((a, s) => a + s.points, 0) : null,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-assignment', assignmentId] }),
  })

  const pickRubric = (rid: string) => {
    setRubricId(rid)
    const r = rubrics.find(x => x.id === rid)
    setScores(r ? emptyScores(r) : [])
  }
  const setScore = (i: number, patch: Partial<SubmissionScore>) => setScores(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const hasResponse = !!row.response?.text
  const total = scores.reduce((a, s) => a + s.points, 0)
  const maxTotal = scores.reduce((a, s) => a + s.max_points, 0)

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
        <div className="mt-3 space-y-4 border-t border-brand-border pt-3">
          {hasResponse ? (
            <div>
              <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide mb-1">Antwort</p>
              <p className="text-sm text-brand-text whitespace-pre-wrap">{row.response!.text}</p>
            </div>
          ) : (
            <p className="text-sm text-brand-muted">Noch keine Antwort eingereicht.</p>
          )}

          {rubrics.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide mb-1.5">Bewertung</p>
              <div className="flex flex-wrap items-center gap-2">
                <select value={rubricId} onChange={e => pickRubric(e.target.value)}
                  className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent">
                  <option value="">Raster wählen …</option>
                  {rubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={() => aiEval.mutate()} disabled={!rubricId || !hasResponse || aiEval.isPending}
                  className="rounded-brand border border-accent bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40">
                  {aiEval.isPending ? 'KI wertet aus …' : '✨ KI-Auswertung vorschlagen'}
                </button>
                {aiEval.isError && <span className="text-xs text-red-600">Auswertung fehlgeschlagen.</span>}
              </div>
              {scores.length > 0 && (
                <div className="mt-3 space-y-2">
                  {scores.map((s, i) => (
                    <div key={s.key} className="rounded-brand border border-brand-border p-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-navy">{s.name}</p>
                        <div className="flex shrink-0 items-center gap-1.5 text-sm">
                          <input type="number" min={0} max={s.max_points} value={s.points}
                            onChange={e => setScore(i, { points: Math.max(0, Math.min(s.max_points, Number(e.target.value) || 0)) })}
                            className="w-14 rounded-brand border border-brand-border bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-accent" />
                          <span className="text-brand-muted tabular-nums">/ {s.max_points}</span>
                        </div>
                      </div>
                      <textarea value={s.note} onChange={e => setScore(i, { note: e.target.value })} rows={2} placeholder="Begründung …"
                        className="mt-2 w-full resize-y rounded-brand border border-brand-border bg-white px-2.5 py-1.5 text-xs text-brand-text outline-none focus:border-accent" />
                    </div>
                  ))}
                  <div className="flex justify-end text-sm font-semibold text-navy tabular-nums">Gesamt: {total} / {maxTotal} Punkte</div>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide mb-1">Rückmeldung</p>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Deine Rückmeldung … (die KI-Auswertung kann diesen Text vorbefüllen)"
              className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
            <div className="mt-2 flex items-center gap-3">
              <button onClick={() => review.mutate()} disabled={review.isPending} className="btn-primary !py-1.5 !px-4 !text-sm">
                {review.isPending ? 'Senden …' : row.status === 'reviewed' ? 'Bewertung aktualisieren' : 'Rückmeldung senden'}
              </button>
              {review.isSuccess && <span className="text-xs font-medium text-green-600">✓ Gesendet</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
