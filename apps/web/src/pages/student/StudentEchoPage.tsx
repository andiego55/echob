/**
 * /student/cases/:id/echo — Echo-Dialog der/des Studierenden über die Arbeitskopie.
 * Echo kennt den vollständigen Fallkontext (Onboarding, Szenen, Selbstbild, Fremdeinschätzung).
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

export default function StudentEchoPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const endRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  const { data: history = [] } = useQuery({
    queryKey: ['student-echo', id],
    queryFn: () => studentApi.echoHistory(id!),
    enabled: !!id,
  })

  const chat = useMutation({
    mutationFn: (message: string) => studentApi.echoChat(id!, message),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-echo', id] }); setPending(null) },
    onError: () => setPending(null),
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

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 49px)' }}>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6 space-y-4">
            <div className="rounded-brand border border-accent/30 bg-accent/5 px-4 py-3">
              <p className="text-xs text-brand-muted">
                Besprich diesen Fall mit Echo — Echo kennt den vollständigen Fallkontext (Onboarding,
                Szenen, Selbstbild, Fremdeinschätzung). Übungsraum, keine echten Patient:innen.
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
            placeholder="Schreibe Echo …"
          />
        </div>
      </div>
    </StudentShell>
  )
}
