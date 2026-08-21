/**
 * /app/cases/:caseId/selbsttest/:slug — Interaktiver Ergebnis-Dialog zu einem Selbsttest.
 *
 * Zwei Spalten: links das Echo-Gespräch, rechts die Test-Übersicht (jede Frage mit
 * Antwort, Inline-Revision, „mit Echo besprechen"). Echo kennt über den Start-Seed den
 * GANZEN Test. Antworten lassen sich revidieren; das Ergebnis wird dann DETERMINISTISCH
 * (scoreTest) neu berechnet – Echo erfindet nie eine Zahl, sondern ordnet die neue ein.
 *
 * Bewusst als eigene Seite (kein Umbau der geteilten TopicDialogPage), damit nichts am
 * bestehenden Themendialog bricht. Transport = bestehender, sicherer Fall-Echo-Chat.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import ChatComposer from '@/components/app/ChatComposer'
import { ChatMessage, TypingIndicator, ChatErrorMessage, safetyLevelFromMeta } from '@/components/app/ChatMessage'
import TestOverviewPanel from '@/components/app/TestOverviewPanel'
import { echoApi } from '@/api/echo'
import { topicSummariesApi } from '@/api/topicSummaries'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { testResultsApi } from '@/api/testResults'
import { useAuth } from '@/contexts/AuthContext'
import { apiErrorMessage } from '@/api/errors'
import {
  getSelfTest, scoreTest, buildStartTrigger, buildRevisionMessage, answerLabel,
  type TestResult, type AnswerChange, type ResultDelta,
} from '@/selftests'
import { loadTestAnswers, loadTestResult, saveTestResult, saveTestAnswers } from '@/selftests/resultStore'
import type { SelfTest, TestQuestion, TestAnswers } from '@/selftests/types'
import type { EchoMessage, ThreadType } from '@/types'
import { useBestaetigen } from '@/components/Bestaetigung'

export default function SelfTestDialoguePage() {
  const { caseId, slug } = useParams<{ caseId: string; slug: string }>()
  const test = slug ? getSelfTest(slug) : undefined
  const storedAnswers = useMemo(() => (slug ? loadTestAnswers(slug) : null), [slug])
  const storedResult = useMemo(() => (slug ? loadTestResult(slug) : null), [slug])

  if (!caseId || !test) {
    return (
      <AppShell>
        {caseId && <CaseNav caseId={caseId} />}
        <div className="px-6 py-10 text-sm text-red-600">Diesen Selbsttest gibt es nicht.</div>
      </AppShell>
    )
  }

  // Ohne gespeicherte Antworten fehlt die Grundlage → zurück zum Test.
  if (!storedAnswers) {
    return (
      <AppShell>
        <CaseNav caseId={caseId} />
        <div className="mx-auto max-w-[640px] px-6 py-16 text-center">
          <h1 className="page-title">Mach den Test zuerst</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Für den Ergebnis-Dialog brauchen wir deine Antworten. Fülle den Selbsttest kurz aus – danach besprichst du das Ergebnis hier mit Echo.
          </p>
          <Link to={`/selbsttests/${test.slug}`} className="btn-primary mt-6 inline-block !px-5 !py-2.5 !text-sm">
            Zum Selbsttest „{test.title}"
          </Link>
        </div>
      </AppShell>
    )
  }

  const initialResult = storedResult ?? scoreTest(test, storedAnswers)
  return <Dialogue caseId={caseId} test={test} initialAnswers={storedAnswers} initialResult={initialResult} />
}

function Dialogue({
  caseId, test, initialAnswers, initialResult,
}: {
  caseId: string; test: SelfTest; initialAnswers: TestAnswers; initialResult: TestResult
}) {
  const bestaetigen = useBestaetigen()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { session } = useAuth()
  const threadType = `content_${test.slug}` as ThreadType
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const [committed, setCommitted] = useState<TestAnswers>(initialAnswers)
  const [draft, setDraft] = useState<TestAnswers>(initialAnswers)
  const [result, setResult] = useState<TestResult>(initialResult)
  const [input, setInput] = useState('')
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'chat' | 'overview'>('chat')
  const [delta, setDelta] = useState<ResultDelta | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [savedSummary, setSavedSummary] = useState(false)

  const dirty = useMemo(
    () => test.questions.some((q) => q.type !== 'text' && JSON.stringify(draft[q.id]) !== JSON.stringify(committed[q.id])),
    [test, draft, committed],
  )

  const startTrigger = useMemo(() => buildStartTrigger(test, initialResult, initialAnswers), [test, initialResult, initialAnswers])

  const { data: history = [], isSuccess: historyLoaded } = useQuery({
    queryKey: ['test-echo-history', caseId, threadType],
    queryFn: () => echoApi.history(caseId, threadType),
    refetchOnWindowFocus: false,
    retry: false,
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) => echoApi.chat(caseId, { message, thread_type: threadType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['test-echo-history', caseId, threadType] })
      setPendingMessage(null)
    },
    onError: () => setPendingMessage(null),
    retry: false,
  })

  const resetMutation = useMutation({
    mutationFn: () => echoApi.resetTopicHistory(caseId, threadType),
    onSuccess: () => {
      startedRef.current = false
      qc.invalidateQueries({ queryKey: ['test-echo-history', caseId, threadType] })
    },
  })

  const summaryMutation = useMutation({
    mutationFn: () => echoApi.topicSummary(caseId, threadType),
    onSuccess: (d) => { setSummary(d.summary); setSavedSummary(false); setMobileView('chat') },
  })
  const saveSummaryMutation = useMutation({
    mutationFn: () => topicSummariesApi.save(caseId, threadType, summary!),
    onSuccess: () => { setSavedSummary(true); qc.invalidateQueries({ queryKey: ['topic-summaries', caseId] }) },
  })

  // Auto-Start: rich Seed nur, wenn noch kein Gespräch existiert.
  useEffect(() => {
    if (!historyLoaded || startedRef.current) return
    startedRef.current = true
    const already = (history as EchoMessage[]).some((m) => m.content === startTrigger || m.role === 'assistant')
    if (!already) chatMutation.mutate(startTrigger)
  }, [historyLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, chatMutation.isPending])

  const send = (message: string) => {
    if (!message.trim() || chatMutation.isPending) return
    setPendingMessage(message)
    chatMutation.mutate(message)
    setMobileView('chat')
  }

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg) return
    setInput('')
    send(msg)
  }

  const discuss = (q: TestQuestion) => {
    send(
      `Ich möchte über diese Frage sprechen: „${q.text}" Meine Antwort war: ${answerLabel(q, committed[q.id])}. ` +
      `Was will die Frage erfassen, und wie ist meine Antwort dazu einzuordnen?`,
    )
  }

  const recompute = () => {
    const changes: AnswerChange[] = test.questions
      .filter((q) => q.type !== 'text' && JSON.stringify(draft[q.id]) !== JSON.stringify(committed[q.id]))
      .map((q) => ({ question: q, before: committed[q.id], after: draft[q.id] }))
    const newResult = scoreTest(test, draft)
    if (result.mode === 'dimensional' && newResult.mode === 'dimensional') {
      setDelta({
        before: { score: result.overall?.score ?? 0, label: result.overall?.band?.label },
        after: { score: newResult.overall?.score ?? 0, label: newResult.overall?.band?.label },
      })
    }
    setCommitted(draft)
    setResult(newResult)
    saveTestResult(newResult)
    saveTestAnswers(test.slug, draft)
    if (session) {
      testResultsApi.save(test.slug, { title: test.title, category: test.category, result: newResult }).catch(() => {})
    }
    if (changes.length) send(buildRevisionMessage(changes, newResult))
  }

  const restart = async () => {
    if (chatMutation.isPending || resetMutation.isPending) return
    if (await bestaetigen({ titel: 'Gespräch neu starten?', text: 'Der bisherige Verlauf wird gelöscht. Echo beginnt frisch mit deinem aktuellen Testergebnis.', knopf: 'Neu starten', gefahr: true })) {
      resetMutation.mutate()
    }
  }
  // Nach Reset frisch seeden.
  useEffect(() => {
    if (resetMutation.isSuccess && !startedRef.current) {
      startedRef.current = true
      chatMutation.mutate(buildStartTrigger(test, result, committed))
      resetMutation.reset()
    }
  }, [resetMutation.isSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleMessages = (history as EchoMessage[]).filter((m) => m.content !== startTrigger && !m.content.startsWith('__test_start__|'))
  const overallChip = result.mode === 'dimensional' ? result.overall?.band?.label : result.primary?.name

  return (
    <AppShell>
      <CaseNav caseId={caseId} />
      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 49px)' }}>
        {/* Sub-Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-brand-border bg-white px-5 py-2.5">
          <div className="min-w-0">
            <span className="label text-xs">Ergebnis-Dialog</span>
            <p className="truncate text-sm font-semibold text-navy">{test.title}{overallChip ? ` · ${overallChip}` : ''}</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button onClick={() => summaryMutation.mutate()} disabled={summaryMutation.isPending || visibleMessages.length === 0}
              className="rounded-brand border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-40">
              {summaryMutation.isPending ? 'Fasse zusammen …' : 'Verständnis festhalten'}
            </button>
            <button onClick={restart} disabled={resetMutation.isPending}
              className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-brand-muted transition-colors hover:bg-brand-bg disabled:opacity-40">
              Neu starten
            </button>
            <button onClick={() => navigate(`/app/cases/${caseId}`)}
              className="text-xs text-brand-muted transition-colors hover:text-navy">← Zurück</button>
          </div>
        </div>

        {/* Mobile-Umschalter */}
        <div className="flex flex-shrink-0 border-b border-brand-border lg:hidden">
          {(['chat', 'overview'] as const).map((v) => (
            <button key={v} onClick={() => setMobileView(v)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${mobileView === v ? 'border-b-2 border-accent text-accent' : 'text-brand-muted'}`}>
              {v === 'chat' ? 'Gespräch' : 'Test-Übersicht'}
            </button>
          ))}
        </div>

        {/* Zwei Spalten */}
        <div className="flex min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_390px]">
          {/* Chat */}
          <div className={`min-w-0 flex-col ${mobileView === 'chat' ? 'flex' : 'hidden'} lg:flex`}>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[780px] space-y-4 px-5 py-6">
                <div className="rounded-brand border border-accent/30 bg-accent/5 px-4 py-3">
                  <span className="mb-0.5 inline-block text-[10px] font-bold uppercase tracking-wider text-accent">Aus den Selbsttests</span>
                  <p className="text-xs leading-relaxed text-brand-muted">
                    Echo kennt deinen kompletten Test. Es beginnt mit deinem Gesamtergebnis und fragt, wie sehr du es teilst.
                    Rechts kannst du einzelne Fragen besprechen und Antworten anpassen – danach berechnet Echo dein Ergebnis neu.
                    Kein festes Urteil, sondern ein besseres Verständnis deiner Situation. Ohne Diagnose.
                  </p>
                </div>

                {visibleMessages.map((msg) => (
                  <ChatMessage key={msg.id} content={msg.content} isUser={msg.role === 'user'}
                    safetyLevel={msg.role === 'assistant' ? safetyLevelFromMeta(msg.metadata) : undefined} />
                ))}
                {pendingMessage && chatMutation.isPending && <ChatMessage content={pendingMessage} isUser />}
                {chatMutation.isPending && <TypingIndicator />}
                {chatMutation.isError && (
                  <ChatErrorMessage text={apiErrorMessage(chatMutation.error, 'Echo konnte nicht antworten. Bitte versuche es erneut.')} />
                )}
                {summary && (
                  <div className="rounded-brand border border-accent/30 bg-accent/5 px-5 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-accent">So verstehe ich deine Situation</p>
                      <button onClick={() => setSummary(null)} className="text-xs text-brand-muted transition-colors hover:text-navy">✕ Schließen</button>
                    </div>
                    <div className="mb-4 text-sm leading-relaxed text-brand-text"><MarkdownMessage content={summary} /></div>
                    {savedSummary ? (
                      <span className="text-xs font-medium text-green-600">✓ Als Notiz zum Fall gespeichert</span>
                    ) : (
                      <button onClick={() => saveSummaryMutation.mutate()} disabled={saveSummaryMutation.isPending}
                        className="rounded-brand border border-accent bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40">
                        {saveSummaryMutation.isPending ? 'Speichert …' : 'Als Notiz zum Fall speichern'}
                      </button>
                    )}
                  </div>
                )}
                {summaryMutation.isError && (
                  <div className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    Zusammenfassung konnte nicht erstellt werden.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="flex-shrink-0 px-5 pb-4 pt-2">
              <ChatComposer value={input} onChange={setInput} onSend={handleSend}
                pending={chatMutation.isPending} placeholder="Schreibe Echo …"
                hint="Nichts wird als Urteil festgeschrieben – ihr klärt gemeinsam, wie deine Situation ist." />
            </div>
          </div>

          {/* Übersicht */}
          <aside className={`min-h-0 border-brand-border bg-brand-bg/40 lg:border-l ${mobileView === 'overview' ? 'flex' : 'hidden'} flex-col lg:flex`}>
            <TestOverviewPanel
              test={test}
              result={result}
              draft={draft}
              dirty={dirty}
              delta={delta}
              recomputing={chatMutation.isPending}
              onRevise={(id, v) => { setDelta(null); setDraft((prev) => ({ ...prev, [id]: v })) }}
              onResetDraft={() => { setDelta(null); setDraft(committed) }}
              onRecompute={recompute}
              onDiscuss={discuss}
            />
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
