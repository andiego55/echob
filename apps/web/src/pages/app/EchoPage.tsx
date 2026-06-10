/**
 * /app/cases/:caseId/echo — Echo-Chat
 * Fallbezogener KI-Dialog. Glossar-Begriffe als Schnellauswahl.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { echoApi } from '@/api/echo'
import type { EchoMessage, ThreadType } from '@/types'

const GLOSSARY_TERMS = [
  'Schuldumkehr', 'Grenzverletzung', 'Gaslighting', 'Manipulation',
  'Projektion', 'Idealisierung', 'Abwertung', 'Nähe-Distanz-Wechsel',
  'Kontrolle', 'Isolation', 'Bindung', 'Ambivalenz', 'Trigger',
  'Eskalation', 'Selbstschutz', 'Kontaktabbruch',
]

const TOPIC_SHORTCUTS = [
  'Deine Rolle in der Beziehung',
  'Schuld und Verantwortung',
  'Wahrnehmungsverunsicherung',
  'Grenzen',
  'Trennung',
  'Co-Parenting',
  'Nächste Schritte',
]

export default function EchoPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [input, setInput]           = useState('')
  const [showGlossary, setGlossary] = useState(false)
  const [threadType]                = useState<ThreadType>('topic')

  // Gesprächsverlauf laden
  const { data: history = [] } = useQuery({
    queryKey: ['echo-history', caseId, threadType],
    queryFn: () => echoApi.history(caseId!, threadType),
    enabled: !!caseId,
  })

  const mutation = useMutation({
    mutationFn: (data: { message: string; glossary_term?: string }) =>
      echoApi.chat(caseId!, { ...data, thread_type: threadType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['echo-history', caseId, threadType] })
      setInput('')
    },
  })

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || mutation.isPending) return
    mutation.mutate({ message: input.trim() })
  }

  const handleGlossary = (term: string) => {
    setGlossary(false)
    mutation.mutate({ message: `Erkläre mir den Begriff: ${term}`, glossary_term: term })
  }

  const handleTopic = (topic: string) => {
    mutation.mutate({ message: `Ich möchte über folgendes Thema sprechen: ${topic}` })
  }

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="flex flex-col h-[calc(100vh-112px)]">
        {/* Chat-Bereich */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6 space-y-4">

            {/* Begrüßung wenn leer */}
            {history.length === 0 && !mutation.isPending && (
              <WelcomePrompt onTopic={handleTopic} />
            )}

            {/* Nachrichten */}
            {history.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Tipp-Indikator */}
            {mutation.isPending && (
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

        {/* Glossar-Overlay */}
        {showGlossary && (
          <div className="border-t border-brand-border bg-white px-6 py-4">
            <div className="mx-auto max-w-[780px]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-navy">Glossar – Begriff auswählen</p>
                <button onClick={() => setGlossary(false)} className="text-xs text-brand-muted hover:text-navy">
                  ✕ Schließen
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {GLOSSARY_TERMS.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleGlossary(term)}
                    className="text-xs px-3 py-1.5 rounded-full border border-brand-border text-brand-muted hover:border-accent hover:text-accent transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Eingabe */}
        <div className="border-t border-brand-border bg-white px-6 py-4">
          <div className="mx-auto max-w-[780px]">
            <form onSubmit={handleSend} className="flex gap-3">
              <button
                type="button"
                onClick={() => setGlossary((v) => !v)}
                title="Glossar öffnen"
                className={`flex-shrink-0 px-3 py-2.5 rounded-brand border text-sm transition-colors ${
                  showGlossary
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-brand-border text-brand-muted hover:border-accent/40'
                }`}
              >
                Glossar
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                rows={1}
                placeholder="Schreib Echo eine Nachricht … (Enter zum Senden, Shift+Enter für neue Zeile)"
                className="flex-1 rounded-brand border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || mutation.isPending}
                className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0 disabled:opacity-50"
              >
                Senden
              </button>
            </form>
            <p className="mt-2 text-xs text-brand-muted/70">
              Echo stellt keine Diagnosen und ersetzt keine professionelle Beratung.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function MessageBubble({ message: msg }: { message: EchoMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
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
}

function WelcomePrompt({ onTopic }: { onTopic: (t: string) => void }) {
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-xl mx-auto mb-4">
        💬
      </div>
      <h2 className="text-lg font-bold text-navy mb-2">Echo ist bereit</h2>
      <p className="text-sm text-brand-muted mb-6 max-w-md mx-auto">
        Du kannst frei schreiben oder ein Thema auswählen.
        Echo hilft dir, Gedanken zu sortieren und Muster zu reflektieren.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {TOPIC_SHORTCUTS.map((topic) => (
          <button
            key={topic}
            onClick={() => onTopic(topic)}
            className="text-sm px-4 py-2 rounded-brand border border-brand-border text-brand-muted hover:border-accent hover:text-accent transition-colors"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  )
}
