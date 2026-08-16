/**
 * Frage-Karte eines Selbsttests – geteilt von der öffentlichen Testseite und dem Paar-Test.
 * Rein darstellend: Zustand und Auswertung liegen bei der aufrufenden Seite.
 */
import { DEFAULT_SCALE, type TestQuestion } from '@/selftests/types'

export default function QuestionCard({
  q, answer, missing, onScaleOrSingle, onToggleMulti, onText,
}: {
  q: TestQuestion
  answer: number | number[] | string | undefined
  missing: boolean
  onScaleOrSingle: (v: number) => void
  onToggleMulti: (i: number) => void
  onText: (v: string) => void
}) {
  return (
    <div id={`q-${q.id}`} className={`rounded-brand border bg-white p-5 transition-colors ${missing ? 'border-amber-300 ring-2 ring-amber-100' : 'border-brand-border'}`}>
      <p className="text-[0.98rem] font-semibold leading-snug text-navy">{q.text}</p>
      {q.help && <p className="mt-1 text-[0.82rem] text-brand-muted">{q.help}</p>}

      {q.type === 'scale' && <ScaleInput scale={q.scale ?? DEFAULT_SCALE} value={typeof answer === 'number' ? answer : null} onChange={onScaleOrSingle} />}

      {q.type === 'single' && (
        <div className="mt-4 space-y-2">
          {(q.options ?? []).map((o, i) => {
            const on = answer === i
            return (
              <button key={i} onClick={() => onScaleOrSingle(i)}
                className={`flex w-full items-center gap-3 rounded-brand border px-4 py-2.5 text-left text-[0.92rem] transition-colors ${
                  on ? 'border-accent bg-accent/[0.06] text-navy' : 'border-brand-border text-brand-text hover:border-accent/40'
                }`}>
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? 'border-accent' : 'border-brand-border'}`}>
                  {on && <span className="h-2 w-2 rounded-full bg-accent" />}
                </span>
                {o.label}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'multi' && (
        <div className="mt-4 space-y-2">
          {(q.options ?? []).map((o, i) => {
            const on = Array.isArray(answer) && answer.includes(i)
            return (
              <button key={i} onClick={() => onToggleMulti(i)}
                className={`flex w-full items-center gap-3 rounded-brand border px-4 py-2.5 text-left text-[0.92rem] transition-colors ${
                  on ? 'border-accent bg-accent/[0.06] text-navy' : 'border-brand-border text-brand-text hover:border-accent/40'
                }`}>
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? 'border-accent bg-accent text-white' : 'border-brand-border'}`}>
                  {on && <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M2 6l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                {o.label}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'text' && (
        <textarea
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => onText(e.target.value)}
          rows={3}
          placeholder="Optional – schreib, was dir dazu einfällt."
          className="mt-3 w-full resize-y rounded-brand border border-brand-border px-3.5 py-2.5 text-[0.92rem] leading-relaxed text-brand-text outline-none placeholder:text-brand-muted/50 focus:border-accent"
        />
      )}
    </div>
  )
}

function ScaleInput({ scale, value, onChange }: { scale: { min: number; max: number; labels: [string, string] }; value: number | null; onChange: (v: number) => void }) {
  const steps = []
  for (let v = scale.min; v <= scale.max; v++) steps.push(v)
  return (
    <div className="mt-4">
      <div className="flex gap-1.5">
        {steps.map((v) => {
          const on = value === v
          return (
            <button key={v} onClick={() => onChange(v)} aria-label={`${v}`}
              className={`h-11 flex-1 rounded-brand border text-sm font-semibold transition-all ${
                on ? 'border-accent bg-accent text-white' : 'border-brand-border text-brand-muted hover:border-accent/50'
              }`}>
              {v - scale.min + 1}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.72rem] text-brand-muted/70">
        <span>{scale.labels[0]}</span>
        <span>{scale.labels[1]}</span>
      </div>
    </div>
  )
}
