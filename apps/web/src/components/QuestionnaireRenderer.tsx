/**
 * Fragebogen-Renderer für die Klient:in: rendert alle Fragetypen, sammelt
 * Antworten und sendet sie. Genutzt im Postfach (InboxPage).
 */
import { useState } from 'react'
import { isAnswered, type Answer, type Question } from '@/lib/questionnaire'

const optCls = 'flex items-center gap-2 cursor-pointer text-sm'

export default function QuestionnaireRenderer({
  intro, questions, onSubmit, busy,
}: {
  intro?: string
  questions: Question[]
  onSubmit: (answers: Record<string, Answer>) => void
  busy?: boolean
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const set = (key: string, v: Answer) => setAnswers(a => ({ ...a, [key]: v }))
  const allAnswered = questions.every(q => isAnswered(q, answers[q.key]))

  return (
    <div className="text-sm text-brand-text">
      {intro && <p className="mb-3">{intro}</p>}
      <div className="space-y-4">
        {questions.map(q => (
          <div key={q.key}>
            <p className="mb-1.5 font-medium">{q.label}</p>

            {q.type === 'likert' && (
              <div className="flex gap-1.5">
                {Array.from({ length: q.max ?? 5 }, (_, i) => i + 1).map(n => (
                  <button key={n} type="button" onClick={() => set(q.key, n)}
                    className={`w-9 h-9 rounded-brand border text-sm font-medium transition-colors ${
                      answers[q.key] === n
                        ? 'bg-accent text-white border-accent'
                        : 'border-brand-border text-brand-muted hover:border-accent'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'single' && (
              <div className="space-y-1.5">
                {(q.options ?? []).filter(o => o.trim()).map(o => (
                  <label key={o} className={optCls}>
                    <input type="radio" name={q.key} checked={answers[q.key] === o} onChange={() => set(q.key, o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'multi' && (
              <div className="space-y-1.5">
                {(q.options ?? []).filter(o => o.trim()).map(o => {
                  const arr = Array.isArray(answers[q.key]) ? (answers[q.key] as string[]) : []
                  const checked = arr.includes(o)
                  return (
                    <label key={o} className={optCls}>
                      <input type="checkbox" checked={checked}
                        onChange={() => set(q.key, checked ? arr.filter(x => x !== o) : [...arr, o])} />
                      <span>{o}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {q.type === 'text' && (
              <textarea value={(answers[q.key] as string) ?? ''} onChange={e => set(q.key, e.target.value)} rows={2}
                className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
            )}
          </div>
        ))}
      </div>
      <button onClick={() => onSubmit(answers)} disabled={busy || !allAnswered}
        className="mt-3 text-sm font-semibold px-4 py-2 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-60">
        {busy ? 'Wird gesendet …' : 'Absenden'}
      </button>
    </div>
  )
}
