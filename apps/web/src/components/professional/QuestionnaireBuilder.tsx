/**
 * Fragebogen-Builder: Fragen mit Typ (Likert/Einfach/Mehrfach/Freitext) + Optionen.
 * Wird in der Bibliothek und im Fall-Panel genutzt. Steuert `payload.questions`.
 */
import { Q_TYPE_LABELS, newQuestion, type QType, type Question } from '@/lib/questionnaire'

const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent'

export default function QuestionnaireBuilder({
  value, onChange,
}: { value: Question[]; onChange: (q: Question[]) => void }) {
  const update = (i: number, patch: Partial<Question>) =>
    onChange(value.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))
  const changeType = (i: number, type: QType) =>
    onChange(value.map((q, idx) => (idx === i ? { ...newQuestion(type), key: q.key, label: q.label } : q)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {value.map((q, i) => (
        <div key={q.key} className="rounded-brand border border-brand-border bg-brand-bg p-3 space-y-2">
          <div className="flex gap-2 items-start">
            <span className="text-xs text-brand-muted pt-2 w-5 shrink-0">{i + 1}.</span>
            <input
              value={q.label}
              onChange={e => update(i, { label: e.target.value })}
              placeholder="Frage"
              className={inputCls}
            />
            <select
              value={q.type}
              onChange={e => changeType(i, e.target.value as QType)}
              className={inputCls + ' max-w-[40%]'}
            >
              {Object.entries(Q_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              title="Frage entfernen"
              className="text-brand-muted hover:text-red-600 text-sm leading-none p-2 shrink-0"
            >
              ✕
            </button>
          </div>
          {q.type === 'likert' && (
            <div className="flex items-center gap-2 ml-7">
              <span className="text-xs text-brand-muted">Skala von 1 bis</span>
              <input
                type="number" min={2} max={10} value={q.max ?? 5}
                onChange={e => update(i, { max: Math.max(2, Math.min(10, Number(e.target.value) || 5)) })}
                className="w-16 rounded-brand border border-brand-border bg-white px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
          )}
          {(q.type === 'single' || q.type === 'multi') && (
            <input
              value={(q.options ?? []).join(', ')}
              onChange={e => update(i, { options: e.target.value.split(',').map(s => s.trim()) })}
              placeholder="Antwortoptionen – mit Komma getrennt"
              className={inputCls + ' ml-7'}
              style={{ width: 'calc(100% - 1.75rem)' }}
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, newQuestion('likert')])}
        className="text-sm font-medium text-accent hover:underline"
      >
        + Frage hinzufügen
      </button>
    </div>
  )
}
