/**
 * /app/cases/:caseId/person-profile/echo — Echo-Dialog über die andere Person
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import ChatComposer from '@/components/app/ChatComposer'
import { ChatMessage, TypingIndicator, ChatErrorMessage } from '@/components/app/ChatMessage'
import { personProfileApi } from '@/api/personProfile'
import { casesApi } from '@/api/cases'
import { RELATIONSHIP_TYPE_LABELS } from '@/types'

export default function PersonProfileEchoPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [input, setInput] = useState('')
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  const [savedText, setSavedText] = useState<string | null>(null)

  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesApi.get(caseId!),
    enabled: !!caseId,
  })

  const { data: history = [], isSuccess: historyLoaded } = useQuery({
    queryKey: ['person-profile-echo-history', caseId, sessionId],
    queryFn: () => personProfileApi.echoHistory(caseId!, sessionId),
    enabled: !!caseId && !!sessionId,
    refetchOnWindowFocus: false,
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      personProfileApi.echoChat(caseId!, { message, session_id: sessionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person-profile-echo-history', caseId, sessionId] })
      setInput('')
    },
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: (text: string) => personProfileApi.saveSummaryText(caseId!, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person-profile', caseId] })
    },
  })

  // Gespräch automatisch starten
  useEffect(() => {
    if (!historyLoaded || startedRef.current) return
    if ((history as { content: string }[]).some(m => m.content === '__person_profile_start__')) {
      startedRef.current = true
      return
    }
    if ((history as unknown[]).length === 0) {
      startedRef.current = true
      chatMutation.mutate('__person_profile_start__')
    }
  }, [historyLoaded, (history as unknown[]).length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, chatMutation.isPending])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || chatMutation.isPending) return
    chatMutation.mutate(input.trim())
  }

  const visibleMessages = (history as { id: string; role: string; content: string }[]).filter(
    m => m.content !== '__person_profile_start__'
  )

  const extractDescription = (text: string): string | null => {
    const match = text.match(/\[BESCHREIBUNG\]([\s\S]*?)\[\/BESCHREIBUNG\]/)
    return match ? match[1].trim() : null
  }

  const lastAssistantMsg = [...visibleMessages].reverse().find(m => m.role === 'assistant')
  const extractedDescription = lastAssistantMsg ? extractDescription(lastAssistantMsg.content) : null
  const canSave = !!extractedDescription && !savedText

  const relationshipLabel = caseData ? RELATIONSHIP_TYPE_LABELS[caseData.relationship_type] : ''

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="flex flex-col h-[calc(100vh-56px-48px)]">
        {/* Sub-Header */}
        <div className="border-b border-brand-border bg-white px-6 py-3 flex items-center justify-between">
          <div>
            <span className="label text-xs">Personenprofil</span>
            <p className="text-sm font-semibold text-navy">
              Mit Echo besprechen
              {relationshipLabel && <span className="font-normal text-brand-muted ml-1">– {relationshipLabel}</span>}
            </p>
          </div>
          <Link to={`/app/cases/${caseId}/person-profile`} className="text-xs text-brand-muted hover:text-navy transition-colors">
            ← Zurück zum Personenprofil
          </Link>
        </div>

        {/* Chat-Bereich */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6 space-y-4">
            {/* Kontext-Hinweis */}
            <div className="rounded-brand border border-brand-border bg-amber-50 px-4 py-3 text-sm text-brand-muted">
              <p className="font-medium text-navy mb-1">Echo kennt deine Einschätzung der anderen Person</p>
              <p className="text-xs">
                Echo hat Zugriff auf dein Personenprofil und stellt dir eine vorläufige Einschätzung vor.
                Die Beschreibung ist nicht diagnostisch – sie ist eine Reflexionshilfe auf Basis deiner subjektiven Schilderung.
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

            {chatMutation.isError && <ChatErrorMessage />}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Beschreibung speichern */}
        {canSave && (
          <div className="border-t border-brand-border bg-amber-50 px-6 py-3">
            <div className="mx-auto max-w-[780px] flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-brand-muted">
                Wenn die Echo-Beschreibung deine Einschätzung gut trifft, kannst du sie im Personenprofil speichern.
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
