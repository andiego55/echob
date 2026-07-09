/**
 * Fragebogen-Auswertung für die Fachperson: Ø-Score (Likert) als Pille + je Frage
 * die Antwort visuell aufbereitet (Segment-Skala + Bedeutungs-Label, gewählte
 * Optionen als Chips, Einfachauswahl als Pille, Freitext).
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
      {score != null && likertCount > 0 && (
        <div className="flex items-center gap-3 rounded-brand border border-accent/20 bg-accent/[0.06] px-4 py-2.5">
          <span className="flex items-baseline gap-0.5">
            <span className="text-[11px] font-semibold text-accent/70">Ø</span>
            <span className="text-2xl font-bold text-accent tabular-nums leading-none">
              {score.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
            </span>
          </span>
          <span className="h-7 w-px bg-accent/20" />
          <p className="text-xs text-brand-muted leading-snug">
            Durchschnitt aus {likertCount} Skala-Frage{likertCount === 1 ? '' : 'n'}
          </p>
        </div>
      )}
      <div className="space-y-2">
        {questions.map(q => (
          <div key={q.key} className="rounded-brand border border-brand-border bg-white px-3 py-2.5">
            <p className="text-xs font-medium text-brand-muted mb-1.5">{q.label}</p>
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
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="flex gap-1 shrink-0" aria-hidden>
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className={`h-2 w-4 rounded-full ${i < v ? 'bg-accent' : 'bg-brand-border'}`} />
          ))}
        </span>
        {lbl
          ? <span className="text-sm font-semibold text-navy">{lbl}</span>
          : <span className="text-sm font-semibold text-navy tabular-nums">{v} von {max}</span>}
        {lbl && <span className="text-[11px] text-brand-muted tabular-nums">{v}/{max}</span>}
      </div>
    )
  }
  if (q.type === 'multi') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(a as string[]).map(o => (
          <span key={o} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{o}</span>
        ))}
      </div>
    )
  }
  if (q.type === 'single') {
    return (
      <span className="inline-block text-sm font-medium text-navy px-2.5 py-0.5 rounded-full bg-brand-bg border border-brand-border">
        {String(a)}
      </span>
    )
  }
  return <p className="text-sm text-brand-text whitespace-pre-wrap">{String(a)}</p>
}
