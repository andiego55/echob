/**
 * /student/cases/:id/roleplay — Rollenspiel: Echo spielt die ratsuchende Person (Klient:in).
 * Session-basiert; die/der Studierende übt Gesprächsführung.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import ChatComposer from '@/components/app/ChatComposer'
import { ChatMessage, TypingIndicator, ChatErrorMessage } from '@/components/app/ChatMessage'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { studentApi } from '@/api/student'
import { apiErrorText } from '@/utils/apiError'
import type { StudentEchoMessage } from '@/types'

export default function StudentRoleplayPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const endRef = useRef<HTMLDivElement>(null)
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<StudentEchoMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const { data: detail } = useQuery({
    queryKey: ['student-case', id],
    queryFn: () => studentApi.caseDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
  const clientName = detail?.primary?.onboarding?.person_name

  const { data: sessions = [] } = useQuery({
    queryKey: ['student-roleplay-sessions', id],
    queryFn: () => studentApi.roleplaySessions(id!),
    enabled: !!id,
  })
  const { data: history } = useQuery({
    queryKey: ['student-roleplay-history', id, activeSession],
    queryFn: () => studentApi.roleplayHistory(id!, activeSession!),
    enabled: !!activeSession,
  })

  useEffect(() => { if (history) setMessages(history) }, [history])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, pending])

  const chat = useMutation({
    mutationFn: (vars: { message: string; session_id?: string }) => studentApi.roleplayChat(id!, vars),
    onSuccess: (res) => {
      setActiveSession(res.session_id)
      setMessages(prev => [...prev, res.user_message, res.assistant_message])
      setPending(null)
      qc.invalidateQueries({ queryKey: ['student-roleplay-sessions', id] })
    },
    onError: () => setPending(null),
  })
  const rename = useMutation({
    mutationFn: ({ sid, title }: { sid: string; title: string }) => studentApi.roleplaySessionRename(id!, sid, title),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-roleplay-sessions', id] }); setEditingId(null) },
  })
  const del = useMutation({
    mutationFn: (sid: string) => studentApi.roleplaySessionDelete(id!, sid),
    onSuccess: (_d, sid) => {
      qc.invalidateQueries({ queryKey: ['student-roleplay-sessions', id] })
      if (sid === activeSession) { setActiveSession(null); setMessages([]) }
    },
  })
  const analyze = useMutation({
    mutationFn: () => studentApi.roleplayAnalyze(id!, activeSession!),
    onSuccess: (res) => setAnalysis(res.analysis),
  })

  const send = (e?: React.FormEvent) => {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || chat.isPending) return
    setInput('')
    setPending(msg)
    chat.mutate({ message: msg, session_id: activeSession ?? undefined })
  }
  const newChat = () => { setActiveSession(null); setMessages([]); setAnalysis(null) }
  const submitRename = (sid: string) => {
    const t = editingTitle.trim()
    if (t) rename.mutate({ sid, title: t })
    else setEditingId(null)
  }

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-navy">Rollenspiel</h1>
            <p className="text-xs text-brand-muted">
              Echo antwortet in der Rolle der ratsuchenden Person{clientName ? '' : ' dieses Falls'}. Übe Gesprächsführung – du bist die beratende Seite.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => analyze.mutate()} disabled={!activeSession || messages.length === 0 || analyze.isPending}
              className="btn border-2 border-accent bg-accent/5 text-accent hover:bg-accent/10 !py-2 !px-4 !text-sm disabled:opacity-40">
              {analyze.isPending ? 'Wertet aus …' : 'Gespräch auswerten'}
            </button>
            <button onClick={newChat} className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-sm">+ Neues Gespräch</button>
          </div>
        </div>

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
                        onKeyDown={e => { if (e.key === 'Enter') submitRename(s.id); if (e.key === 'Escape') setEditingId(null) }}
                        className="w-full rounded-brand border border-accent bg-white px-3 py-2 text-sm outline-none"
                      />
                    ) : (
                      <>
                        <button onClick={() => { setActiveSession(s.id); setAnalysis(null) }}
                          className={`w-full truncate rounded-brand px-3 py-2 pr-12 text-left text-sm ${isActive ? 'font-medium text-accent' : 'text-brand-muted hover:text-navy'}`}>
                          {s.title || 'Neues Gespräch'}
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
                    <strong className="text-navy">Übungsgespräch.</strong> Echo spielt die ratsuchende Person dieses Falls – mit ihrem Erleben,
                    ihren Mustern und Szenen. Eröffne, wie du ein Erstgespräch beginnen würdest. Echt statt „schwierig": auf gutes Zuhören
                    öffnet sie sich mehr. Fiktiv, keine echten Patient:innen.
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
                <ChatComposer value={input} onChange={setInput} onSend={send} pending={chat.isPending} placeholder="Was sagst du als beratende Person?" />
              </div>
            </div>

            {analyze.isError && (
              <p className="mt-3 text-xs text-red-600">{apiErrorText(analyze.error, 'Auswertung fehlgeschlagen.')}</p>
            )}
            {analysis && (
              <div className="mt-4 card border-accent/30 bg-accent/5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-navy">Auswertung deiner Gesprächsführung</p>
                  <button onClick={() => setAnalysis(null)} className="text-xs text-brand-muted hover:text-navy transition-colors">✕ Schließen</button>
                </div>
                <div className="text-sm leading-relaxed text-brand-text"><MarkdownMessage content={analysis} /></div>
                <p className="mt-3 border-t border-brand-border pt-2 text-[11px] text-brand-muted">Übungs-Rückmeldung, keine Bewertung. Fiktives Material.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
