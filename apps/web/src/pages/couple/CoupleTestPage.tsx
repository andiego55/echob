/**
 * /app/paar/:coupleId/test/:slug — ein Test, den beide ausfüllen und vergleichen.
 *
 * Die Auswertung passiert deterministisch im Client (scoreTest) – Echo kommentiert nur den
 * Vergleich. Das Ergebnis der anderen Person bleibt verborgen, bis man selbst geantwortet
 * hat; darum kümmert sich der Server.
 */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import QuestionCard from '@/components/selftests/QuestionCard'
import { getSelfTest } from '@/selftests'
import { isCoupleSafe } from '@/selftests/couple'
import { isAnswered, requiredQuestions, scoreTest } from '@/selftests/scoring'
import type { DimensionResult, TestResult } from '@/selftests/scoring'
import type { TestAnswers } from '@/selftests/types'
import { coupleTestsApi } from '@/api/coupleTests'
import type { CoupleTestState } from '@/api/coupleTests'
import Weiterfuehren from '@/components/couple/Weiterfuehren'

export default function CoupleTestPage() {
  const { coupleId = '', slug = '' } = useParams<{ coupleId: string; slug: string }>()
  const qc = useQueryClient()
  const test = getSelfTest(slug)

  const [answers, setAnswers] = useState<TestAnswers>({})
  const [showMissing, setShowMissing] = useState(false)
  const [retake, setRetake] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['couple-test', coupleId, slug],
    queryFn: () => coupleTestsApi.get(coupleId, slug),
    enabled: !!coupleId && !!slug,
  })

  const required = useMemo(() => (test ? requiredQuestions(test) : []), [test])
  const answeredCount = required.filter(q => isAnswered(q, answers[q.id])).length

  const apply = (d: CoupleTestState) => qc.setQueryData(['couple-test', coupleId, slug], d)

  const save = useMutation({
    mutationFn: () => {
      const result = scoreTest(test!, answers)
      return coupleTestsApi.save(coupleId, slug, { title: test!.title, answers, result })
    },
    onSuccess: d => { apply(d); setRetake(false) },
  })
  const compare = useMutation({
    mutationFn: () => coupleTestsApi.compare(coupleId, slug),
    onSuccess: apply,
  })

  // Auch bei direkt eingetippter URL: Tests, die eine Person über die andere urteilen
  // lassen, gibt es im gemeinsamen Raum nicht.
  if (!test || !isCoupleSafe(test)) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-8">
          <div className="card">
            <h1 className="text-sm font-bold text-navy">
              {test ? 'Dieser Test gehört nicht in den Paarraum' : 'Test nicht gefunden'}
            </h1>
            {test && (
              <p className="mt-2 text-sm text-brand-muted">
                Er richtet sich an dich allein – in einem Raum, den ihr beide lest, würde er
                mehr schaden als helfen. Du findest ihn in deinem eigenen Bereich.
              </p>
            )}
            <Link to={`/app/paar/${coupleId}`} className="btn-quiet !py-2 !px-4 !text-sm mt-4 inline-block">
              Zum Paarraum
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const showForm = retake || (!isLoading && !data?.own)

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="mb-5">
          <Link to={`/app/paar/${coupleId}`} className="text-xs text-brand-muted hover:text-navy">← Paarraum</Link>
          <span className="label mt-2 block">Test zu zweit</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">{test.title}</h1>
          <p className="mt-2 text-sm text-brand-muted">{test.teaser}</p>
        </div>

        {isLoading && <div className="card text-sm text-brand-muted">Lade …</div>}

        {showForm ? (
          <>
            <div className="card mb-5 bg-accent/[0.04] border-l-4 border-l-accent">
              <p className="text-sm text-brand-muted">
                Antworte für dich, nicht so, wie du denkst, dass es erwartet wird.
                {data?.partner_answered
                  ? ' Deine Partnerperson hat schon geantwortet – ihr Ergebnis siehst du, sobald du fertig bist.'
                  : ' Sobald ihr beide fertig seid, könnt ihr die Ergebnisse vergleichen.'}
              </p>
            </div>

            <div className="space-y-4">
              {test.questions.map(q => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  answer={answers[q.id]}
                  missing={showMissing && q.type !== 'text' && !q.optional && !isAnswered(q, answers[q.id])}
                  onScaleOrSingle={v => setAnswers(p => ({ ...p, [q.id]: v }))}
                  onToggleMulti={i => setAnswers(p => {
                    const cur = Array.isArray(p[q.id]) ? (p[q.id] as number[]) : []
                    return { ...p, [q.id]: cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i] }
                  })}
                  onText={v => setAnswers(p => ({ ...p, [q.id]: v }))}
                />
              ))}
            </div>

            <div className="card mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (answeredCount < required.length) { setShowMissing(true); return }
                  save.mutate()
                }}
                disabled={save.isPending}
                className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
              >
                {save.isPending ? 'Speichere …' : 'Auswerten'}
              </button>
              <span className="text-xs text-brand-muted">
                {answeredCount} von {required.length} beantwortet
              </span>
            </div>
          </>
        ) : data?.own ? (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <ResultColumn name={data.own_name} result={data.own.result} highlight />
              {data.partner
                ? <ResultColumn name={data.partner_name ?? 'Partnerperson'} result={data.partner.result} />
                : (
                  <div className="card">
                    <h2 className="text-sm font-bold text-navy">{data.partner_name ?? 'Deine Partnerperson'}</h2>
                    <p className="mt-3 text-sm text-brand-muted">
                      Hat den Test noch nicht ausgefüllt. Sobald ihr beide fertig seid, könnt
                      ihr vergleichen.
                    </p>
                  </div>
                )}
            </div>

            <div className="card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-navy">Echos Blick auf den Vergleich</h2>
                  <p className="mt-1 text-xs text-brand-muted">
                    Kein Zeugnis. Wo ihr euch ähnlich seid, wo ihr auseinandergeht – und
                    worüber sich zu reden lohnt.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <button
                    onClick={() => compare.mutate()}
                    disabled={!data.both_done || compare.isPending}
                    className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
                  >
                    {compare.isPending
                      ? 'Echo liest …'
                      : data.comparisons.length ? 'Neu ansehen' : 'Vergleich ansehen'}
                  </button>
                  <button
                    onClick={() => { setAnswers(data.own?.answers ?? {}); setRetake(true) }}
                    className="btn-quiet !py-2 !px-4 !text-sm"
                  >
                    Antworten ändern
                  </button>
                </div>
              </div>

              {data.comparisons.length === 0 ? (
                <p className="mt-4 text-sm text-brand-muted">
                  {data.both_done ? 'Noch kein Vergleich erstellt.' : 'Der Vergleich braucht beide Ergebnisse.'}
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {data.comparisons.map(c => (
                    <div key={c.id} className="rounded-brand border border-brand-border px-4 py-3.5">
                      <p className="text-[0.65rem] text-brand-muted">
                        {new Date(c.created_at).toLocaleString('de-DE')}
                      </p>
                      <div className="mt-2 text-sm text-brand-text">
                        <MarkdownMessage content={c.body} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Der Vergleich endete bisher mit "worueber sich zu reden lohnt" - und bot
                keine Moeglichkeit, genau das zu tun. Jetzt schon. */}
            {data.comparisons.length > 0 && (
              <Weiterfuehren
                coupleId={coupleId}
                saat={data.comparisons[0].body}
                titel="Worüber lohnt es sich zu reden?"
                hinweis="Ein Testergebnis ist erst dann etwas wert, wenn ihr darüber sprecht."
                zuege={['gespraech', 'thema', 'abmachung']}
              />
            )}
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}

function ResultColumn({ name, result, highlight = false }: {
  name: string; result: TestResult; highlight?: boolean
}) {
  return (
    <div className={`card ${highlight ? 'border-l-4 border-l-accent' : ''}`}>
      <h2 className="text-sm font-bold text-navy">{name}</h2>
      {result.overall && (
        <p className="mt-2 text-2xl font-bold text-navy">
          {result.overall.score}
          <span className="text-sm font-normal text-brand-muted">/100</span>
          {result.overall.band?.label && (
            <span className="ml-2 text-xs font-medium text-brand-muted">{result.overall.band.label}</span>
          )}
        </p>
      )}
      {result.primary && (
        <p className="mt-2 text-sm font-semibold text-navy">{result.primary.name}</p>
      )}
      <div className="mt-3 space-y-2">
        {result.dimensions.map((d: DimensionResult) => (
          <div key={d.key}>
            <div className="flex justify-between text-xs">
              <span className="text-brand-text">{d.name}</span>
              <span className="font-semibold text-navy">{d.score}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-bg">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, d.score)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
