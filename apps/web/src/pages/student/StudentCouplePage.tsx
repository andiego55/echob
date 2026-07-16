/**
 * /student/cases/:id/couple — Paar-Analyse (nur bei Fällen mit Partnerperson).
 * Allparteiliches Paar-Echo, session-basiert (mehrere Gespräche) + Glossar.
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
import type { StudentEchoMessage, GlossaryTerm } from '@/types'

export default function StudentCouplePage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const endRef = useRef<HTMLDivElement>(null)
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<StudentEchoMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [showGlossary, setShowGlossary] = useState(false)

  const { data: detail } = useQuery({
    queryKey: ['student-case', id],
    queryFn: () => studentApi.caseDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
  const hasPartner = !!detail?.partner

  const { data: sessions = [] } = useQuery({
    queryKey: ['student-couple-sessions', id],
    queryFn: () => studentApi.coupleSessions(id!),
    enabled: !!id && hasPartner,
  })
  const { data: glossary = [] } = useQuery({ queryKey: ['student-glossary'], queryFn: () => studentApi.glossary() })
  const { data: history } = useQuery({
    queryKey: ['student-couple-history', id, activeSession],
    queryFn: () => studentApi.coupleHistory(id!, activeSession!),
    enabled: !!activeSession,
  })

  useEffect(() => { if (history) setMessages(history) }, [history])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, pending])

  const chat = useMutation({
    mutationFn: (vars: { message: string; session_id?: string; thread_type?: 'topic' | 'glossary'; glossary_slug?: string }) =>
      studentApi.coupleChat(id!, vars),
    onSuccess: (res) => {
      setActiveSession(res.session_id)
      setMessages(prev => [...prev, res.user_message, res.assistant_message])
      setPending(null)
      qc.invalidateQueries({ queryKey: ['student-couple-sessions', id] })
    },
    onError: () => setPending(null),
  })
  const rename = useMutation({
    mutationFn: ({ sid, title }: { sid: string; title: string }) => studentApi.coupleSessionRename(id!, sid, title),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-couple-sessions', id] }); setEditingId(null) },
  })
  const del = useMutation({
    mutationFn: (sid: string) => studentApi.coupleSessionDelete(id!, sid),
    onSuccess: (_d, sid) => {
      qc.invalidateQueries({ queryKey: ['student-couple-sessions', id] })
      if (sid === activeSession) { setActiveSession(null); setMessages([]) }
    },
  })

  const send = (e?: React.FormEvent) => {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || chat.isPending) return
    setInput('')
    setPending(msg)
    chat.mutate({ message: msg, session_id: activeSession ?? undefined })
  }
  const glossaryClick = (g: GlossaryTerm) => {
    if (chat.isPending) return
    setActiveSession(null)
    setMessages([])
    setShowGlossary(false)
    setPending(`Begriff: ${g.term}`)
    chat.mutate({ message: `Bitte besprich den Begriff „${g.term}" mit Blick auf die Dynamik dieses Paares.`, thread_type: 'glossary', glossary_slug: g.slug })
  }
  const newChat = () => { setActiveSession(null); setMessages([]) }
  const submitRename = (sid: string) => {
    const t = editingTitle.trim()
    if (t) rename.mutate({ sid, title: t })
    else setEditingId(null)
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
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-navy">Paar-Analyse · {nameA ?? 'Person A'} &amp; {nameB ?? 'Person B'}</h1>
            <p className="text-xs text-brand-muted">Echo betrachtet beide Personen allparteilich. Übungsraum, keine echten Patient:innen.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGlossary(v => !v)}
              className={`btn border-2 !py-2 !px-4 !text-sm ${showGlossary ? 'border-accent text-accent bg-accent/5' : 'bg-white text-navy border-brand-border hover:border-navy/30'}`}
            >
              Glossar
            </button>
            <button onClick={newChat} className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-sm">+ Neuer Chat</button>
          </div>
        </div>

        {showGlossary && glossary.length > 0 && (
          <div className="mb-4 card">
            <p className="mb-2 text-xs text-brand-muted">Begriff anklicken, um ihn mit Blick auf die Paardynamik zu besprechen.</p>
            <div className="flex flex-wrap gap-2">
              {glossary.map(g => (
                <button
                  key={g.slug}
                  onClick={() => glossaryClick(g)}
                  title={g.definition}
                  className="rounded-full border border-brand-border px-3 py-1.5 text-xs text-brand-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {g.term}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-6">
          <aside className="hidden md:block w-52 flex-shrink-0">
            <p className="mb-2 text-xs font-semibold text-brand-muted">Gespräche</p>
            <nav className="space-y-1">
              {sessions.map(s => {
                const isActive = s.id === activeSession
                const isEditing = s.id === editingId
                return (
                  <div key={s.id} className={`group relative rounded-brand transition-colors ${isActive ? 'bg-accent/10' : 'hover:bg-brand-border/30'}`}>
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={() => submitRename(s.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') submitRename(s.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="w-full rounded-brand border border-accent bg-white px-3 py-2 text-sm outline-none"
                      />
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveSession(s.id)}
                          className={`w-full truncate rounded-brand px-3 py-2 pr-12 text-left text-sm ${isActive ? 'font-medium text-accent' : 'text-brand-muted hover:text-navy'}`}
                        >
                          {s.title || 'Neuer Chat'}
                        </button>
                        <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover:flex">
                          <button onClick={() => { setEditingId(s.id); setEditingTitle(s.title ?? '') }} title="Umbenennen" className="rounded p-1 text-xs text-brand-muted hover:bg-white hover:text-navy">✎</button>
                          <button onClick={() => { if (window.confirm('Dieses Gespräch löschen?')) del.mutate(s.id) }} title="Löschen" className="rounded p-1 text-xs text-brand-muted hover:bg-white hover:text-red-600">✕</button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              {sessions.length === 0 && <p className="px-3 text-xs text-brand-muted/70">Noch keine Gespräche.</p>}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="card flex h-[calc(100vh-16rem)] min-h-[420px] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto">
                {messages.length === 0 && !chat.isPending && (
                  <div className="rounded-brand border border-accent/30 bg-accent/5 px-4 py-3 text-xs text-brand-muted">
                    Echo betrachtet <strong className="text-navy">beide Personen allparteilich</strong> – es ergreift für keine Seite
                    Partei, sondern macht die Dynamik zwischen ihnen sichtbar. Grundlage sind die Selbstberichte, Szenen und
                    Einschätzungen beider Fälle.
                  </div>
                )}
                {messages.map(m => (
                  <ChatMessage key={m.id} content={m.content} isUser={m.role === 'user'} safetyLevel={m.safety_level} />
                ))}
                {pending && chat.isPending && <ChatMessage content={pending} isUser />}
                {chat.isPending && <TypingIndicator />}
                {chat.isError && (
                  <ChatErrorMessage text={apiErrorText(chat.error, 'Echo konnte nicht antworten. Bitte versuche es erneut.')} />
                )}
                <div ref={endRef} />
              </div>

              <div className="mt-3 border-t border-brand-border pt-3">
                <ChatComposer value={input} onChange={setInput} onSend={send} pending={chat.isPending} placeholder="Frag Echo zur Paar-Dynamik …" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
