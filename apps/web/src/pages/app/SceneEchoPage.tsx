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
import { echoApi } from '@/api/echo'

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
    chatMutation.mutate(input.trim())
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
                In diesem Dialog kennt Echo deinen Beziehungskontext nicht – es geht nur darum,
                diese eine Szene zu beschreiben. Du kannst die Szene jederzeit über den Button{' '}
                <strong>„Szene speichern"</strong> erfassen.
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
            {visibleMessages.map((msg) => {
              const isUser = msg.role === 'user'
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isUser ? 'bg-navy text-white' : 'bg-accent/20 text-accent'
                  }`}>
                    {isUser ? 'Du' : 'E'}
                  </div>
                  <div className={`max-w-[80%] rounded-brand px-4 py-3 text-sm ${
                    isUser
                      ? 'bg-navy text-white'
                      : 'bg-white border border-brand-border text-brand-text'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              )
            })}

            {/* Tipp-Indikator */}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm flex-shrink-0">
                  E
                </div>
                <div className="rounded-brand bg-white border border-brand-border px-4 py-3 text-sm text-brand-muted">
                  Echo tippt …
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Eingabe + Szene speichern */}
        <div className="border-t border-brand-border bg-white px-6 py-4">
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

            <form onSubmit={handleSend} className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                rows={1}
                placeholder="Beschreibe, was passiert ist … (Enter zum Senden)"
                disabled={chatMutation.isPending}
                className="flex-1 rounded-brand border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || chatMutation.isPending}
                className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0 disabled:opacity-50"
              >
                Senden
              </button>
            </form>

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
