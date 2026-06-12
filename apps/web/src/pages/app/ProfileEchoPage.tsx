/**
 * /app/profile/echo — Echo-Dialog über das Beziehungsprofil
 * Echo begrüßt, präsentiert eine vorläufige Persönlichkeitsbeschreibung
 * und fragt, ob sie zutreffend ist.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import ChatComposer from '@/components/app/ChatComposer'
import { ChatMessage, TypingIndicator, ChatErrorMessage } from '@/components/app/ChatMessage'
import { profileApi } from '@/api/profile'
import { apiErrorText } from '@/utils/apiError'

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
            {visibleMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                content={msg.content.replace(/\[BESCHREIBUNG\]([\s\S]*?)\[\/BESCHREIBUNG\]/g, '$1').trim()}
                isUser={msg.role === 'user'}
                markdown={false}
              />
            ))}

            {chatMutation.isPending && <TypingIndicator />}

            {chatMutation.isError && (
              <ChatErrorMessage text={apiErrorText(chatMutation.error, 'Echo konnte nicht antworten. Bitte versuche es erneut.')} />
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
        <div className="px-6 pb-5 pt-2">
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            pending={chatMutation.isPending}
            placeholder="Antworte Echo oder stelle eine Frage …"
            hint="Echo stellt keine Diagnosen und ersetzt keine professionelle Beratung oder Therapie."
          />
        </div>
      </div>
    </AppShell>
  )
}
