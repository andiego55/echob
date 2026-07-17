/**
 * /student/modules/:id — ein Lernmodul durcharbeiten (Lektionen lesen, als erledigt markieren).
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { studentApi } from '@/api/student'
import type { QuizQuestion } from '@/types'

const STEP_KIND_LABEL: Record<string, string> = { lesson: 'Lektion', case: 'Fall', assignment: 'Aufgabe' }
const STEP_KIND_CLS: Record<string, string> = {
  lesson: 'bg-slate-100 text-slate-600', case: 'bg-accent/10 text-accent', assignment: 'bg-violet-100 text-violet-700',
}

export default function StudentModuleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['student-module', id], queryFn: () => studentApi.module(id!), enabled: !!id })
  const complete = useMutation({
    mutationFn: ({ stepId, done }: { stepId: string; done: boolean }) => studentApi.moduleStepComplete(id!, stepId, done),
    onSuccess: (res) => {
      qc.setQueryData(['student-module', id], (prev: typeof data) => prev ? { ...prev, completed_steps: res.completed_steps, status: res.status } : prev)
      qc.invalidateQueries({ queryKey: ['student-modules'] })
    },
  })

  if (isLoading || !data) {
    return <StudentShell><div className="px-6 py-10 text-sm text-brand-muted">Lädt …</div></StudentShell>
  }

  const doneSet = new Set(data.completed_steps)
  const total = data.steps.length
  const doneCount = data.steps.filter(s => doneSet.has(s.id)).length
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <StudentShell>
      <div className="mx-auto max-w-[760px] px-6 py-8 space-y-6">
        <button onClick={() => navigate('/student/modules')} className="text-xs text-brand-muted hover:text-navy transition-colors">← Alle Lernmodule</button>

        <header>
          <h1 className="text-xl font-bold text-navy">{data.title}</h1>
          {data.description && <p className="mt-1 text-sm text-brand-muted">{data.description}</p>}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-border/60">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-xs font-semibold text-navy tabular-nums">{doneCount}/{total}</span>
          </div>
          {data.status === 'completed' && <p className="mt-2 text-sm font-medium text-green-600">✓ Modul abgeschlossen</p>}
        </header>

        {data.steps.length === 0 ? (
          <div className="card text-sm text-brand-muted">Dieses Modul hat noch keine Lektionen.</div>
        ) : (
          <div className="space-y-3">
            {data.steps.map((s, i) => {
              const isDone = doneSet.has(s.id)
              return (
                <div key={s.id} className={`card ${isDone ? 'border-accent/30' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-brand-muted tabular-nums">{i + 1}.</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STEP_KIND_CLS[s.kind]}`}>{STEP_KIND_LABEL[s.kind] ?? s.kind}</span>
                      <h2 className="text-sm font-bold text-navy">{s.title}</h2>
                    </div>
                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-brand-muted">
                      <input type="checkbox" checked={isDone} disabled={complete.isPending}
                        onChange={e => complete.mutate({ stepId: s.id, done: e.target.checked })} className="accent-accent" />
                      erledigt
                    </label>
                  </div>
                  {s.kind === 'lesson' && s.content && (
                    <div className="mt-3 border-t border-brand-border pt-3 text-sm leading-relaxed text-brand-text">
                      <MarkdownMessage content={s.content} />
                    </div>
                  )}
                  {s.kind === 'case' && (
                    <div className="mt-3 border-t border-brand-border pt-3">
                      {s.ref_copy_id
                        ? <Link to={`/student/cases/${s.ref_copy_id}`} className="text-sm font-medium text-accent hover:underline">Fall öffnen & bearbeiten →</Link>
                        : <p className="text-sm text-brand-muted">Dieser Fall ist derzeit nicht verfügbar.</p>}
                    </div>
                  )}
                  {s.kind === 'assignment' && (
                    <div className="mt-3 border-t border-brand-border pt-3">
                      <Link to="/student/assignments" className="text-sm font-medium text-accent hover:underline">Zur Aufgabe →</Link>
                    </div>
                  )}
                  {s.kind === 'quiz' && (
                    <div className="mt-3 border-t border-brand-border pt-3">
                      <QuizPlayer questions={s.payload?.questions ?? []} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StudentShell>
  )
}

function QuizPlayer({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  if (questions.length === 0) return <p className="text-sm text-brand-muted">Dieser Wissenscheck hat noch keine Fragen.</p>
  const correctCount = questions.filter((q, i) => answers[i] === q.correct).length
  const answeredCount = Object.keys(answers).length

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const chosen = answers[i]
        const answered = chosen !== undefined
        return (
          <div key={i}>
            <p className="mb-2 text-sm font-medium text-navy">{i + 1}. {q.q}</p>
            <div className="space-y-1.5">
              {q.options.map((o, oi) => {
                const isCorrect = oi === q.correct
                const isChosen = chosen === oi
                let cls = 'border-brand-border text-brand-text hover:border-accent/50'
                if (answered) {
                  if (isCorrect) cls = 'border-green-400 bg-green-50 text-green-800'
                  else if (isChosen) cls = 'border-red-300 bg-red-50 text-red-700'
                  else cls = 'border-brand-border text-brand-muted'
                }
                return (
                  <button key={oi} disabled={answered} onClick={() => setAnswers(a => ({ ...a, [i]: oi }))}
                    className={`flex w-full items-center justify-between gap-2 rounded-brand border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${cls}`}>
                    <span>{o}</span>
                    {answered && isCorrect && <span aria-hidden>✓</span>}
                    {answered && isChosen && !isCorrect && <span aria-hidden>✕</span>}
                  </button>
                )
              })}
            </div>
            {answered && q.explanation && <p className="mt-2 text-xs text-brand-muted">{q.explanation}</p>}
          </div>
        )
      })}
      {answeredCount === questions.length && (
        <p className="pt-1 text-sm font-semibold text-navy">Ergebnis: {correctCount} / {questions.length} richtig</p>
      )}
    </div>
  )
}
