/**
 * /student/cases/:id/submit — Fallarbeit an das Ausbildungsinstitut senden.
 * Reicht einen Snapshot (Hypothesen + Notizen + Berichte) beim Ausbilder ein;
 * frühere Einreichungen zeigen Status und Rückmeldung.
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import { studentApi } from '@/api/student'

function fmt(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function StudentSubmitPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [message, setMessage] = useState('')

  const { data: submissions = [] } = useQuery({
    queryKey: ['student-submissions', id],
    queryFn: () => studentApi.submissions(id!),
    enabled: !!id,
  })

  const submit = useMutation({
    mutationFn: () => studentApi.submit(id!, message.trim() || null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-submissions', id] }); setMessage('') },
  })

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[820px] px-6 py-8 space-y-6">
        <header>
          <h1 className="text-xl font-bold text-navy">An Institut senden</h1>
          <p className="mt-1 text-sm text-brand-muted max-w-2xl">
            Reiche deine Fallarbeit beim Ausbildungsinstitut ein. Übermittelt wird ein Abbild deiner aktuellen
            Arbeit an diesem Fall – <strong className="text-navy">Hypothesen, Notizen und Berichte</strong>.
            Der Echo-Gesprächsverlauf bleibt bei dir.
          </p>
        </header>

        {/* Compose */}
        <div className="card">
          <label className="mb-1.5 block text-sm font-medium text-navy">Begleitnachricht (optional)</label>
          <textarea
            rows={4}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Woran hast du gearbeitet? Worauf soll der Ausbilder besonders schauen?"
            className="w-full resize-y rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="btn-primary !py-2 !px-4 !text-sm"
            >
              {submit.isPending ? 'Wird gesendet …' : 'An Institut senden'}
            </button>
            {submit.isSuccess && <span className="text-xs font-medium text-green-600">✓ Eingereicht</span>}
            {submit.isError && <span className="text-xs text-red-600">Senden fehlgeschlagen.</span>}
          </div>
        </div>

        {/* Verlauf */}
        <div>
          <h2 className="text-sm font-semibold text-navy mb-2">Bisherige Einreichungen</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-brand-muted">Noch nichts eingereicht.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map(s => (
                <div key={s.id} className="card">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-brand-muted">{fmt(s.created_at)}</p>
                    <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      s.status === 'reviewed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {s.status === 'reviewed' ? 'Gesichtet' : 'Eingereicht'}
                    </span>
                  </div>
                  {s.message && <p className="mt-2 text-sm text-brand-text whitespace-pre-wrap">{s.message}</p>}
                  {s.scores && s.scores.length > 0 && (
                    <div className="mt-3 rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide">Bewertung</p>
                        <p className="text-sm font-semibold text-navy tabular-nums">
                          {s.total_points ?? s.scores.reduce((a, sc) => a + sc.points, 0)} / {s.scores.reduce((a, sc) => a + sc.max_points, 0)} Punkte
                        </p>
                      </div>
                      <div className="space-y-2">
                        {s.scores.map((sc, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-navy">{sc.name}</span>
                              <span className="shrink-0 text-xs font-semibold text-accent tabular-nums">{sc.points}/{sc.max_points}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-border/60">
                              <div className="h-full rounded-full bg-accent" style={{ width: `${sc.max_points > 0 ? (sc.points / sc.max_points) * 100 : 0}%` }} />
                            </div>
                            {sc.note && <p className="mt-1 text-xs text-brand-muted">{sc.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {s.feedback && (
                    <div className="mt-3 rounded-brand border border-accent/30 bg-accent/5 px-4 py-3">
                      <p className="text-[11px] font-semibold text-accent uppercase tracking-wide mb-1">Rückmeldung des Ausbilders</p>
                      <p className="text-sm text-brand-text whitespace-pre-wrap">{s.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentShell>
  )
}
