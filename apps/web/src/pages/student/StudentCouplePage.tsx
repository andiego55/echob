/**
 * /student/cases/:id/couple — Paar-Analyse (nur bei Fällen mit Partnerperson).
 * Allparteilicher Paar-Echo-Dialog über beide Personen (primary + partner).
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import ChatComposer from '@/components/app/ChatComposer'
import { ChatMessage, TypingIndicator, ChatErrorMessage } from '@/components/app/ChatMessage'
import { studentApi } from '@/api/student'
import { apiErrorText } from '@/utils/apiError'

export default function StudentCouplePage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const endRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  const { data: detail } = useQuery({
    queryKey: ['student-case', id],
    queryFn: () => studentApi.caseDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
  const hasPartner = !!detail?.partner

  const { data: history = [] } = useQuery({
    queryKey: ['student-couple', id],
    queryFn: () => studentApi.coupleHistory(id!),
    enabled: !!id && hasPartner,
  })

  const chat = useMutation({
    mutationFn: (message: string) => studentApi.coupleChat(id!, message),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-couple', id] }); setPending(null) },
    onError: () => setPending(null),
  })

  const reset = useMutation({
    mutationFn: () => studentApi.coupleReset(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-couple', id] }),
  })

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history, chat.isPending])

  const send = (e?: React.FormEvent) => {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || chat.isPending) return
    setInput('')
    setPending(msg)
    chat.mutate(msg)
  }

  const nameA = detail?.primary?.person_name
  const nameB = detail?.partner?.person_name

  if (detail && !hasPartner) {
    return (
      <StudentShell>
        <StudentCaseNav copyId={id!} />
        <div className="mx-auto max-w-[780px] px-6 py-10 text-sm text-brand-muted">
          Dieser Fall hat keine Partnerperson – eine Paar-Analyse ist nur bei Fällen mit zweiter Person möglich.
        </div>
      </StudentShell>
    )
  }

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 49px)' }}>
        <div className="border-b border-brand-border bg-white px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
          <div>
            <span className="label text-xs">Paar-Analyse</span>
            <p className="text-sm font-semibold text-navy">
              {nameA ?? 'Person A'} &amp; {nameB ?? 'Person B'}
            </p>
          </div>
          <button
            onClick={() => { if (window.confirm('Dialog wirklich zurücksetzen? Alle Nachrichten werden gelöscht.')) reset.mutate() }}
            disabled={reset.isPending || history.length === 0}
            className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            Zurücksetzen
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6 space-y-4">
            <div className="rounded-brand border border-accent/30 bg-accent/5 px-4 py-3">
              <p className="text-xs text-brand-muted">
                Echo betrachtet <strong className="text-navy">beide Personen allparteilich</strong> – es ergreift für
                keine Seite Partei, sondern macht die Dynamik zwischen ihnen sichtbar. Grundlage sind die Selbstberichte,
                Szenen und Einschätzungen beider Fälle. Übungsraum, keine echten Patient:innen.
              </p>
            </div>

            {history.map((m) => (
              <ChatMessage
                key={m.id}
                content={m.content}
                isUser={m.role === 'user'}
                safetyLevel={m.safety_level}
              />
            ))}

            {pending && chat.isPending && <ChatMessage content={pending} isUser />}
            {chat.isPending && <TypingIndicator />}
            {chat.isError && (
              <ChatErrorMessage text={apiErrorText(chat.error, 'Echo konnte nicht antworten. Bitte versuche es erneut.')} />
            )}

            <div ref={endRef} />
          </div>
        </div>

        <div className="px-6 pb-5 pt-2 flex-shrink-0">
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={send}
            pending={chat.isPending}
            placeholder="Frag Echo zur Paar-Dynamik …"
          />
        </div>
      </div>
    </StudentShell>
  )
}
