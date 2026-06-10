/**
 * /app/profile/echo — Echo-Dialog über das Beziehungsprofil
 * Echo begrüßt, präsentiert eine vorläufige Persönlichkeitsbeschreibung
 * und fragt, ob sie zutreffend ist.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { profileApi } from '@/api/profile'

export default function ProfileEchoPage() {
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [input, setInput] = useState('')
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  const [savedText, setSavedText] = useState<string | null>(null)

  const { data: history = [], isSuccess: historyLoaded } = useQuery({
    queryKey: ['profile-echo-history', sessionId],
    queryFn: () => profileApi.echoHistory(sessionId),
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      profileApi.echoChat({ message, session_id: sessionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile-echo-history', sessionId] })
      setInput('')
    },
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: (text: string) => profileApi.saveSummaryText(text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  // Gespräch automatisch starten – erst wenn die History-Query erfolgreich war
  useEffect(() => {
    if (!historyLoaded || startedRef.current) return
    if (history.some(m => m.content === '__profile_start__')) {
      startedRef.current = true
      return
    }
    if (history.length === 0) {
      startedRef.current = true
      chatMutation.mutate('__profile_start__')
    }
  }, [historyLoaded, history.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, chatMutation.isPending])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || chatMutation.isPending) return
    chatMutation.mutate(input.trim())
  }

  const visibleMessages = history.filter(m => m.content !== '__profile_start__')

  // Extrahiert nur den Text zwischen [BESCHREIBUNG]...[/BESCHREIBUNG] falls vorhanden
  const extractDescription = (text: string): string | null => {
    const match = text.match(/\[BESCHREIBUNG\]([\s\S]*?)\[\/BESCHREIBUNG\]/)
    return match ? match[1].trim() : null
  }

  // Letzter Echo-Text mit einer Beschreibung als Speicherkandidat
  const lastAssistantMsg = [...visibleMessages].reverse().find(m => m.role === 'assistant')
  const extractedDescription = lastAssistantMsg ? extractDescription(lastAssistantMsg.content) : null
  const canSave = !!extractedDescription && !savedText

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Sub-Header */}
        <div className="border-b border-brand-border bg-white px-6 py-3 flex items-center justify-between">
          <div>
            <span className="label text-xs">Beziehungsprofil</span>
            <p className="text-sm font-semibold text-navy">Mit Echo besprechen</p>
          </div>
          <Link to="/app/profile" className="text-xs text-brand-muted hover:text-navy transition-colors">
            ← Zurück zum Profil
          </Link>
        </div>

        {/* Chat-Bereich */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6 space-y-4">
            {/* Kontext-Hinweis */}
            <div className="rounded-brand border border-brand-border bg-amber-50 px-4 py-3 text-sm text-brand-muted">
              <p className="font-medium text-navy mb-1">Echo kennt dein Beziehungsprofil</p>
              <p className="text-xs">
                Echo hat Zugriff auf deine Selbstbeschreibung und stellt dir eine vorläufige Einschätzung vor.
                Die Einschätzung ist nicht diagnostisch – sie ist eine Reflexionshilfe.
              </p>
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
                    isUser ? 'bg-navy text-white' : 'bg-white border border-brand-border text-brand-text'
                  }`}>
                    <p className="whitespace-pre-wrap">
                      {msg.content.replace(/\[BESCHREIBUNG\]([\s\S]*?)\[\/BESCHREIBUNG\]/g, '$1').trim()}
                    </p>
                  </div>
                </div>
              )
            })}

            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm flex-shrink-0">E</div>
                <div className="rounded-brand bg-white border border-brand-border px-4 py-3 text-sm text-brand-muted">
                  Echo tippt …
                </div>
              </div>
            )}

            {chatMutation.isError && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-sm flex-shrink-0">!</div>
                <div className="rounded-brand bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  Echo konnte nicht antworten. Bitte versuche es erneut.
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Beschreibung speichern */}
        {canSave && (
          <div className="border-t border-brand-border bg-amber-50 px-6 py-3">
            <div className="mx-auto max-w-[780px] flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-brand-muted">
                Wenn die letzte Echo-Antwort deine Selbstbeschreibung gut trifft, kannst du sie in deinem Profil speichern.
              </p>
              {savedText ? (
                <span className="text-sm text-green-700 font-medium">✓ Gespeichert</span>
              ) : (
                <button
                  onClick={() => {
                    saveMutation.mutate(extractedDescription!)
                    setSavedText(extractedDescription!)
                  }}
                  disabled={saveMutation.isPending}
                  className="btn-primary !py-1.5 !px-4 !text-sm flex-shrink-0 disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Wird gespeichert …' : 'Beschreibung speichern'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Eingabe */}
        <div className="border-t border-brand-border bg-white px-6 py-4">
          <div className="mx-auto max-w-[780px]">
            <form onSubmit={handleSend} className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                rows={1}
                placeholder="Antworte Echo oder stelle eine Frage …"
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
            <p className="mt-2 text-xs text-brand-muted/70">
              Echo stellt keine Diagnosen und ersetzt keine professionelle Beratung oder Therapie.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
