/**
 * TestOverviewPanel – die Test-Übersicht neben dem Ergebnis-Dialog.
 *
 * Zeigt zu jedem gescorten Item die Antwort des Nutzers, erlaubt eine Inline-Revision
 * (Skala/Single), einen „Mit Echo besprechen"-Absprung je Frage und – wenn sich etwas
 * geändert hat – die deterministische Neuberechnung. Rein präsentational + Callbacks;
 * kein eigener Netzwerk-/Scoring-Code (das orchestriert die Seite).
 */
import { useMemo } from 'react'
import { DEFAULT_SCALE, type SelfTest, type TestQuestion, type TestAnswers, type TestBand } from '@/selftests/types'
import type { TestResult } from '@/selftests/scoring'
import { answerLabel, directionNote, scaleStep, scaleSteps, type ResultDelta } from '@/selftests/dialogue'

const CHIP: Record<TestBand['tone'], string> = {
  good: 'bg-emerald-100 text-emerald-800',
  mid: 'bg-amber-100 text-amber-800',
  watch: 'bg-orange-100 text-orange-800',
  alert: 'bg-red-100 text-red-700',
}

export interface TestOverviewPanelProps {
  test: SelfTest
  result: TestResult
  /** Arbeitskopie mit noch nicht berechneten Revisionen (Basis der Anzeige). */
  draft: TestAnswers
  dirty: boolean
  delta?: ResultDelta | null
  recomputing?: boolean
  onRevise: (questionId: string, value: number) => void
  onDiscuss: (q: TestQuestion) => void
  onRecompute: () => void
  onResetDraft: () => void
}

export default function TestOverviewPanel({
  test, result, draft, dirty, delta, recomputing,
  onRevise, onDiscuss, onRecompute, onResetDraft,
}: TestOverviewPanelProps) {
  const sections = useMemo(() => {
    const out: { name: string; qs: TestQuestion[] }[] = []
    for (const q of test.questions) {
      if (q.type === 'text') continue
      const name = q.section ?? ''
      let sec = out.find((s) => s.name === name)
      if (!sec) { sec = { name, qs: [] }; out.push(sec) }
      sec.qs.push(q)
    }
    return out
  }, [test])

  const overall = result.mode === 'dimensional' ? result.overall : undefined
  const primary = result.mode === 'typology' ? result.primary : undefined

  return (
    <div className="flex h-full flex-col">
      {/* Kopf: Live-Ergebnis */}
      <div className="border-b border-brand-border bg-white px-5 py-4">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-brand-muted">Dein Test im Überblick</p>
        <div className="mt-2 flex items-center gap-3">
          {overall && (
            <>
              <span className="text-2xl font-extrabold tabular-nums text-navy">{overall.score}<span className="text-sm font-medium text-brand-muted">/100</span></span>
              {overall.band && <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${CHIP[overall.band.tone]}`}>{overall.band.label}</span>}
            </>
          )}
          {primary && (
            <span className="text-[1.05rem] font-bold text-navy">{primary.name}</span>
          )}
        </div>
        {delta && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[0.72rem] font-medium text-accent">
            <span>neu berechnet:</span>
            <span className="tabular-nums text-brand-muted line-through">{delta.before.score}</span>
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M9 5l3 3-3 3" /></svg>
            <span className="tabular-nums font-bold text-navy">{delta.after.score}</span>
            {delta.after.label && <span className="text-navy">· {delta.after.label}</span>}
          </div>
        )}
        <p className="mt-1 text-[0.72rem] text-brand-muted">{test.title}</p>
      </div>

      {/* Neu-berechnen-Leiste (nur bei Änderungen) */}
      {dirty && (
        <div className="flex items-center justify-between gap-3 border-b border-accent/30 bg-accent/[0.06] px-5 py-3">
          <p className="text-[0.8rem] leading-snug text-navy">Du hast Antworten angepasst.</p>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={onResetDraft} className="text-[0.78rem] font-medium text-brand-muted hover:text-navy">Zurücksetzen</button>
            <button
              onClick={onRecompute}
              disabled={recomputing}
              className="rounded-brand bg-accent px-3 py-1.5 text-[0.78rem] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {recomputing ? 'Rechne …' : 'Ergebnis neu berechnen'}
            </button>
          </div>
        </div>
      )}

      {/* Fragen */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {sections.map((sec) => (
          <div key={sec.name || 'default'} className="mb-6 last:mb-0">
            {sec.name && <p className="mb-2.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-accent/90">{sec.name}</p>}
            <div className="space-y-3">
              {sec.qs.map((q) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  value={draft[q.id]}
                  onRevise={(v) => onRevise(q.id, v)}
                  onDiscuss={() => onDiscuss(q)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuestionRow({
  q, value, onRevise, onDiscuss,
}: {
  q: TestQuestion
  value: number | number[] | string | undefined
  onRevise: (v: number) => void
  onDiscuss: () => void
}) {
  const dir = directionNote(q)
  return (
    <div className="rounded-brand border border-brand-border bg-white p-3.5">
      <p className="text-[0.86rem] font-medium leading-snug text-navy">{q.text}</p>
      {dir && <p className="mt-1 text-[0.7rem] text-brand-muted/80">{dir}</p>}

      {/* Antwort / Revision */}
      <div className="mt-2.5">
        {q.type === 'scale' && (
          <MiniScale q={q} value={typeof value === 'number' ? value : null} onChange={onRevise} />
        )}
        {q.type === 'single' && q.options && (
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((o, i) => {
              const on = value === i
              return (
                <button key={i} onClick={() => onRevise(i)}
                  className={`rounded-full border px-2.5 py-1 text-[0.74rem] transition-colors ${
                    on ? 'border-accent bg-accent/10 font-semibold text-accent' : 'border-brand-border text-brand-muted hover:border-accent/40'
                  }`}>
                  {o.label}
                </button>
              )
            })}
          </div>
        )}
        {(q.type === 'multi' || q.type === 'text') && (
          <p className="text-[0.8rem] italic text-brand-muted">{answerLabel(q, value)}</p>
        )}
      </div>

      <button
        onClick={onDiscuss}
        className="mt-2.5 inline-flex items-center gap-1 text-[0.74rem] font-semibold text-accent hover:underline"
      >
        Mit Echo besprechen
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4" /></svg>
      </button>
    </div>
  )
}

function MiniScale({ q, value, onChange }: { q: TestQuestion; value: number | null; onChange: (v: number) => void }) {
  const sc = q.scale ?? DEFAULT_SCALE
  const steps: number[] = []
  for (let v = sc.min; v <= sc.max; v++) steps.push(v)
  return (
    <div>
      <div className="flex gap-1">
        {steps.map((v) => {
          const on = value === v
          return (
            <button key={v} onClick={() => onChange(v)} aria-label={`Stufe ${scaleStep(q, v)} von ${scaleSteps(q)}`}
              className={`h-8 flex-1 rounded-md border text-[0.74rem] font-semibold transition-all ${
                on ? 'border-accent bg-accent text-white' : 'border-brand-border text-brand-muted hover:border-accent/50'
              }`}>
              {v - sc.min + 1}
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[0.64rem] text-brand-muted/70">
        <span>{sc.labels[0]}</span>
        <span>{sc.labels[1]}</span>
      </div>
    </div>
  )
}
