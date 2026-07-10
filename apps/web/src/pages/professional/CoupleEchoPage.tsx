/**
 * /professional/couples/:coupleId/echo — Paar-Analyse-Echo über zwei gekoppelte Fälle.
 *
 * Kontext = die freigegebenen Inhalte BEIDER Fälle (serverseitig über je load_shared_bundle
 * erzwungen — kein neuer Datenzugriff). Echo arbeitet systemisch, ohne Partei, ohne Diagnose.
 * Dialoge (Sessions) und Paar-Berichte sind an die Kopplung gebunden und werden beim
 * Entkoppeln serverseitig mitgelöscht.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { professionalApi } from '@/api/professional'
import type { CoupleReportListItem, ProfessionalEchoMessage } from '@/types'

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
}
function sourceLabel(source: string): string {
  return source === 'template' ? 'Aus Vorlage' : 'Standardbericht'
}

const DocIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-brand-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
)

export default function CoupleEchoPage() {
  const { coupleId } = useParams<{ coupleId: string }>()
  const qc = useQueryClient()
  const [session, setSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<ProfessionalEchoMessage[]>([])
  const [input, setInput] = useState('')
  const [tplId, setTplId] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const { data: meta } = useQuery({ queryKey: ['couple-meta'], queryFn: professionalApi.coupleMeta })
  const sessions = useQuery({
    queryKey: ['couple-sessions', coupleId], queryFn: () => professionalApi.coupleEchoSessions(coupleId!), enabled: !!coupleId,
  })
  const reports = useQuery({
    queryKey: ['couple-reports', coupleId], queryFn: () => professionalApi.coupleReports(coupleId!), enabled: !!coupleId,
  })
  const reportTemplates = useQuery({ queryKey: ['report-templates'], queryFn: professionalApi.reportTemplates })

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const chat = useMutation({
    mutationFn: (vars: { message: string; thread_type?: 'couple' | 'glossary'; glossary_slug?: string }) =>
      professionalApi.coupleEchoChat(coupleId!, { ...vars, session_id: session ?? undefined }),
    onSuccess: (res) => {
      const isNew = !session
      setSession(res.session_id)
      setMessages(prev => [...prev, res.user_message, res.assistant_message])
      if (isNew) qc.invalidateQueries({ queryKey: ['couple-sessions', coupleId] })
    },
  })
  const loadSession = useMutation({
    mutationFn: (sid: string) => professionalApi.coupleEchoHistory(coupleId!, sid),
    onSuccess: (msgs, sid) => { setSession(sid); setMessages(msgs) },
  })
  const delSession = useMutation({
    mutationFn: (sid: string) => professionalApi.deleteCoupleSession(coupleId!, sid),
    onSuccess: (_r, sid) => {
      qc.invalidateQueries({ queryKey: ['couple-sessions', coupleId] })
      if (sid === session) { setSession(null); setMessages([]) }
    },
  })
  const createReport = useMutation({
    mutationFn: (vars: { source: 'standard' | 'template'; template_id?: string }) =>
      professionalApi.createCoupleReport(coupleId!, vars),
    onSuccess: () => { setTplId(''); qc.invalidateQueries({ queryKey: ['couple-reports', coupleId] }) },
  })

  const send = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || chat.isPending) return
    if (text === undefined) setInput('')
    chat.mutate({ message: msg })
  }
  const newChat = () => { setSession(null); setMessages([]) }

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1240px] px-6 py-6">
        <div className="mb-4">
          <Link to="/professional" className="text-xs text-accent hover:underline">← Zum Postfach</Link>
          <h1 className="mt-1 text-xl font-bold text-navy">Paar-Analyse mit Echo</h1>
          <p className="text-xs text-brand-muted max-w-[640px]">
            Echo betrachtet die <strong>freigegebenen Inhalte beider Fälle</strong> nebeneinander – systemisch,
            <strong> ohne Partei zu ergreifen</strong> und ohne Diagnose. Die Zusammenführung erfolgt in Ihrer
            fachlichen Verantwortung; bei Hinweisen auf Gewalt ist ein Paarsetting in der Regel kontraindiziert.
          </p>
        </div>

        <div className="flex gap-6">
          {/* Vergangene Dialoge */}
          <aside className="hidden lg:block w-48 flex-shrink-0">
            <button onClick={newChat}
              className={`w-full rounded-brand border px-3 py-2 text-left text-sm font-medium transition-colors ${
                session === null ? 'border-accent bg-accent/5 text-accent' : 'border-brand-border hover:border-accent/50 text-navy'
              }`}>
              + Neuer Dialog
            </button>
            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Vergangene Dialoge</p>
            <div className="space-y-1">
              {(sessions.data ?? []).map(s => (
                <div key={s.id}
                  className={`group flex items-center gap-1 rounded-brand border px-2.5 py-1.5 ${
                    session === s.id ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-brand-bg'
                  }`}>
                  <button onClick={() => loadSession.mutate(s.id)} className="min-w-0 flex-1 text-left">
                    <span className={`block truncate text-xs ${session === s.id ? 'font-semibold text-accent' : 'text-navy'}`}>
                      {s.title || 'Dialog'}
                    </span>
                    <span className="block text-[10px] text-brand-muted">{fmtDay(s.updated_at)}</span>
                  </button>
                  <button onClick={() => { if (window.confirm('Diesen Dialog löschen?')) delSession.mutate(s.id) }}
                    aria-label="Dialog löschen"
                    className="shrink-0 p-0.5 text-brand-muted opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" /></svg>
                  </button>
                </div>
              ))}
              {(sessions.data ?? []).length === 0 && <p className="text-xs text-brand-muted/70">Noch keine Dialoge.</p>}
            </div>
          </aside>

          {/* Chat + Berichte */}
          <div className="min-w-0 flex-1 space-y-4">
            <div className="card min-h-[50vh] flex flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto">
                {messages.length === 0 && !chat.isPending && (
                  <div className="text-sm text-brand-muted">
                    <p className="mb-3">Fragen Sie Echo zu beiden Perspektiven. Zum Beispiel:</p>
                    <div className="flex flex-col gap-2">
                      {(meta?.suggested_questions ?? []).map(q => (
                        <button key={q} onClick={() => send(q)}
                          className="text-left text-xs px-3 py-2 rounded-brand border border-brand-border hover:border-accent hover:text-accent transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={m.role === 'user' ? 'text-right' : ''}>
                    <div className={`inline-block max-w-[85%] rounded-brand px-4 py-2.5 text-sm text-left ${
                      m.role === 'user' ? 'bg-accent/10 text-brand-text' : 'bg-brand-bg text-brand-text'
                    }`}>
                      {m.role === 'assistant'
                        ? <MarkdownMessage content={m.content} />
                        : <span className="whitespace-pre-wrap">{m.content}</span>}
                    </div>
                  </div>
                ))}
                {chat.isPending && <p className="text-sm text-brand-muted">Echo denkt nach …</p>}
                <div ref={endRef} />
              </div>

              <div className="mt-4 border-t border-brand-border pt-3">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    rows={2}
                    placeholder="Frage zur Paardynamik …"
                    className="flex-1 rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                  />
                  <button onClick={() => send()} disabled={chat.isPending || !input.trim()}
                    className="btn-primary !px-5 !text-sm self-end">Senden</button>
                </div>
              </div>
            </div>

            {/* Bericht erstellen + Erstellte Berichte */}
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-navy">Paar-Analyse-Bericht</h2>
                  <p className="text-xs text-brand-muted">Umfassende, allparteiliche Gesamtschau beider Perspektiven.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => createReport.mutate({ source: 'standard' })} disabled={createReport.isPending}
                    className="btn-primary !py-2 !text-sm disabled:opacity-60">
                    {createReport.isPending ? 'Bericht wird erstellt …' : 'Standardbericht erstellen'}
                  </button>
                  {(reportTemplates.data?.length ?? 0) > 0 && (
                    <>
                      <span className="text-xs text-brand-muted">oder</span>
                      <select value={tplId} onChange={e => setTplId(e.target.value)} disabled={createReport.isPending}
                        className="rounded-brand border border-brand-border bg-white px-2 py-1.5 text-xs outline-none focus:border-accent">
                        <option value="">Aus Vorlage …</option>
                        {reportTemplates.data!.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button onClick={() => tplId && createReport.mutate({ source: 'template', template_id: tplId })}
                        disabled={!tplId || createReport.isPending}
                        className="rounded-brand border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/5 disabled:opacity-40">
                        Erstellen
                      </button>
                    </>
                  )}
                </div>
              </div>
              {createReport.isError && (
                <p className="mt-2 text-xs text-red-600">Bericht konnte nicht erstellt werden. Bitte erneut versuchen.</p>
              )}

              <div className="mt-4 border-t border-brand-border pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">Erstellte Berichte</p>
                {(reports.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-brand-muted">Noch keine Berichte erstellt.</p>
                ) : (
                  <div className="space-y-2">
                    {reports.data!.map(r => (
                      <CoupleReportItem key={r.id} coupleId={coupleId!} item={r} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Glossar Paaranalyse */}
          <aside className="hidden xl:block w-56 flex-shrink-0">
            <p className="text-xs font-semibold text-brand-muted mb-2">Glossar Paaranalyse</p>
            <div className="space-y-1.5">
              {(meta?.glossary ?? []).map(g => (
                <details key={g.slug} className="rounded-brand border border-brand-border bg-brand-bg px-3 py-2">
                  <summary className="text-xs font-semibold text-navy cursor-pointer">{g.term}</summary>
                  <p className="mt-1 text-xs text-brand-muted leading-relaxed">{g.definition}</p>
                  <button onClick={() => send(`Bitte ordne den Begriff „${g.term}" in diese konkrete Paardynamik ein.`)}
                    className="mt-1.5 text-[11px] text-accent hover:underline">Im Gespräch besprechen →</button>
                </details>
              ))}
              {(meta?.glossary ?? []).length === 0 && <p className="text-xs text-brand-muted/70">—</p>}
            </div>
          </aside>
        </div>
      </div>
    </ProfessionalShell>
  )
}

function CoupleReportItem({ coupleId, item }: {
  coupleId: string
  item: CoupleReportListItem
}) {
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: () => professionalApi.deleteCoupleReport(coupleId, item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-reports', coupleId] }),
  })
  return (
    <div className="flex items-center justify-between gap-3 rounded-brand border border-brand-border bg-white px-4 py-2.5">
      <Link to={`/professional/couples/${coupleId}/reports/${item.id}`}
        className="group flex min-w-0 flex-1 items-center gap-2.5 no-underline">
        <DocIcon />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-navy transition-colors group-hover:text-accent">{item.title || 'Paar-Bericht'}</span>
          <span className="block text-[11px] text-brand-muted">{sourceLabel(item.source)} · {fmtDay(item.created_at)}</span>
        </span>
        <span className="ml-auto shrink-0 text-xs font-medium text-accent">Öffnen →</span>
      </Link>
      <button onClick={() => { if (window.confirm('Diesen Bericht löschen?')) del.mutate() }} disabled={del.isPending}
        className="shrink-0 text-xs text-brand-muted transition-colors hover:text-red-600 disabled:opacity-40">Löschen</button>
    </div>
  )
}
