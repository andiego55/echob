/**
 * /institute/submissions/:id — Detail einer Einreichung (Snapshot) + KI-gestützte Bewertung.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import type { StudentNotes, Rubric, SubmissionScore } from '@/types'

const NOTE_LABELS: [keyof StudentNotes, string][] = [
  ['first_impressions', 'Erste Eindrücke'],
  ['key_scenes', 'Wichtige Szenen'],
  ['open_questions', 'Offene Fragen'],
  ['conversation_prompts', 'Gesprächsimpulse'],
  ['next_steps', 'Nächste Schritte'],
  ['free_text', 'Freitext'],
]

function fmt(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const emptyScores = (r: Rubric): SubmissionScore[] =>
  r.criteria.map(c => ({ key: c.key, name: c.name, max_points: c.max_points, points: 0, note: '' }))

export default function InstituteSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const [rubricId, setRubricId] = useState('')
  const [scores, setScores] = useState<SubmissionScore[]>([])
  const [savedOk, setSavedOk] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['institute-submission', id],
    queryFn: () => instituteApi.submission(id!),
    enabled: !!id,
  })
  const { data: rubrics = [] } = useQuery({ queryKey: ['institute-rubrics'], queryFn: () => instituteApi.rubrics() })

  useEffect(() => {
    if (!data) return
    if (data.feedback) setFeedback(data.feedback)
    if (data.rubric_id) setRubricId(data.rubric_id)
    if (data.scores && data.scores.length) setScores(data.scores)
  }, [data])

  const aiEval = useMutation({
    mutationFn: () => instituteApi.aiEvaluate(id!, rubricId),
    onSuccess: (res) => { setScores(res.scores); if (!feedback.trim()) setFeedback(res.feedback); setSavedOk(false) },
  })
  const review = useMutation({
    mutationFn: () => instituteApi.reviewSubmission(id!, {
      feedback: feedback.trim() || null,
      rubric_id: rubricId || null,
      scores: scores.length ? scores : undefined,
      total_points: scores.length ? scores.reduce((a, s) => a + s.points, 0) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institute-submission', id] })
      qc.invalidateQueries({ queryKey: ['institute-submissions'] })
      setSavedOk(true); setTimeout(() => setSavedOk(false), 2000)
    },
  })

  const pickRubric = (rid: string) => {
    setRubricId(rid)
    const r = rubrics.find(x => x.id === rid)
    setScores(r ? emptyScores(r) : [])
    setSavedOk(false)
  }
  const setScore = (i: number, patch: Partial<SubmissionScore>) =>
    setScores(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  if (isLoading || !data) {
    return <InstituteShell><div className="px-6 py-10 text-sm text-brand-muted">Lädt …</div></InstituteShell>
  }

  const p = data.payload
  const notes = p.notes
  const notesFilled = notes ? NOTE_LABELS.filter(([k]) => notes[k]) : []
  const isEmpty = p.hypotheses.length === 0 && notesFilled.length === 0 && p.reports.length === 0
  const total = scores.reduce((a, s) => a + s.points, 0)
  const maxTotal = scores.reduce((a, s) => a + s.max_points, 0)

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[820px] px-6 py-8 space-y-6">
        <button onClick={() => navigate('/institute/submissions')} className="text-xs text-brand-muted hover:text-navy transition-colors">
          ← Alle Einreichungen
        </button>

        <header className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-navy">{data.title || 'Fallbeispiel'}</h1>
              <p className="text-xs text-brand-muted mt-0.5">{data.student_name} · {fmt(data.created_at)}</p>
            </div>
            <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              data.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {data.status === 'reviewed' ? 'Gesichtet' : 'Neu'}
            </span>
          </div>
          {data.message && (
            <p className="mt-3 text-sm text-brand-text whitespace-pre-wrap border-t border-brand-border pt-3">{data.message}</p>
          )}
        </header>

        {isEmpty && (
          <p className="text-sm text-brand-muted">Diese Einreichung enthält noch keine ausgearbeiteten Inhalte.</p>
        )}

        {p.hypotheses.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-navy">Hypothesen</h2>
            {p.hypotheses.map((h, i) => (
              <div key={i} className="card">
                <p className="text-sm font-bold text-navy">{h.label}</p>
                <p className="mt-1 text-sm text-brand-text whitespace-pre-wrap leading-relaxed">{h.summary_text}</p>
              </div>
            ))}
          </section>
        )}

        {notesFilled.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-navy">Notizen</h2>
            <div className="card space-y-3">
              {notesFilled.map(([k, label]) => (
                <div key={k}>
                  <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-brand-text whitespace-pre-wrap">{notes![k]}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {p.reports.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-navy">Berichte</h2>
            {p.reports.map((r, i) => (
              <div key={i} className="card">
                <p className="text-sm font-bold text-navy">{r.title || r.type_label}</p>
                <p className="text-xs text-brand-muted">{r.type_label}</p>
                {r.sections.map((sec, j) => (
                  <div key={j} className="mt-3">
                    <p className="text-sm font-semibold text-navy">{sec.heading}</p>
                    <p className="mt-0.5 text-sm text-brand-text whitespace-pre-wrap leading-relaxed">{sec.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {/* Bewertung (Raster + KI-Vorschlag) */}
        <section className="card">
          <h2 className="text-sm font-semibold text-navy mb-2">Bewertung</h2>
          {rubrics.length === 0 ? (
            <p className="text-sm text-brand-muted">
              Noch kein Bewertungsraster angelegt. <Link to="/institute/rubrics" className="text-accent hover:underline">Raster anlegen →</Link>
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select value={rubricId} onChange={e => pickRubric(e.target.value)}
                  className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent">
                  <option value="">Raster wählen …</option>
                  {rubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={() => aiEval.mutate()} disabled={!rubricId || aiEval.isPending}
                  className="rounded-brand border border-accent bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40">
                  {aiEval.isPending ? 'KI wertet aus …' : '✨ KI-Auswertung vorschlagen'}
                </button>
                {aiEval.isError && <span className="text-xs text-red-600">Auswertung fehlgeschlagen.</span>}
              </div>
              <p className="mt-2 text-xs text-brand-muted">Die KI macht einen Vorschlag – du kannst jede Punktzahl und Begründung anpassen.</p>

              {scores.length > 0 && (
                <div className="mt-4 space-y-3">
                  {scores.map((s, i) => (
                    <div key={s.key} className="rounded-brand border border-brand-border p-3">
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
            </>
          )}
        </section>

        {/* Rückmeldung */}
        <section className="card">
          <h2 className="text-sm font-semibold text-navy mb-1.5">Rückmeldung an die:den Studierende:n</h2>
          <textarea
            rows={6}
            value={feedback}
            onChange={e => { setFeedback(e.target.value); setSavedOk(false) }}
            placeholder="Deine Rückmeldung zur Fallarbeit … (die KI-Auswertung kann diesen Text vorbefüllen)"
            className="w-full resize-y rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => review.mutate()} disabled={review.isPending} className="btn-primary !py-2 !px-4 !text-sm">
              {review.isPending ? 'Wird gesendet …' : data.status === 'reviewed' ? 'Bewertung aktualisieren' : 'Rückmeldung senden & sichten'}
            </button>
            {savedOk && <span className="text-xs font-medium text-green-600">✓ Gespeichert</span>}
            {review.isError && <span className="text-xs text-red-600">Speichern fehlgeschlagen.</span>}
          </div>
        </section>
      </div>
    </InstituteShell>
  )
}
