/**
 * /app/cases/:caseId/hypotheses/:hypothesisId — Hypothesen-Dialog
 * Geführtes Echo-Gespräch zu einer Arbeitshypothese (tastend, keine Diagnose).
 * Echo kennt den vollen Fallkontext inkl. Verlauf und gespeicherter Hypothesen.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import ChatComposer from '@/components/app/ChatComposer'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import HypothesisIcon from '@/components/HypothesisIcon'
import { ChatMessage, TypingIndicator, ChatErrorMessage, safetyLevelFromMeta } from '@/components/app/ChatMessage'
import { echoApi } from '@/api/echo'
import { useEchoStrom } from '@/lib/echoStrom'
import { mitlaufen } from '@/lib/mitlaufen'
import { hypothesesApi, HYPOTHESES } from '@/api/hypotheses'
import { apiErrorMessage } from '@/api/errors'
import type { EchoMessage, ThreadType } from '@/types'
import { useBestaetigen } from '@/components/Bestaetigung'
import DialogKopf, { DialogKopfKnopf } from '@/components/app/DialogKopf'
import ArtefaktErzeugen from '@/components/app/ArtefaktErzeugen'
import AntwortZuege from '@/components/app/AntwortZuege'

export default function HypothesisDialogPage() {
  const bestaetigen = useBestaetigen()
  const { caseId, hypothesisId } = useParams<{ caseId: string; hypothesisId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [input, setInput] = useState('')
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [savedSummary, setSavedSummary] = useState(false)
  const [showExamples, setShowExamples] = useState(true)

  const hyp = HYPOTHESES.find(h => h.id === hypothesisId)
  const startTrigger = `__${hypothesisId}_start__`

  const { data: history = [], isSuccess: historyLoaded } = useQuery({
    queryKey: ['hyp-echo-history', caseId, hypothesisId],
    queryFn: () => echoApi.history(caseId!, hypothesisId!),
    enabled: !!caseId && !!hypothesisId && !!hyp,
    refetchOnWindowFocus: false,
    retry: false,
  })

  /**
   * Echos Antwort entsteht sichtbar, statt als fertiger Block zu erscheinen.
   *
   * Der Eröffnungszug (`__…_start__`) ist davon ausgenommen: Steuerbefehle lehnt der
   * Strom-Endpunkt mit 409 ab, und `useEchoStrom` nimmt dafür still den gewöhnlichen Weg.
   */
  const strom = useEchoStrom(caseId!, {
    onFertig: (data) => {
      // Die fertige Antwort wandert DIREKT in den Zwischenspeicher, statt den Verlauf
      // nachzuladen. Nachladen hieße warten — und in der Wartezeit stünden die beiden
      // Nachrichten weder vorläufig noch gespeichert da, das Gespräch blinkte kurz leer.
      qc.setQueryData<EchoMessage[]>(
        ['hyp-echo-history', caseId, hypothesisId],
        alt => [...(alt ?? []), data.user_message, data.assistant_message],
      )
      setInput('')
      setPendingMessage(null)
    },
    onFehler: (anfrage) => {
      // Der Text kommt zurück ins Feld. Sonst müsste man eine lange Nachricht ausgerechnet
      // dann neu formulieren, wenn ohnehin gerade etwas nicht funktioniert.
      if (!anfrage.message.startsWith('__')) setInput(v => v || anfrage.message)
      setPendingMessage(null)
    },
  })

  const senden = (message: string) =>
    strom.senden({ message, thread_type: hypothesisId as ThreadType })

  useEffect(() => { startedRef.current = false }, [hypothesisId])

  useEffect(() => {
    if (!historyLoaded || startedRef.current || !hyp) return
    startedRef.current = true
    const alreadyStarted = (history as EchoMessage[]).some(m => m.content === startTrigger || m.role === 'assistant')
    if (!alreadyStarted) senden(startTrigger)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded, hypothesisId])

  useEffect(() => {
    mitlaufen(messagesEndRef.current, strom.beschaeftigt)
  }, [history, strom.beschaeftigt, strom.takt.sichtbar])

  const summaryMutation = useMutation({
    mutationFn: () => hypothesesApi.generate(caseId!, hypothesisId!),
    onSuccess: (data) => { setSummary(data.summary); setSavedSummary(false) },
  })
  const saveSummaryMutation = useMutation({
    mutationFn: () => hypothesesApi.save(caseId!, hypothesisId!, summary!),
    onSuccess: () => { setSavedSummary(true); qc.invalidateQueries({ queryKey: ['hypotheses', caseId] }) },
  })
  const resetMutation = useMutation({
    mutationFn: () => echoApi.resetTopicHistory(caseId!, hypothesisId!),
    onSuccess: () => {
      // Ein noch laufender Strom schriebe seine Antwort sonst in den gerade
      // geleerten Verlauf zurueck.
      strom.verwerfen()
      setSummary(null)
      startedRef.current = false
      qc.invalidateQueries({ queryKey: ['hyp-echo-history', caseId, hypothesisId] })
    },
  })

  const handleReset = async () => {
    if (await bestaetigen({ titel: 'Dialog zurücksetzen?', text: 'Alle Nachrichten dieses Dialogs werden gelöscht, und Echo beginnt von vorn.', knopf: 'Zurücksetzen', gefahr: true })) resetMutation.mutate()
  }
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || strom.beschaeftigt) return
    const msg = input.trim()
    setInput('')
    setPendingMessage(msg)
    senden(msg)
  }

  const handleExample = (q: string) => {
    if (strom.beschaeftigt) return
    setShowExamples(false)
    setPendingMessage(q)
    senden(q)
  }

  const visibleMessages = hyp ? (history as EchoMessage[]).filter(m => m.content !== startTrigger) : []

  /**
   * Die letzte Nachricht, WENN sie von Echo ist - sonst nichts.
   *
   * Steht am Ende eine eigene Nachricht, wartet man noch auf die Antwort; dann waere
   * ein Zug ins Leere gerichtet.
   */
  const letzteAntwort = visibleMessages.length > 0
    && visibleMessages[visibleMessages.length - 1].role === 'assistant'
    ? visibleMessages[visibleMessages.length - 1]
    : null

  if (!hyp) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="px-6 py-10 text-sm text-red-600">Unbekannte Hypothese.</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 49px)' }}>
        {/* Sub-Header */}
        <DialogKopf
          augenbraue="Hypothese"
          titel={hyp.label}
          symbol={<HypothesisIcon path={hyp.icon} size="sm" />}
          onZurueck={() => navigate(`/app/cases/${caseId}/hypotheses`)}
        >
          <ArtefaktErzeugen
            caseId={caseId!}
            threadType={hypothesisId!}
            eigeneBeitraege={visibleMessages.filter(m => m.role === 'user').length}
            beschaeftigt={strom.beschaeftigt}
          />
          <DialogKopfKnopf
            onClick={() => summaryMutation.mutate()}
            disabled={summaryMutation.isPending || visibleMessages.length === 0}
          >
            {summaryMutation.isPending ? 'Wird erstellt …' : 'Hypothese zusammenfassen'}
          </DialogKopfKnopf>
          <DialogKopfKnopf
            onClick={handleReset}
            disabled={resetMutation.isPending || visibleMessages.length === 0}
            gefahr
          >
            Zurücksetzen
          </DialogKopfKnopf>
        </DialogKopf>

        {/* Chat-Bereich */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6 space-y-4">
            {/* Hinweis */}
            <div className="rounded-brand border border-accent/30 bg-accent/5 px-4 py-3">
              <p className="text-xs font-medium text-navy mb-0.5">{hyp.label}</p>
              <p className="text-xs text-brand-muted">{hyp.description}</p>
              <p className="text-xs text-brand-muted mt-2 pt-2 border-t border-navy/10">
                <strong className="text-navy">Wichtig:</strong> Dies ist ein tastender Reflexionsdialog. Echo entwickelt{' '}
                <strong className="text-navy">Hypothesen, keine Diagnosen</strong>. Über{' '}
                <strong className="text-navy">„Hypothese zusammenfassen"</strong> speicherst du die Essenz – sie erscheint im Überblick und fließt als Kontext in weitere Gespräche ein.
              </p>
            </div>

            {visibleMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                content={msg.content}
                isUser={msg.role === 'user'}
                safetyLevel={msg.role === 'assistant' ? safetyLevelFromMeta(msg.metadata) : undefined}
              />
            ))}

            {pendingMessage && strom.beschaeftigt && <ChatMessage content={pendingMessage} isUser />}

            {/* Die Antwort, während sie entsteht. Sie verschwindet erst in dem Moment, in
                dem die gespeicherte erscheint — sonst stünde sie kurz doppelt oder gar
                nicht da. Den Punktindikator gibt es nur noch, solange kein Wort da ist. */}
            {strom.takt.sichtbar && (
              <ChatMessage content={strom.takt.sichtbar} isUser={false} safetyLevel={strom.stromSafety} imFluss />
            )}
            {strom.beschaeftigt && !strom.takt.sichtbar && <TypingIndicator />}

            {strom.fehler != null && (
              <ChatErrorMessage text={apiErrorMessage(strom.fehler, 'Echo konnte nicht antworten. Bitte versuche es erneut.')} />
            )}

            {/* Arbeitshypothese (Zusammenfassung) */}
            {summary && (
              <div className="rounded-brand border border-accent/30 bg-accent/5 px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-accent uppercase tracking-wide">Arbeitshypothese</p>
                  <button onClick={() => setSummary(null)} className="text-xs text-brand-muted hover:text-navy transition-colors">✕ Schließen</button>
                </div>
                <div className="text-sm text-brand-text leading-relaxed mb-4"><MarkdownMessage content={summary} /></div>
                <div className="flex items-center gap-3">
                  {savedSummary ? (
                    <span className="text-xs text-green-600 font-medium">✓ Gespeichert</span>
                  ) : (
                    <button
                      onClick={() => saveSummaryMutation.mutate()}
                      disabled={saveSummaryMutation.isPending}
                      className="rounded-brand border border-accent bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
                    >
                      {saveSummaryMutation.isPending ? 'Wird gespeichert …' : 'Hypothese speichern'}
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

            {/* Zuege unter der letzten Antwort. Nur dort - unter jeder zu stehen waere
                Laerm, und ein Klick weiter oben schickte eine Nachfrage zu etwas, das
                drei Beitraege zurueckliegt. */}
            {!strom.beschaeftigt && letzteAntwort && (
              <AntwortZuege
                onZug={(text) => { setPendingMessage(text); senden(text) }}
                safety={safetyLevelFromMeta(letzteAntwort.metadata)}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Einstiegsfragen + Eingabe */}
        <div className="px-6 pb-5 pt-2 flex-shrink-0">
          {showExamples && hyp.introQuestions.length > 0 && (
            <div className="mx-auto max-w-[780px] mb-2 rounded-2xl border border-brand-border bg-white shadow-[0_4px_24px_rgba(15,30,46,0.08)] px-5 py-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-navy">Beispielfragen zum Einstieg</p>
                <button onClick={() => setShowExamples(false)} className="text-xs text-brand-muted hover:text-navy">
                  ✕ Schließen
                </button>
              </div>
              <p className="text-xs text-brand-muted mb-3">
                Noch unsicher beim Thema? Klick eine Frage – Echo erklärt sie dir, bevor ihr gemeinsam auf deinen Fall schaut.
              </p>
              <div className="flex flex-wrap gap-2">
                {hyp.introQuestions.map(q => (
                  <button
                    key={q}
                    onClick={() => handleExample(q)}
                    disabled={strom.beschaeftigt}
                    className="text-xs px-3 py-1.5 rounded-full border border-brand-border text-brand-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            pending={strom.beschaeftigt}
            placeholder="Schreibe Echo …"
            leftAccessory={
              <button
                type="button"
                onClick={() => setShowExamples(v => !v)}
                title="Beispielfragen zum Einstieg"
                className={`h-9 px-3.5 rounded-full border text-xs font-medium transition-colors ${
                  showExamples
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-brand-border text-brand-muted hover:border-accent/40 hover:text-accent'
                }`}
              >
                Beispiele
              </button>
            }
          />
        </div>
      </div>
    </AppShell>
  )
}
