/**
 * /app/cases/:caseId/topics/:topicId — KI-gestützter Themendialog
 * Themen: topic_self, topic_person, topic_responsibility, topic_guilt
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import ChatComposer from '@/components/app/ChatComposer'
import { ChatMessage, TypingIndicator, ChatErrorMessage } from '@/components/app/ChatMessage'
import { echoApi } from '@/api/echo'
import { topicSummariesApi } from '@/api/topicSummaries'
import { apiErrorText } from '@/utils/apiError'
import type { EchoMessage, ThreadType } from '@/types'

const TOPICS: Record<string, { label: string; description: string; startTrigger: string; isBlog?: boolean }> = {
  topic_self: {
    label: 'Über mich',
    description: 'Erkunde deine eigenen Muster, Bedürfnisse und Reaktionen in dieser Beziehung.',
    startTrigger: '__topic_self_start__',
  },
  topic_person: {
    label: 'Über die Fallperson',
    description: 'Lerne die andere Person besser zu verstehen – ihre mögliche Perspektive und Geschichte.',
    startTrigger: '__topic_person_start__',
  },
  topic_responsibility: {
    label: 'Verantwortung',
    description: 'Kläre, was in deiner Verantwortung liegt – und was nicht.',
    startTrigger: '__topic_responsibility_start__',
  },
  topic_guilt: {
    label: 'Schuld',
    description: 'Erforsche, woher dein Schuldgefühl kommt und ob es wirklich dir gehört.',
    startTrigger: '__topic_guilt_start__',
  },
  // Blog-Themen
  blog_beziehungsmuster: {
    label: 'Beziehungsmuster erkennen',
    description: 'Welche Muster erkennst du in deiner eigenen Beziehungssituation? Echo hilft dir, sie zu benennen und zu verstehen.',
    startTrigger: '__blog_beziehungsmuster_start__',
    isBlog: true,
  },
  blog_beobachtung_gefuehl: {
    label: 'Beobachtung, Gefühl, Interpretation',
    description: 'Übe das Trennen von Wahrnehmung, Emotion und Schlussfolgerung – anhand konkreter Situationen aus deinem Fall.',
    startTrigger: '__blog_beobachtung_gefuehl_start__',
    isBlog: true,
  },
  blog_professionelle_hilfe: {
    label: 'Wann professionelle Hilfe sinnvoll ist',
    description: 'Reflektiere gemeinsam mit Echo, was du gerade erlebst – und ob professionelle Unterstützung ein nächster Schritt sein könnte.',
    startTrigger: '__blog_professionelle_hilfe_start__',
    isBlog: true,
  },
  blog_krisentelefone: {
    label: 'Krisentelefone & Anlaufstellen',
    description: 'Besprich mit Echo, wie es dir gerade geht, und erhalte Orientierung zu verfügbaren Unterstützungsangeboten.',
    startTrigger: '__blog_krisentelefone_start__',
    isBlog: true,
  },
}

export default function TopicDialogPage() {
  const { caseId, topicId } = useParams<{ caseId: string; topicId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [input, setInput] = useState('')
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [savedSummary, setSavedSummary] = useState(false)
  const sessionId = topicId ?? ''

  const topic = TOPICS[topicId ?? '']

  const { data: history = [], isSuccess: historyLoaded } = useQuery({
    queryKey: ['topic-echo-history', caseId, topicId, sessionId],
    queryFn: () => echoApi.history(caseId!, topicId!),
    enabled: !!caseId && !!topicId && !!topic,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      echoApi.chat(caseId!, {
        message,
        thread_type: topicId as ThreadType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topic-echo-history', caseId, topicId, sessionId] })
      setInput('')
      setPendingMessage(null)
    },
    onError: () => {
      setPendingMessage(null)
    },
    retry: false,
  })

  // startedRef zurücksetzen wenn Thema wechselt (selbe Komponenten-Instanz)
  useEffect(() => {
    startedRef.current = false
  }, [topicId])

  // Auto-Start
  useEffect(() => {
    if (!historyLoaded || startedRef.current || !topic) return
    startedRef.current = true
    const alreadyStarted = (history as EchoMessage[]).some(
      m => m.content === topic.startTrigger || m.role === 'assistant'
    )
    if (!alreadyStarted) {
      chatMutation.mutate(topic.startTrigger)
    }
  }, [historyLoaded, topicId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, chatMutation.isPending])

  const summaryMutation = useMutation({
    mutationFn: () => echoApi.topicSummary(caseId!, topicId!),
    onSuccess: (data) => { setSummary(data.summary); setSavedSummary(false) },
  })

  const saveSummaryMutation = useMutation({
    mutationFn: () => topicSummariesApi.save(caseId!, topicId!, summary!),
    onSuccess: () => {
      setSavedSummary(true)
      qc.invalidateQueries({ queryKey: ['topic-summaries', caseId] })
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => echoApi.resetTopicHistory(caseId!, topicId!),
    onSuccess: () => {
      setSummary(null)
      startedRef.current = false
      qc.invalidateQueries({ queryKey: ['topic-echo-history', caseId, topicId, sessionId] })
    },
  })

  const handleReset = () => {
    if (window.confirm('Dialog wirklich zurücksetzen? Alle Nachrichten werden gelöscht.')) {
      resetMutation.mutate()
    }
  }

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || chatMutation.isPending) return
    const msg = input.trim()
    setInput('')
    setPendingMessage(msg)
    chatMutation.mutate(msg)
  }

  const visibleMessages = topic
    ? (history as EchoMessage[]).filter(m => m.content !== topic.startTrigger)
    : []

  if (!topic) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="px-6 py-10 text-sm text-red-600">Unbekanntes Thema.</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 49px)' }}>
        {/* Sub-Header */}
        <div className="border-b border-brand-border bg-white px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
          <div>
            <span className="label text-xs">Themendialog</span>
            <p className="text-sm font-semibold text-navy">{topic.label}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => summaryMutation.mutate()}
              disabled={summaryMutation.isPending || visibleMessages.length === 0}
              className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-navy hover:bg-brand-bg transition-colors disabled:opacity-40"
            >
              {summaryMutation.isPending ? 'Wird erstellt …' : 'Zusammenfassung'}
            </button>
            <button
              onClick={handleReset}
              disabled={resetMutation.isPending || visibleMessages.length === 0}
              className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              Zurücksetzen
            </button>
            <button
              onClick={() => navigate(`/app/cases/${caseId}`)}
              className="text-xs text-brand-muted hover:text-navy transition-colors ml-2"
            >
              ← Zurück
            </button>
          </div>
        </div>

        {/* Chat-Bereich */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6 space-y-4">
            {/* Kontext-Hinweis */}
            <div className={`rounded-brand border px-4 py-3 ${topic.isBlog ? 'border-accent/30 bg-accent/5' : 'border-brand-border bg-blue-50'}`}>
              {topic.isBlog && (
                <span className="inline-block text-[10px] font-bold tracking-wider uppercase text-accent mb-1">Aus dem Blog</span>
              )}
              <p className="text-xs font-medium text-navy mb-0.5">{topic.label}</p>
              <p className="text-xs text-brand-muted">{topic.description}</p>

              {!topic.isBlog && (
                <p className="text-xs text-brand-muted mt-2 pt-2 border-t border-navy/10">
                  <strong className="text-navy">Wozu dieser Dialog?</strong>{' '}
                  Deine Antworten hier verbessern dein Nutzer- und Beziehungsprofil. Erstelle am Ende über{' '}
                  <strong className="text-navy">„Zusammenfassung"</strong> die Essenz des Gesprächs und speichere sie –
                  Echo berücksichtigt sie künftig in allen Gesprächen und Berichten.
                </p>
              )}
              <p className="text-xs text-brand-muted mt-2">
                Du möchtest frei mit Echo sprechen?{' '}
                <Link to={`/app/cases/${caseId}/echo`} className="text-accent font-medium hover:underline">
                  Zum Echo-Chat →
                </Link>
              </p>
            </div>

            {/* Nachrichten */}
            {visibleMessages.map((msg) => (
              <ChatMessage key={msg.id} content={msg.content} isUser={msg.role === 'user'} />
            ))}

            {pendingMessage && chatMutation.isPending && (
              <ChatMessage content={pendingMessage} isUser />
            )}

            {chatMutation.isPending && <TypingIndicator />}

            {chatMutation.isError && (
              <ChatErrorMessage text={apiErrorText(chatMutation.error, 'Echo konnte nicht antworten. Bitte versuche es erneut.')} />
            )}

            {/* Zusammenfassung am Ende des Dialogs */}
            {summary && (
              <div className="rounded-brand border border-accent/30 bg-accent/5 px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-accent uppercase tracking-wide">Zusammenfassung</p>
                  <button
                    onClick={() => setSummary(null)}
                    className="text-xs text-brand-muted hover:text-navy transition-colors"
                  >
                    ✕ Schließen
                  </button>
                </div>
                <p className="text-sm text-brand-text whitespace-pre-wrap mb-4">{summary}</p>
                <div className="flex items-center gap-3">
                  {savedSummary ? (
                    <span className="text-xs text-green-600 font-medium">✓ Gespeichert</span>
                  ) : (
                    <button
                      onClick={() => saveSummaryMutation.mutate()}
                      disabled={saveSummaryMutation.isPending}
                      className="rounded-brand border border-accent bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
                    >
                      {saveSummaryMutation.isPending ? 'Wird gespeichert …' : 'Zusammenfassung speichern'}
                    </button>
                  )}
                </div>
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

        {/* Eingabe */}
        <div className="px-6 pb-5 pt-2 flex-shrink-0">
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            pending={chatMutation.isPending}
            placeholder="Schreibe Echo …"
          />
        </div>
      </div>
    </AppShell>
  )
}
