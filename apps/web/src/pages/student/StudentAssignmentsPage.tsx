/**
 * /student/assignments — zugewiesene Aufgaben, Reflexionen und Ressourcen (Inbox).
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import { studentApi } from '@/api/student'
import type { StudentAssignment, AssignmentKind, AssignmentStatus } from '@/types'

const KIND_LABEL: Record<AssignmentKind, string> = { task: 'Aufgabe', reflection: 'Reflexion', resource: 'Ressource' }
const KIND_CLS: Record<AssignmentKind, string> = {
  task: 'bg-accent/10 text-accent', reflection: 'bg-violet-100 text-violet-700', resource: 'bg-slate-100 text-slate-600',
}
const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: 'Offen', in_progress: 'In Arbeit', submitted: 'Eingereicht', reviewed: 'Bewertet',
}

export default function StudentAssignmentsPage() {
  const { data: items = [], isLoading } = useQuery({ queryKey: ['student-assignments'], queryFn: () => studentApi.assignments() })
  const open = items.filter(a => a.status === 'assigned' || a.status === 'in_progress')
  const done = items.filter(a => a.status === 'submitted' || a.status === 'reviewed')

  return (
    <StudentShell>
      <div className="mx-auto max-w-[820px] px-6 py-8 space-y-6">
        <header>
          <h1 className="text-xl font-bold text-navy">Aufgaben</h1>
          <p className="mt-1 text-sm text-brand-muted">Von deinem Ausbildungsinstitut zugewiesen. Offene zuerst.</p>
        </header>

        {isLoading ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : items.length === 0 ? (
          <div className="card text-sm text-brand-muted">Aktuell sind dir keine Aufgaben zugewiesen.</div>
        ) : (
          <>
            {open.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-navy">Braucht Aufmerksamkeit</h2>
                {open.map(a => <AssignmentCard key={a.id} a={a} />)}
              </section>
            )}
            {done.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-navy">Erledigt</h2>
                {done.map(a => <AssignmentCard key={a.id} a={a} />)}
              </section>
            )}
          </>
        )}
      </div>
    </StudentShell>
  )
}

function AssignmentCard({ a }: { a: StudentAssignment }) {
  const qc = useQueryClient()
  const [text, setText] = useState(a.response?.text ?? '')
  const isResource = a.kind === 'resource'
  const locked = a.status === 'reviewed'

  const respond = useMutation({
    mutationFn: (submit: boolean) => studentApi.assignmentRespond(a.id, text, submit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-assignments'] }),
  })

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_CLS[a.kind]}`}>{KIND_LABEL[a.kind]}</span>
          <p className="truncate text-sm font-semibold text-navy">{a.title}</p>
        </div>
        <span className="shrink-0 text-[11px] text-brand-muted">{STATUS_LABEL[a.status]}</span>
      </div>

      {a.instructions && <p className="mt-2 text-sm text-brand-text whitespace-pre-wrap">{a.instructions}</p>}
      {a.payload.link && (
        <a href={a.payload.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-accent hover:underline">{a.payload.link} ↗</a>
      )}

      {!isResource && (
        <div className="mt-3">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} disabled={locked}
            placeholder="Deine Antwort …"
            className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60" />
          {!locked && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button onClick={() => respond.mutate(true)} disabled={respond.isPending || !text.trim()} className="btn-primary !py-1.5 !px-4 !text-sm disabled:opacity-40">
                {respond.isPending ? 'Sende …' : a.status === 'submitted' ? 'Erneut einreichen' : 'Einreichen'}
              </button>
              <button onClick={() => respond.mutate(false)} disabled={respond.isPending || !text.trim()} className="text-sm text-brand-muted hover:text-navy disabled:opacity-40">
                Zwischenspeichern
              </button>
              {respond.isSuccess && <span className="text-xs font-medium text-green-600">✓ Gespeichert</span>}
            </div>
          )}
        </div>
      )}

      {a.scores && a.scores.length > 0 && (
        <div className="mt-3 rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide">Bewertung</p>
            <p className="text-sm font-semibold text-navy tabular-nums">
              {a.total_points ?? a.scores.reduce((x, s) => x + s.points, 0)} / {a.scores.reduce((x, s) => x + s.max_points, 0)} Punkte
            </p>
          </div>
          <div className="space-y-1.5">
            {a.scores.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-navy">{s.name}</span>
                <span className="shrink-0 text-xs font-semibold text-accent tabular-nums">{s.points}/{s.max_points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {a.feedback && (
        <div className="mt-3 rounded-brand border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="text-[11px] font-semibold text-accent uppercase tracking-wide mb-1">Rückmeldung des Ausbilders</p>
          <p className="text-sm text-brand-text whitespace-pre-wrap">{a.feedback}</p>
        </div>
      )}
    </div>
  )
}
