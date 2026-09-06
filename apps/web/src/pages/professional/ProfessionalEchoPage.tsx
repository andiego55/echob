/**
 * /professional/cases/:caseId/echo — Echo-Dialog der Fachperson.
 * Kontext = ausschließlich freigegebene Inhalte (serverseitig erzwungen).
 * ?glossary=<slug> startet automatisch einen Dialog zu einem Glossarbegriff.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { ImFluss } from '@/components/app/ChatMessage'
import ZumEndeKnopf from '@/components/app/ZumEndeKnopf'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { BelegeFachpersonProvider } from '@/components/professional/BelegeFachperson'
import ArbeitsmappeUebernehmen from '@/components/professional/ArbeitsmappeUebernehmen'
import { professionalApi } from '@/api/professional'
import { professionalEchoStreamen, type ProfessionalEchoAnfrage } from '@/api/professionalEchoStream'
import { useAntwortStrom } from '@/lib/antwortStrom'
import { mitlaufen } from '@/lib/mitlaufen'
import type { ProfessionalEchoMessage } from '@/types'
import type { EchoChatResult } from '@/api/professional'

const SUGGESTIONS = [
  'Welche Themen tauchen im freigegebenen Material auf?',
  'Welche Szenen sind besonders relevant?',
  'Welche Fragen könnten im Gespräch hilfreich sein?',
  'Welche Punkte sollte man vorsichtig besprechen?',
]

export default function ProfessionalEchoPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const [searchParams] = useSearchParams()
  const glossarySlug = searchParams.get('glossary')
  const qc = useQueryClient()

  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<ProfessionalEchoMessage[]>([])
  const [input, setInput] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [gateError, setGateError] = useState(false)
  const glossaryStarted = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)
  const verlaufRef = useRef<HTMLDivElement>(null)

  const { data: sessions = [] } = useQuery({
    queryKey: ['prof-echo-sessions', caseId],
    queryFn: () => professionalApi.echoSessions(caseId!),
    enabled: !!caseId,
  })
  const { data: glossary = [] } = useQuery({ queryKey: ['prof-glossary'], queryFn: professionalApi.glossary })
  const { data: caseInfo } = useQuery({
    queryKey: ['prof-case', caseId],
    queryFn: () => professionalApi.caseDetail(caseId!),
    enabled: !!caseId,
  })
  // Nicht-aktivierter Nicht-Demo-Fall → Echo gesperrt (Sitz-Gate). gateError deckt
  // den Fall ab, dass der Status noch lädt und der Server mit 402 antwortet.
  const locked = gateError || (!!caseInfo && !caseInfo.is_demo && !caseInfo.activated)
  const { data: history } = useQuery({
    queryKey: ['prof-echo-history', caseId, activeSession],
    queryFn: () => professionalApi.echoHistory(caseId!, activeSession!),
    enabled: !!activeSession,
  })

  useEffect(() => { if (history) setMessages(history) }, [history])

  /**
   * Die Antwort entsteht sichtbar, statt nach zehn Sekunden als Block dazustehen.
   *
   * Der Rückfall auf `/chat` steckt im Baustein: Reicht ein Proxy den Strom nicht durch,
   * kommt dieselbe Antwort am Stück, und die Fachperson merkt nur, dass sie später da ist.
   */
  const strom = useAntwortStrom<ProfessionalEchoAnfrage, EchoChatResult>({
    streamen: (anfrage, onStueck, onEinstufung, signal) =>
      professionalEchoStreamen(
        caseId!, { ...anfrage, session_id: activeSession ?? undefined },
        onStueck, onEinstufung, signal),
    rueckfall: (anfrage) =>
      professionalApi.echoChat(caseId!, { ...anfrage, session_id: activeSession ?? undefined }),
    onFertig: (res) => {
      setGateError(false)
      setActiveSession(res.session_id)
      setMessages(prev => [...prev, res.user_message, res.assistant_message])
      qc.invalidateQueries({ queryKey: ['prof-echo-sessions', caseId] })
    },
    onFehler: (_anfrage, err) => {
      if (isAxiosError(err) && err.response?.status === 402) setGateError(true)
    },
  })

  useEffect(() => {
    mitlaufen(endRef.current, strom.beschaeftigt)
  }, [messages, strom.takt.sichtbar])

  // Glossar-Dialog automatisch starten
  useEffect(() => {
    if (glossarySlug && !glossaryStarted.current && glossary.length) {
      glossaryStarted.current = true
      const term = glossary.find(g => g.slug === glossarySlug)?.term ?? glossarySlug
      setActiveSession(null)
      setMessages([])
      strom.senden({ message: `Bitte besprich den Begriff „${term}" im Kontext dieses Falls.`, thread_type: 'glossary', glossary_slug: glossarySlug })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glossarySlug, glossary])

  const send = () => {
    const msg = input.trim()
    if (!msg || strom.beschaeftigt || locked) return
    setInput('')
    strom.senden({ message: msg })
  }

  const summaryGen = useMutation({
    mutationFn: () => professionalApi.echoSummaryGenerate(caseId!, activeSession!),
    onSuccess: (r) => setSummary(r.summary),
  })
  const summarySave = useMutation({
    mutationFn: () => professionalApi.echoSummarySave(caseId!, { session_id: activeSession ?? undefined, summary_text: summary! }),
    onSuccess: () => { setSummary(null); qc.invalidateQueries({ queryKey: ['prof-case', caseId] }) },
  })

  const renameSession = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => professionalApi.echoSessionRename(caseId!, id, title),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prof-echo-sessions', caseId] }); setEditingId(null) },
  })
  const deleteSession = useMutation({
    mutationFn: (id: string) => professionalApi.echoSessionDelete(caseId!, id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['prof-echo-sessions', caseId] })
      qc.removeQueries({ queryKey: ['prof-echo-history', caseId, id] })
      if (id === activeSession) { setActiveSession(null); setMessages([]); setSummary(null) }
    },
  })

  const submitRename = (id: string) => {
    const t = editingTitle.trim()
    if (t) renameSession.mutate({ id, title: t })
    else setEditingId(null)
  }

  const newChat = () => { setActiveSession(null); setMessages([]); setSummary(null); glossaryStarted.current = true }

  return (
    <ProfessionalShell>
      {/* Löst „Szene 12", „Dokument 3", „Erkenntnis 5" in Echos Antworten auf — aus dem
          freigegebenen Material, das ohnehin schon geladen ist. Was nicht freigegeben ist,
          bleibt schlichter Text. */}
      <BelegeFachpersonProvider caseId={caseId!} bundle={caseInfo}>
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link to={`/professional/cases/${caseId}`} className="text-xs text-accent hover:underline">← Zur Fallansicht</Link>
            <h1 className="mt-1 text-xl font-bold text-navy">Echo – Fallkontext</h1>
            <p className="text-xs text-brand-muted">Echo arbeitet nur mit den freigegebenen Inhalten. Keine Diagnosen, keine Therapieanweisungen.</p>
          </div>
          <button onClick={newChat} className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-sm">+ Neuer Chat</button>
        </div>

        {locked && (
          <div className="mb-4 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-navy">Dieser Fall ist noch nicht aktiviert</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-muted">
              Um mit Echo über diesen Fall zu sprechen, aktiviere ihn zuerst in der Fallansicht
              (belegt einen Sitz). Der Beispielfall ist frei nutzbar.
            </p>
            <Link to={`/professional/cases/${caseId}`}
              className="mt-2 inline-block text-xs font-medium text-accent hover:underline">
              → Zur Fallansicht · Fall aktivieren
            </Link>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sessions */}
          <aside className="hidden md:block w-52 flex-shrink-0">
            <p className="text-xs font-semibold text-brand-muted mb-2">Gespräche</p>
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
                          onClick={() => { setActiveSession(s.id); setSummary(null) }}
                          className={`w-full text-left px-3 py-2 pr-12 rounded-brand text-sm truncate ${
                            isActive ? 'text-accent font-medium' : 'text-brand-muted hover:text-navy'
                          }`}
                        >
                          {s.title || 'Neuer Chat'}
                        </button>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                          <button
                            onClick={() => { setEditingId(s.id); setEditingTitle(s.title ?? '') }}
                            title="Umbenennen"
                            className="p-1 rounded text-brand-muted hover:text-navy hover:bg-white text-xs"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => { if (window.confirm('Dieses Gespräch löschen?')) deleteSession.mutate(s.id) }}
                            title="Löschen"
                            className="p-1 rounded text-brand-muted hover:text-red-600 hover:bg-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              {sessions.length === 0 && <p className="text-xs text-brand-muted/70 px-3">Noch keine Gespräche.</p>}
            </nav>
          </aside>

          {/* Chat */}
          <div className="flex-1 min-w-0">
            <div className="card min-h-[50vh] flex flex-col">
              <div ref={verlaufRef} className="flex-1 space-y-4 overflow-y-auto">
                {messages.length === 0 && !strom.beschaeftigt && (
                  <div className="text-sm text-brand-muted">
                    <p className="mb-3">Stelle Echo eine Frage zu diesem Fall. Zum Beispiel:</p>
                    <div className="flex flex-col gap-2">
                      {SUGGESTIONS.map(q => (
                        <button key={q} onClick={() => strom.senden({ message: q })} disabled={locked}
                          className="text-left text-xs px-3 py-2 rounded-brand border border-brand-border hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:hover:border-brand-border disabled:hover:text-brand-muted">
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
                    {/* Unter JEDER Antwort, nicht nur der letzten: Der Satz, den man behalten
                        will, steht oft drei Beiträge weiter oben. */}
                    {m.role === 'assistant' && (
                      <div className="mt-1.5 max-w-[85%]">
                        <ArbeitsmappeUebernehmen
                          caseId={caseId!}
                          antwort={m.content}
                          sessionId={activeSession}
                          messageId={m.id}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {/* Die entstehende Antwort. Dieselbe Blase wie eine gespeicherte, nur mit
                    `ImFluss`: Unfertige Auszeichnung würde sonst 37- bis 60-mal pro Sekunde
                    hin und her kippen (siehe lib/imFluss). */}
                {strom.takt.sichtbar && (
                  <div>
                    <div className="inline-block max-w-[85%] rounded-brand bg-brand-bg px-4 py-2.5 text-sm text-left text-brand-text">
                      <ImFluss text={strom.takt.sichtbar} />
                    </div>
                  </div>
                )}
                {strom.beschaeftigt && !strom.takt.sichtbar && (
                  <p className="text-sm text-brand-muted">Echo denkt nach …</p>
                )}
                <div ref={endRef} />
                <ZumEndeKnopf behaelter={verlaufRef} imFluss={strom.beschaeftigt} />
              </div>

              {/* Composer */}
              <div className="mt-4 border-t border-brand-border pt-3">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    rows={2}
                    disabled={locked}
                    placeholder={locked ? 'Fall nicht aktiviert – Echo ist gesperrt' : 'Nachricht an Echo …'}
                    className="flex-1 rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button onClick={send} disabled={strom.beschaeftigt || !input.trim() || locked} className="btn-primary !px-5 !text-sm self-end">Senden</button>
                </div>
                {messages.length > 0 && (
                  <div className="mt-2 flex gap-3">
                    <button onClick={() => summaryGen.mutate()} disabled={summaryGen.isPending || !activeSession}
                      className="text-xs text-accent hover:underline disabled:opacity-40">
                      {summaryGen.isPending ? 'Fasse zusammen …' : 'Gespräch zusammenfassen'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Zusammenfassung */}
            {summary && (
              <div className="mt-4 card border-accent/30 bg-accent/5">
                <p className="text-sm font-semibold text-navy mb-2">Zusammenfassung</p>
                <div className="text-sm text-brand-text"><MarkdownMessage content={summary} /></div>
                <div className="mt-3 flex gap-2 justify-end">
                  <button onClick={() => setSummary(null)} className="text-xs text-brand-muted hover:text-navy px-3 py-1.5">Verwerfen</button>
                  <button onClick={() => summarySave.mutate()} disabled={summarySave.isPending}
                    className="rounded border border-accent bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-50">
                    {summarySave.isPending ? 'Speichert …' : 'Zusammenfassung speichern'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </BelegeFachpersonProvider>
    </ProfessionalShell>
  )
}
