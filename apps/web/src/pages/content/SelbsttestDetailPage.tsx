import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import { getSelfTest } from '@/selftests'
import {
  DEFAULT_SCALE, TEST_CATEGORY_LABELS, CRITICAL_FLAGS,
  type SelfTest, type TestQuestion, type TestAnswers, type TestBand,
} from '@/selftests/types'
import { scoreTest, isAnswered, requiredQuestions, type TestResult, type DimensionResult } from '@/selftests/scoring'
import { saveTestResult } from '@/selftests/resultStore'
import { useAuth } from '@/contexts/AuthContext'
import { testResultsApi } from '@/api/testResults'

/**
 * /selbsttests/:slug — Test durchführen + Ergebnis (numerisch + Text + Visualisierung).
 * Auswertung clientseitig; Ergebnis wird lokal gehalten, damit der „mit Echo besprechen"-
 * Übergang (content_<slug> + __test_start__) es kennt. SSR-fest (kein window im Render).
 */
export default function SelbsttestDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const test = slug ? getSelfTest(slug) : undefined
  return <PageLayout>{test ? <TestRunner test={test} /> : <NotFound />}</PageLayout>
}

function NotFound() {
  return (
    <section className="mx-auto max-w-[720px] px-6 pt-[calc(60px+4rem)] pb-24 text-center">
      <p className="text-sm text-brand-muted">Diesen Test gibt es nicht (mehr).</p>
      <Link to="/selbsttests" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
        ← Zu allen Selbsttests
      </Link>
    </section>
  )
}

// Literale Klassennamen (kein Runtime-String-Bau – sonst findet Tailwinds JIT sie nicht).
const TONE: Record<TestBand['tone'], { bar: string; chip: string; stroke: string }> = {
  good: { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800', stroke: 'stroke-emerald-500' },
  mid: { bar: 'bg-amber-400', chip: 'bg-amber-100 text-amber-800', stroke: 'stroke-amber-400' },
  watch: { bar: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800', stroke: 'stroke-orange-500' },
  alert: { bar: 'bg-red-500', chip: 'bg-red-100 text-red-700', stroke: 'stroke-red-500' },
}

function TestRunner({ test }: { test: SelfTest }) {
  const { session } = useAuth()
  const [answers, setAnswers] = useState<TestAnswers>({})
  const [result, setResult] = useState<TestResult | null>(null)
  const [showMissing, setShowMissing] = useState(false)
  const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const resultRef = useRef<HTMLDivElement>(null)

  const sections = useMemo(() => {
    const out: { name: string; qs: TestQuestion[] }[] = []
    for (const q of test.questions) {
      const name = q.section ?? ''
      let sec = out.find((s) => s.name === name)
      if (!sec) { sec = { name, qs: [] }; out.push(sec) }
      sec.qs.push(q)
    }
    return out
  }, [test])

  const required = useMemo(() => requiredQuestions(test), [test])
  const answeredCount = required.filter((q) => isAnswered(q, answers[q.id])).length
  const progress = required.length ? Math.round((answeredCount / required.length) * 100) : 0
  const allDone = answeredCount === required.length

  const setAnswer = (id: string, value: number | number[] | string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }))
  const toggleMulti = (id: string, idx: number) =>
    setAnswers((prev) => {
      const cur = Array.isArray(prev[id]) ? (prev[id] as number[]) : []
      return { ...prev, [id]: cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx] }
    })

  const submit = () => {
    if (!allDone) {
      setShowMissing(true)
      const firstMissing = required.find((q) => !isAnswered(q, answers[q.id]))
      if (firstMissing) document.getElementById(`q-${firstMissing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const res = scoreTest(test, answers)
    saveTestResult(res)
    setResult(res)
    // Angemeldet → Ergebnis ins Profil speichern (nutzer-eigen). Fire-and-forget.
    if (session) {
      setSavedState('saving')
      testResultsApi.save(test.slug, { title: test.title, category: test.category, result: res })
        .then(() => setSavedState('saved'))
        .catch(() => setSavedState('error'))
    }
  }

  const retake = () => {
    setAnswers({})
    setResult(null)
    setShowMissing(false)
    setSavedState('idle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [result])

  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-6 pt-[calc(60px+3.5rem)] pb-12 text-white">
        <div className="mx-auto max-w-[720px]">
          <Link to="/selbsttests" className="text-xs text-white/55 transition-colors hover:text-white">← Selbsttests</Link>
          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white/80">
              {TEST_CATEGORY_LABELS[test.category]}
            </span>
            <span className="text-[0.8rem] text-white/45">{test.duration} · {required.length} Fragen</span>
          </div>
          <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold leading-[1.16] tracking-[-0.02em]">{test.title}</h1>
          <p className="mt-4 max-w-[560px] text-[0.98rem] leading-[1.7] text-brand-blue">{test.intro}</p>
        </div>
      </section>

      {!result && (
        <>
          {/* Fortschritt (sticky) */}
          <div className="sticky top-[60px] z-30 border-b border-brand-border bg-brand-bg/95 px-6 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-[720px] items-center gap-4">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-border">
                <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="shrink-0 text-xs font-medium text-brand-muted tabular-nums">{answeredCount}/{required.length}</span>
            </div>
          </div>

          {/* Fragen */}
          <section className="px-6 py-10">
            <div className="mx-auto max-w-[720px]">
              {sections.map((sec) => (
                <div key={sec.name || 'default'} className="mb-10">
                  {sec.name && <h2 className="mb-5 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-accent">{sec.name}</h2>}
                  <div className="space-y-5">
                    {sec.qs.map((q) => (
                      <QuestionCard
                        key={q.id} q={q} answer={answers[q.id]}
                        missing={showMissing && q.type !== 'text' && !q.optional && !isAnswered(q, answers[q.id])}
                        onScaleOrSingle={(v) => setAnswer(q.id, v)}
                        onToggleMulti={(i) => toggleMulti(q.id, i)}
                        onText={(v) => setAnswer(q.id, v)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {showMissing && !allDone && (
                <p className="mb-4 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Es fehlen noch {required.length - answeredCount} Antworten. Die hervorgehobenen Fragen brauchen noch eine Antwort.
                </p>
              )}
              <button
                onClick={submit}
                className={`btn-primary w-full !py-3.5 ${allDone ? '' : 'opacity-60'}`}
              >
                Auswerten
              </button>
              <p className="mt-3 text-center text-[11px] text-brand-muted/70">
                Deine Antworten bleiben auf deinem Gerät. Wir speichern nichts auf unseren Servern.
              </p>
            </div>
          </section>
        </>
      )}

      {result && (
        <div ref={resultRef}>
          <ResultView test={test} result={result} onRetake={retake} loggedIn={!!session} savedState={savedState} />
        </div>
      )}
    </>
  )
}

function QuestionCard({
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

function ResultView({ test, result, onRetake, loggedIn, savedState }: {
  test: SelfTest; result: TestResult; onRetake: () => void
  loggedIn: boolean; savedState: 'idle' | 'saving' | 'saved' | 'error'
}) {
  const [fill, setFill] = useState(false)
  useEffect(() => { const t = setTimeout(() => setFill(true), 80); return () => clearTimeout(t) }, [])

  const reflectHref = `/reflektieren?test=${test.slug}`
  const severe = result.flags.some((f) => (CRITICAL_FLAGS as readonly string[]).includes(f))
  // Selbst-Test: die harte Hilfe-Box nur bei echten kritischen Angaben (Flags),
  // nicht schon bei einer „alarm"-Dimension wie Mikrokontrolle. Betroffenen-Test: wie gehabt.
  const isSelf = test.safetyVariant === 'self'
  const showSafety = test.safety && (severe || (!isSelf && (result.overall?.band?.tone === 'alert' || result.dimensions.some((d) => d.band?.tone === 'alert'))))
  // Kritische Angaben (Kindesentzug, Gewalt …) sind unabhängig vom Durchschnitt ernst.
  const overallBand: TestBand | undefined = severe
    ? { min: 0, label: 'Ernst zu nehmen', tone: 'alert', text: 'Unabhängig vom Gesamtwert: Du hast Dinge angegeben, die schwer wiegen (siehe Hinweis unten). Bitte nimm das ernst.' }
    : result.overall?.band

  return (
    <section className="border-t border-brand-border bg-white px-6 py-12">
      <div className="mx-auto max-w-[720px]">
        <span className="label">Dein Ergebnis</span>

        {loggedIn ? (
          <p className="mb-4 text-xs text-brand-muted">
            {savedState === 'saved'
              ? '✓ In deinem Profil gespeichert – sichtbar in der Fall-Übersicht, optional für deine Fachperson freigebbar.'
              : savedState === 'error'
                ? 'Konnte nicht im Profil gespeichert werden.'
                : 'Wird in deinem Profil gespeichert …'}
          </p>
        ) : (
          <p className="mb-4 text-xs text-brand-muted">
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="font-medium text-accent hover:underline">Melde dich an</Link>,
            um dein Ergebnis zu speichern und mit deiner Fachperson zu teilen.
          </p>
        )}

        {result.mode === 'dimensional' && result.overall && (
          <OverallCard score={result.overall.score} band={overallBand} fill={fill} />
        )}
        {result.mode === 'typology' && result.primary && (
          <TypologyHero primary={result.primary} dims={result.dimensions} />
        )}

        {/* Dimensionen */}
        <div className="mt-8 space-y-6">
          {result.mode === 'dimensional'
            ? result.dimensions.map((d) => <DimensionRow key={d.key} d={d} fill={fill} />)
            : (
              <div>
                <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">Deine Verteilung</p>
                <div className="space-y-3">
                  {result.dimensions.map((d) => (
                    <TypologyBar key={d.key} d={d} primary={d.key === result.primary?.key} fill={fill} />
                  ))}
                </div>
              </div>
            )}
        </div>

        {showSafety && <SafetyBox variant={test.safetyVariant ?? 'victim'} flags={result.flags} />}

        {/* Freitext-Rückschau */}
        {result.freeText.length > 0 && (
          <div className="mt-8 rounded-brand border border-brand-border bg-brand-bg/50 p-5">
            <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">Deine Notizen</p>
            <div className="space-y-3">
              {result.freeText.map((ft, i) => (
                <div key={i}>
                  <p className="text-[0.8rem] font-medium text-navy">{ft.question}</p>
                  <p className="mt-0.5 text-[0.92rem] italic leading-relaxed text-brand-muted">„{ft.answer}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Echo-Übergang */}
        <aside className="mt-10 rounded-brand-lg border border-accent/25 bg-accent/[0.05] px-7 py-8">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-accent">Mit Echo besprechen</span>
          <h2 className="text-[1.35rem] font-bold leading-snug text-navy">Was bedeutet dieses Ergebnis für dich?</h2>
          <p className="mt-3 text-[0.97rem] leading-relaxed text-brand-muted">
            Echo kennt dein Ergebnis und deine Notizen. Im Gespräch könnt ihr einordnen, was dich überrascht,
            woran dich die Werte erinnern und was ein sinnvoller nächster Schritt wäre – behutsam, ohne Diagnose.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link to={reflectHref} className="btn-primary !px-6 !py-3">Ergebnis mit Echo besprechen</Link>
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="text-sm font-medium text-accent hover:underline">
              Noch kein Konto? Kostenlos starten
            </Link>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-brand-muted/80">
            Echo arbeitet nur mit deinem eigenen, ausdrücklich gewählten Fall – privat und verschlüsselt. Es stellt keine Diagnose.
          </p>
        </aside>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button onClick={onRetake} className="text-sm font-medium text-brand-muted hover:text-navy">↻ Test wiederholen</button>
          <Link to="/selbsttests" className="text-sm font-medium text-accent hover:underline">Andere Tests ansehen →</Link>
        </div>

        {test.disclaimer && (
          <p className="mt-10 border-t border-brand-border pt-6 text-xs leading-relaxed text-brand-muted/80">{test.disclaimer}</p>
        )}
      </div>
    </section>
  )
}

function OverallCard({ score, band, fill }: { score: number; band?: TestBand; fill: boolean }) {
  const tone = band ? TONE[band.tone] : TONE.mid
  return (
    <div className="rounded-brand-lg border border-brand-border bg-white p-7 shadow-brand">
      <div className="flex items-center gap-6">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-brand-border" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" className={tone.stroke} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${(fill ? score : 0) * 0.974} 100`} style={{ transition: 'stroke-dasharray 900ms ease-out' }} />
          </svg>
          <span className="absolute text-[1.4rem] font-extrabold tabular-nums text-navy">{score}</span>
        </div>
        <div>
          {band && <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tone.chip}`}>{band.label}</span>}
          <p className="mt-2 text-[0.72rem] font-medium uppercase tracking-wide text-brand-muted">Gesamtwert · {score}/100</p>
        </div>
      </div>
      {band && <p className="mt-4 text-[0.97rem] leading-relaxed text-brand-text">{band.text}</p>}
    </div>
  )
}

function DimensionRow({ d, fill }: { d: DimensionResult; fill: boolean }) {
  const tone = d.band ? TONE[d.band.tone] : TONE.mid
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[0.95rem] font-semibold text-navy">{d.name}</p>
        <div className="flex items-center gap-2">
          {d.band && <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${tone.chip}`}>{d.band.label}</span>}
          <span className="text-[0.8rem] font-medium tabular-nums text-brand-muted">{d.score}</span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-brand-border/60">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${fill ? d.score : 0}%`, transition: 'width 800ms ease-out' }} />
      </div>
      {d.band && <p className="mt-2 text-[0.88rem] leading-relaxed text-brand-muted">{d.band.text}</p>}
    </div>
  )
}

function TypologyHero({ primary, dims }: { primary: DimensionResult; dims: DimensionResult[] }) {
  const second = [...dims].filter((d) => d.key !== primary.key).sort((a, b) => b.score - a.score)[0]
  const close = second && primary.score - second.score <= 12
  return (
    <div className="rounded-brand-lg border border-accent/30 bg-accent/[0.05] p-7">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-accent">Deine Tendenz</p>
      <h2 className="mt-1 text-[1.6rem] font-extrabold text-navy">{primary.name}</h2>
      {primary.resultTagline && <p className="mt-1 text-[1rem] font-medium text-brand-text">{primary.resultTagline}</p>}
      {primary.resultText && <p className="mt-4 text-[0.97rem] leading-relaxed text-brand-text">{primary.resultText}</p>}
      {close && second && (
        <p className="mt-4 rounded-brand border border-brand-border bg-white px-4 py-3 text-[0.88rem] text-brand-muted">
          Bei dir ist auch <strong className="text-navy">{second.name}</strong> stark ausgeprägt – viele Menschen tragen Anteile mehrerer Stile in sich.
        </p>
      )}
    </div>
  )
}

function TypologyBar({ d, primary, fill }: { d: DimensionResult; primary: boolean; fill: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className={`text-[0.9rem] ${primary ? 'font-bold text-navy' : 'font-medium text-brand-muted'}`}>{d.name}</p>
        <span className="text-[0.8rem] font-medium tabular-nums text-brand-muted">{d.score}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-brand-border/60">
        <div className={`h-full rounded-full ${primary ? 'bg-accent' : 'bg-brand-blue'}`} style={{ width: `${fill ? d.score : 0}%`, transition: 'width 800ms ease-out' }} />
      </div>
    </div>
  )
}

const FLAG_LABELS: Record<string, string> = {
  gewalt: 'körperliche Gewalt oder Einschüchterung',
  kindesentzug: 'Drohung mit Kindesentzug / Sorgerechtsdruck',
  'kindesentzug-ohne-reparatur': 'Kindesentzug-Drohung – ohne aufrichtige Klärung danach',
  'trennungsdrohung-ohne-reparatur': 'Trennungsdrohung als Druckmittel – ohne Klärung danach',
  'trennungsdrohung-haeufig': 'wiederholte Trennungsdrohungen',
  'coercive-control': 'systematische Isolation oder Kontrolle (Coercive Control)',
}

function SafetyBox({ variant, flags }: { variant: 'victim' | 'self'; flags: string[] }) {
  const shown = flags.filter((f) => FLAG_LABELS[f])
  return (
    <div className="mt-8 rounded-brand border border-red-200 bg-red-50 px-5 py-4">
      <p className="text-sm font-semibold text-red-800">Bitte ernst nehmen</p>
      {shown.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[0.9rem] text-red-800">
          {shown.map((f) => <li key={f}>{FLAG_LABELS[f]}</li>)}
        </ul>
      )}
      {variant === 'self' ? (
        <p className="mt-2 text-[0.9rem] leading-relaxed text-red-700">
          Das ehrlich zuzugeben, ist ein wichtiger, mutiger Schritt. Manche dieser Muster – vor allem Drohungen mit den
          Kindern und körperliche Gewalt – schaden anderen ernsthaft und können strafbar sein. Du musst das nicht allein
          verändern: Es gibt Beratungsstellen für Menschen, die ihr Verhalten ändern wollen (Stichwort „Gewaltberatung"
          bzw. „Täterberatung"), dazu hilft Paar- oder Einzeltherapie. Bei akuter Gefahr für andere: <strong>110</strong>.
          Zum Reden rund um die Uhr: Telefonseelsorge <strong>0800 111 0 111</strong>.
        </p>
      ) : (
        <p className="mt-2 text-[0.9rem] leading-relaxed text-red-700">
          Das bedeutet nicht automatisch, dass etwas „diagnostizierbar" ist – aber dein Erleben zählt. Du musst das nicht
          allein tragen. Sprich mit einer Vertrauensperson oder einer Fachstelle. Bei Gefahr: <strong>110</strong>.
          Hilfetelefon Gewalt gegen Frauen: <strong>116 016</strong> (kostenlos, rund um die Uhr). Telefonseelsorge:
          <strong> 0800 111 0 111</strong>.
        </p>
      )}
    </div>
  )
}
