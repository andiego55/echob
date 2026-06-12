/**
 * /app/cases/:caseId/scenes/echo — Szenenerfassung per Echo-Chat
 * Echo kennt in diesem Dialog keinen Beziehungskontext.
 * Ziel: geführtes Gespräch → Szene extrahieren → speichern.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import ChatComposer from '@/components/app/ChatComposer'
import { ChatMessage, TypingIndicator, ChatErrorMessage } from '@/components/app/ChatMessage'
import { echoApi } from '@/api/echo'
import { apiErrorText } from '@/utils/apiError'

export default function SceneEchoPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  // Stabile Session-ID: beim ersten Render aus URL lesen oder neu generieren
  const [sessionId] = useState<string>(() => {
    return searchParams.get('session') ?? crypto.randomUUID()
  })

  // Session-ID einmalig in die URL schreiben (nach dem ersten Render)
  useEffect(() => {
    if (!searchParams.get('session')) {
      setSearchParams({ session: sessionId }, { replace: true })
    }
  }, [])

  const [input, setInput] = useState('')
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  const { data: history = [], isSuccess: historyLoaded } = useQuery({
    queryKey: ['echo-history', caseId, 'scene', sessionId],
    queryFn: () => echoApi.history(caseId!, 'scene', sessionId),
    enabled: !!caseId && !!sessionId,
    refetchOnWindowFocus: false,
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      echoApi.chat(caseId!, { message, thread_type: 'scene', scene_session_id: sessionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['echo-history', caseId, 'scene', sessionId] })
      setInput('')
      setPendingMessage(null)
    },
    onError: () => {
      setPendingMessage(null)
    },
    retry: false,
  })

  const finalizeMutation = useMutation({
    mutationFn: () => echoApi.finalizeScene(caseId!, sessionId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['scenes', caseId] })
      navigate(`/app/cases/${caseId}/scenes/${result.scene_id}`)
    },
  })

  const addContextMutation = useMutation({
    mutationFn: () =>
      echoApi.chat(caseId!, { message: '__add_context__', thread_type: 'scene', scene_session_id: sessionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['echo-history', caseId, 'scene', sessionId] })
    },
    retry: false,
  })

  // Gespräch automatisch starten – erst wenn History-Query erfolgreich
  useEffect(() => {
    if (!historyLoaded || startedRef.current) return
    if (history.some(m => m.content === '__scene_start__')) {
      startedRef.current = true
      return
    }
    if (history.length === 0) {
      startedRef.current = true
      chatMutation.mutate('__scene_start__')
    }
  }, [historyLoaded, history.length])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, chatMutation.isPending])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || chatMutation.isPending) return
    const msg = input.trim()
    setInput('')
    setPendingMessage(msg)
    chatMutation.mutate(msg)
  }

  // Sichtbare Nachrichten: interne Trigger und Kontext-System-Nachrichten ausblenden
  const visibleMessages = history.filter(
    (m) => m.content !== '__scene_start__' && m.content !== '__add_context__' && m.role !== 'system'
  )

  // Kontext wurde geteilt, wenn eine Nachricht mit context_marker in der History ist
  const contextShared = history.some(
    (m) => m.role === 'system' || (m.metadata as Record<string, unknown>)?.context_marker === true
  )

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="flex flex-col h-[calc(100vh-112px)]">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6 space-y-4">

            {/* Kontext-Hinweis */}
            <div className="rounded-brand border border-brand-border bg-amber-50 px-4 py-3 text-sm text-brand-muted">
              <p className="font-medium text-navy mb-1">Szenenerfassung mit Echo</p>
              <p className="mb-3">
                Halte fest, was dich beschäftigt – eine konkrete Situation, eine Beobachtung an dir
                oder der anderen Person, einen Gedanken oder eine Vermutung. Echo hilft dir beim
                Sortieren. In diesem Dialog kennt Echo deinen Beziehungskontext zunächst nicht.
                Über <strong>„Szene speichern"</strong> kannst du den Eintrag jederzeit erfassen.
              </p>
              {contextShared ? (
                <p className="text-xs text-green-700 font-medium">
                  ✓ Beziehungskontext, bisherige Szenen und Profil sind Echo jetzt bekannt.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => addContextMutation.mutate()}
                  disabled={addContextMutation.isPending || chatMutation.isPending}
                  className="rounded border border-navy/30 bg-white px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/5 transition-colors disabled:opacity-50"
                >
                  {addContextMutation.isPending ? 'Kontext wird geteilt …' : '＋ Beziehungskontext an Echo übergeben'}
                </button>
              )}
            </div>

            {/* Nachrichten */}
            {visibleMessages.map((msg) => (
              <ChatMessage key={msg.id} content={msg.content} isUser={msg.role === 'user'} />
            ))}

            {/* Optimistische Nutzernachricht */}
            {pendingMessage && chatMutation.isPending && (
              <ChatMessage content={pendingMessage} isUser />
            )}

            {/* Tipp-Indikator */}
            {chatMutation.isPending && <TypingIndicator />}

            {chatMutation.isError && (
              <ChatErrorMessage text={apiErrorText(chatMutation.error, 'Echo konnte nicht antworten. Bitte versuche es erneut.')} />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Eingabe + Szene speichern */}
        <div className="px-6 pb-5 pt-2">
          <div className="mx-auto max-w-[780px] space-y-3">

            {/* Szene speichern Button */}
            {visibleMessages.length >= 3 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => finalizeMutation.mutate()}
                  disabled={finalizeMutation.isPending || chatMutation.isPending}
                  className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
                >
                  {finalizeMutation.isPending ? 'Szene wird gespeichert …' : '✓ Szene speichern'}
                </button>
              </div>
            )}

            {finalizeMutation.isError && (
              <p className="text-sm text-red-600 text-right">
                Szene konnte nicht gespeichert werden. Bitte versuche es erneut.
              </p>
            )}

            <ChatComposer
              value={input}
              onChange={setInput}
              onSend={handleSend}
              pending={chatMutation.isPending}
              placeholder="Beschreibe, was du festhalten möchtest …"
            />

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => navigate(`/app/cases/${caseId}/scenes/new`)}
                className="text-xs text-brand-muted hover:text-navy transition-colors"
              >
                ← Zurück zur Moduswahl
              </button>
              <p className="text-xs text-brand-muted/70">
                Echo stellt keine Diagnosen und ersetzt keine professionelle Beratung.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
