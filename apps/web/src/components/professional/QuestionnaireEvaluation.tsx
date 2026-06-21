/**
 * Fragebogen-Auswertung für die Fachperson: Ø-Score (Likert) + je Frage die
 * Antwort schön dargestellt (Skala-Balken, gewählte Optionen, Freitext).
 */
import { type Answer, type Question } from '@/lib/questionnaire'

export default function QuestionnaireEvaluation({
  questions, answers, score,
}: {
  questions: Question[]
  answers: Record<string, Answer>
  score?: number
}) {
  const likertCount = questions.filter(q => q.type === 'likert').length
  return (
    <div className="space-y-3">
      {score != null && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-accent">Ø {score}</span>
          <span className="text-xs text-brand-muted">
            Durchschnitt der {likertCount} Skala-Frage{likertCount === 1 ? '' : 'n'}
          </span>
        </div>
      )}
      <div className="space-y-2.5">
        {questions.map(q => (
          <div key={q.key} className="border-b border-brand-border pb-2.5 last:border-0 last:pb-0">
            <p className="text-xs text-brand-muted mb-1">{q.label}</p>
            <AnswerView q={q} a={answers[q.key]} />
          </div>
        ))}
      </div>
    </div>
  )
}

function AnswerView({ q, a }: { q: Question; a: Answer | undefined }) {
  if (a == null || (Array.isArray(a) && a.length === 0) || (typeof a === 'string' && !a.trim())) {
    return <p className="text-sm text-brand-muted italic">Keine Antwort</p>
  }
  if (q.type === 'likert') {
    const v = Number(a)
    const max = q.max ?? 5
    const lbl = q.scaleLabels?.[v - 1]?.trim()
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="h-1.5 flex-1 bg-brand-border rounded-full overflow-hidden max-w-[160px] min-w-[80px]">
          <div className="h-full bg-accent" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
        </div>
        <span className="text-sm font-semibold text-navy">{v}/{max}</span>
        {lbl && <span className="text-xs text-brand-muted">· {lbl}</span>}
      </div>
    )
  }
  if (q.type === 'multi') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(a as string[]).map(o => (
          <span key={o} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{o}</span>
        ))}
      </div>
    )
  }
  if (q.type === 'single') {
    return <span className="text-sm font-medium text-navy">{String(a)}</span>
  }
  return <p className="text-sm text-brand-text whitespace-pre-wrap">{String(a)}</p>
}
