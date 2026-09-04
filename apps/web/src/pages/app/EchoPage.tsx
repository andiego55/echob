/**
 * /app/cases/:caseId/echo — Echo-Chat
 * Fallbezogener KI-Dialog mit Chat-Sessions (Sidebar wie bei ChatGPT).
 * Glossar-Begriffe als Schnellauswahl.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { BelegeProvider } from '@/components/app/Belege'
import ArtefaktErzeugen from '@/components/app/ArtefaktErzeugen'
import AntwortZuege from '@/components/app/AntwortZuege'
import KontextBand from '@/components/app/KontextBand'
import ChatComposer from '@/components/app/ChatComposer'
import { ChatMessage, TypingIndicator, ChatErrorMessage, safetyLevelFromMeta } from '@/components/app/ChatMessage'
import AssignmentDialogSummary from '@/components/app/AssignmentDialogSummary'
import { echoApi } from '@/api/echo'
import { apiErrorMessage } from '@/api/errors'
import type { EchoChatSession, ThreadType } from '@/types'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import { useBestaetigen } from '@/components/Bestaetigung'
import { echoStreamen, StreamNichtMoeglich } from '@/api/echoStream'
import { useEntwurf } from '@/lib/entwurf'
import EntwurfHinweis from '@/components/EntwurfHinweis'
import { useGetakteterText } from '@/lib/textTakt'
import { mitlaufen } from '@/lib/mitlaufen'
import type { EchoChatResponse, EchoMessage } from '@/types'

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

function formatSessionDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function EchoPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const [searchParams] = useSearchParams()
  const assignmentId = searchParams.get('assignment')
  const contentSlug = searchParams.get('content')
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [input, setInput]           = useState('')
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [showGlossary, setGlossary] = useState(false)
  const [threadType]                = useState<ThreadType>('topic')
  const [keywords, setKeywords]     = useState<string[]>([])

  /**
   * Kontextteile, die fuer dieses Gespraech wegbleiben (Kontextband).
   *
   * Bewusst nur im Zustand der Seite: Ein dauerhaft weggeschalteter Kontext waere
   * eine Falle, an die sich Wochen spaeter niemand erinnert.
   */
  const [ohne, setOhne] = useState<string[]>([])

  // undefined = noch nicht initialisiert, null = neuer (ungespeicherter) Chat
  const [selectedSession, setSelectedSession] = useState<string | null | undefined>(undefined)

  // Sessions laden
  const { data: sessions = [], isSuccess: sessionsLoaded } = useQuery({
    queryKey: ['echo-sessions', caseId],
    queryFn: () => echoApi.listSessions(caseId!),
    enabled: !!caseId,
  })

  // Beim ersten Laden: jüngste Session auswählen (oder neuen Chat anbieten).
  // Bei zugewiesenem Dialog NICHT – dort öffnet der Effekt unten eine eigene Session.
  useEffect(() => {
    if (selectedSession === undefined && sessionsLoaded && !assignmentId && !contentSlug) {
      setSelectedSession(sessions[0]?.id ?? null)
    }
  }, [sessionsLoaded, sessions, selectedSession, assignmentId])

  // Zugewiesener Dialog: eigene Session mit Echo-Begrüßung öffnen (serverseitig idempotent).
  const assignmentStarted = useRef(false)
  useEffect(() => {
    if (!assignmentId || !caseId || assignmentStarted.current) return
    assignmentStarted.current = true
    echoApi.startAssignmentDialog(caseId, assignmentId)
      .then((d) => {
        setSelectedSession(d.chat_session_id)
        setKeywords(d.keywords ?? [])
        qc.invalidateQueries({ queryKey: ['echo-sessions', caseId] })
        qc.invalidateQueries({ queryKey: ['echo-history', caseId, d.chat_session_id] })
      })
      .catch(() => { assignmentStarted.current = false; setSelectedSession((s) => s ?? null) })
  }, [assignmentId, caseId, qc])

  // Gesprächsverlauf der gewählten Session laden
  const { data: history = [] } = useQuery({
    queryKey: ['echo-history', caseId, selectedSession],
    queryFn: () => echoApi.history(caseId!, threadType, undefined, 50, selectedSession!),
    enabled: !!caseId && !!selectedSession,
  })

  /**
   * Die Antwort, waehrend sie entsteht.
   *
   * Vorher sah man einen Tippindikator, bis alles da war - bei einer laengeren Antwort gut
   * zehn Sekunden Punkte. Das ist der Unterschied zwischen "denkt nach" und "haengt".
   */
  /**
   * Auch das Ungesendete ist geschrieben. Wer einen langen Absatz formuliert und dabei
   * zurueckwischt, soll ihn wiederfinden.
   */
  const eingabeEntwurf = useEntwurf(
    caseId ? `echo:${caseId}:${threadType}` : null,
    { input },
    w => !w.input.trim(),
  )

  const [stromText, setStromText] = useState('')
  /**
   * Die Einstufung kommt VOR dem ersten Text. Ohne sie saehe eine akute Hilfemeldung
   * waehrend des Stroms aus wie eine gewoehnliche Deutung - und die rote Aufmachung ist
   * bei dieser einen Nachricht Teil ihrer Wirkung, nicht Schmuck.
   */
  const [stromSafety, setStromSafety] = useState<'acute' | 'elevated' | null>(null)

  /**
   * Das fertige Ergebnis, solange die Anzeige noch aufholt.
   *
   * Zwischen „Echo ist fertig" und „der Text steht vollstaendig da" liegen ein paar
   * Sekunden. In dieser Zeit darf sich am Verlauf nichts aendern.
   */
  const [uebergabe, setUebergabe] = useState<EchoChatResponse | null>(null)

  const abbruch = useRef<AbortController | null>(null)

  // Wer die Seite verlaesst, laesst sonst einen Strom weiterlaufen.
  useEffect(() => () => abbruch.current?.abort(), [])

  const mutation = useMutation({
    mutationFn: async (data: { message: string; glossary_term?: string; source?: string }) => {
      const anfrage = {
        ...data,
        thread_type: threadType,
        chat_session_id: selectedSession ?? undefined,
        assignment_id: assignmentId ?? undefined,
        ohne,
      }
      setStromText('')
      setStromSafety(null)
      abbruch.current?.abort()
      abbruch.current = new AbortController()
      try {
        return await echoStreamen(
          caseId!, anfrage,
          teil => setStromText(t => t + teil),
          setStromSafety,
          abbruch.current.signal,
        )
      } catch (e) {
        // Gefuehrte Dialoge, Steuerbefehle, ein Proxy ohne Stream-Unterstuetzung: Der
        // gewoehnliche Weg kann alles davon. Der Rueckfall ist Teil des Entwurfs.
        if (e instanceof StreamNichtMoeglich) return echoApi.chat(caseId!, anfrage)
        throw e
      }
    },
    onSuccess: (data) => {
      // Hier passiert bewusst NICHTS ausser Merken. Wuerde der Verlauf jetzt neu geladen,
      // stuende die gespeicherte Antwort neben der noch aufholenden Anzeige - dieselbe
      // Antwort zweimal. Den Wechsel macht der Effekt weiter unten, in einem Zug.
      setUebergabe(data)
    },
    onError: (_fehler, variablen) => {
      // Der Text kommt zurueck ins Feld. Vorher war er weg: beim Absenden geloescht,
      // durch den Fehler nie angekommen, nirgends gespeichert. Wer eine lange Nachricht
      // geschrieben hatte, musste sie neu formulieren - ausgerechnet dann, wenn ohnehin
      // gerade etwas nicht funktioniert.
      setInput(vorher => vorher || variablen.message)
      setPendingMessage(null)
      setStromText('')
      setStromSafety(null)
    },
  })

  // Content-Launch: aus einer Wissensseite kommend (?content=<slug>) einen Dialog
  // seeden, der das gelesene Thema auf den Fall bezieht (mirror des Assignment-Musters).
  const contentStarted = useRef(false)
  useEffect(() => {
    if (!contentSlug || !caseId || assignmentId || contentStarted.current || !sessionsLoaded) return
    contentStarted.current = true
    const title = CONTENT_MANIFEST.find((m) => m.slug === contentSlug)?.title ?? 'dieses Thema'
    const seed = `Ich habe gerade über „${title}" gelesen und möchte das auf meine aktuelle Situation beziehen.`
    setSelectedSession(null)
    setPendingMessage(seed)
    mutation.mutate({ message: seed, source: contentSlug })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSlug, caseId, assignmentId, sessionsLoaded])

  /**
   * Empfangen wird so schnell es geht, ANGEZEIGT wird in Lesegeschwindigkeit.
   *
   * Das Modell liefert seine Stuecke in Schueben - ungebremst springt der Text, statt zu
   * entstehen, und ist schneller da, als man ihn lesen kann.
   */
  const takt = useGetakteterText(stromText, mutation.isPending)

  /**
   * „Echo ist noch dabei" — bis der letzte Buchstabe steht.
   *
   * `mutation.isPending` allein reicht nicht: Es wird schon falsch, wenn die Antwort
   * vollstaendig empfangen ist, waehrend die Anzeige noch aufholt. In dieser Luecke haette
   * man erneut senden koennen — und die erste Antwort waere nie in den Verlauf gewandert.
   */
  const beschaeftigt = mutation.isPending || uebergabe !== null

  // Auto-scroll
  useEffect(() => {
    mitlaufen(messagesEndRef.current, beschaeftigt)
  }, [history, takt.sichtbar])

  /**
   * Der Wechsel von der vorlaeufigen zur gespeicherten Nachricht — in EINEM Bild.
   *
   * Die beiden Nachrichten werden direkt in den Zwischenspeicher geschrieben statt
   * nachgeladen. Nachladen hiesse warten, und in der Wartezeit waere die Antwort entweder
   * doppelt zu sehen (wenn der vorlaeufige Text noch steht) oder gar nicht (wenn er schon
   * weg ist). React fasst die Zustandsaenderungen hier zu einem Render zusammen.
   */
  useEffect(() => {
    if (!uebergabe || mutation.isPending || !takt.aufgeholt) return

    const sitzung = uebergabe.chat_session_id ?? selectedSession
    if (sitzung) {
      qc.setQueryData<EchoMessage[]>(
        ['echo-history', caseId, sitzung],
        alt => [...(alt ?? []), uebergabe.user_message, uebergabe.assistant_message],
      )
    }
    if (uebergabe.chat_session_id && uebergabe.chat_session_id !== selectedSession) {
      setSelectedSession(uebergabe.chat_session_id)
    }

    setStromText('')
    setStromSafety(null)
    setPendingMessage(null)
    setUebergabe(null)
    // Die Seitenleiste darf ruhig kurz spaeter nachziehen.
    qc.invalidateQueries({ queryKey: ['echo-sessions', caseId] })
  }, [uebergabe, mutation.isPending, takt.aufgeholt, selectedSession, caseId, qc])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || beschaeftigt) return
    const msg = input.trim()
    setInput('')
    eingabeEntwurf.loeschen()
    setPendingMessage(msg)
    mutation.mutate({ message: msg })
  }

  const handleGlossary = (term: string) => {
    const msg = `Erkläre mir den Begriff: ${term}`
    setGlossary(false)
    setPendingMessage(msg)
    mutation.mutate({ message: msg, glossary_term: term })
  }

  const handleTopic = (topic: string) => {
    const msg = `Ich möchte über folgendes Thema sprechen: ${topic}`
    setPendingMessage(msg)
    mutation.mutate({ message: msg })
  }

  const handleKeyword = (kw: string) => {
    const msg = `Lass uns über „${kw}" sprechen.`
    setPendingMessage(msg)
    mutation.mutate({ message: msg })
  }

  /**
   * Chat wechseln oder neu beginnen — und dabei aufräumen.
   *
   * Wer das mitten in einer Antwort tut, nähme sonst den halben gestreamten Text mit in
   * den anderen Chat: Er hängt an einem eigenen Zustand, nicht am Verlauf. Der Strom wird
   * abgebrochen, das Angefangene verworfen.
   */
  const chatWechseln = (id: string | null) => {
    abbruch.current?.abort()
    setSelectedSession(id)
    setInput('')
    setPendingMessage(null)
    setStromText('')
    setStromSafety(null)
    setUebergabe(null)
  }

  const handleNewChat = () => chatWechseln(null)

  const showEmptyState = (!selectedSession || history.length === 0) && !beschaeftigt
    && !pendingMessage

  /**
   * Die letzte Nachricht, WENN sie von Echo ist — sonst nichts.
   *
   * Steht am Ende eine eigene Nachricht, wartet man noch auf die Antwort; dann wäre ein
   * Zug ins Leere gerichtet.
   */
  const letzteAntwort = history.length > 0 && history[history.length - 1].role === 'assistant'
    ? history[history.length - 1]
    : null

  return (
    <BelegeProvider caseId={caseId!}>
      <AppShell>
        <CaseNav caseId={caseId!} />

        <div className="flex h-[calc(100vh-112px)]">
          {/* Chat-Sidebar */}
          <ChatSidebar
            caseId={caseId!}
            sessions={sessions}
            selected={selectedSession ?? null}
            onSelect={chatWechseln}
            onNewChat={handleNewChat}
          />

          {/* Hauptbereich */}
          <div className="flex flex-col flex-1 min-w-0">

            {/* Mobile: Session-Auswahl */}
            <div className="md:hidden border-b border-brand-border bg-white px-4 py-2 flex gap-2 items-center">
              <select
                value={selectedSession ?? ''}
                onChange={(e) => chatWechseln(e.target.value || null)}
                className="flex-1 rounded-brand border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none"
              >
                <option value="">Neuer Chat</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title ?? 'Neuer Chat'}</option>
                ))}
              </select>
              <button
                onClick={handleNewChat}
                className="flex-shrink-0 px-3 py-2 rounded-brand border border-brand-border text-sm text-brand-muted hover:border-accent hover:text-accent transition-colors"
                title="Neuen Chat starten"
              >
                +
              </button>
            </div>

            <KontextBand caseId={caseId!} ohne={ohne} onAendern={setOhne} />

            {/* Was aus dem Gespraech bleiben soll. Erscheint erst, wenn es einen
                Verlauf gibt - vor dem ersten Wort waere der Knopf nur Deko. */}
            {selectedSession && history.length > 0 && (
              <div className="flex justify-end border-b border-brand-border bg-white px-4 py-2">
                <ArtefaktErzeugen
                  caseId={caseId!}
                  threadType={threadType}
                  chatSessionId={selectedSession}
                  eigeneBeitraege={history.filter(m => m.role === 'user').length}
                  beschaeftigt={beschaeftigt}
                />
              </div>
            )}

            {/* Chat-Bereich */}
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[780px] px-6 py-6 space-y-5">

                {/* Begrüßung wenn leer */}
                {showEmptyState && <WelcomePrompt onTopic={handleTopic} />}

                {/* Nachrichten */}
                {history.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    content={msg.content}
                    isUser={msg.role === 'user'}
                    safetyLevel={msg.role === 'assistant' ? safetyLevelFromMeta(msg.metadata) : undefined}
                  />
                ))}

                {/* Optimistische Nutzernachricht */}
                {/* Bleibt bis zur Uebergabe stehen — vorher verschwand sie kurz, weil sie
                    geleert wurde, bevor der Verlauf sie enthielt. */}
                {pendingMessage && (
                  <ChatMessage content={pendingMessage} isUser />
                )}

                {/* Die Antwort, waehrend sie entsteht. Der Tippindikator bleibt nur, bis
                    das erste Stueck da ist - danach waere er neben dem wachsenden Text
                    eine zweite, widerspruechliche Auskunft. */}
                {takt.sichtbar && (
                  <ChatMessage content={takt.sichtbar} isUser={false} safetyLevel={stromSafety} imFluss />
                )}
                {beschaeftigt && !takt.sichtbar && <TypingIndicator />}

                {mutation.isError && (
                  <ChatErrorMessage text={apiErrorMessage(mutation.error, 'Echo konnte nicht antworten. Bitte versuche es erneut.')} />
                )}

                {/* Züge unter der letzten Antwort. Nur dort — unter jeder zu stehen wäre
                    Lärm, und ein Klick weiter oben schickte eine Nachfrage zu etwas, das
                    drei Beiträge zurückliegt. */}
                {!beschaeftigt && letzteAntwort && (
                  <AntwortZuege
                    onZug={(text) => { setPendingMessage(text); mutation.mutate({ message: text }) }}
                    safety={safetyLevelFromMeta(letzteAntwort.metadata)}
                  />
                )}

                {assignmentId && selectedSession && history.length > 0 && !beschaeftigt && (
                  <AssignmentDialogSummary caseId={caseId!} assignmentId={assignmentId} />
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Glossar-Overlay */}
            {showGlossary && (
              <div className="px-6 pb-2">
                <div className="mx-auto max-w-[780px] rounded-2xl border border-brand-border bg-white shadow-[0_4px_24px_rgba(15,30,46,0.10)] px-5 py-4">
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
            <div className="px-6 pb-5 pt-2">
              {assignmentId && (
                <div className="mx-auto max-w-[780px] mb-2">
                  <p className="text-[11px] text-brand-muted mb-1">
                    Dieser Dialog wurde von deiner Fachperson vorbereitet – Echo richtet sich danach aus.
                    {keywords.length > 0 && ' Tipp: Stichworte anklicken.'}
                  </p>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.map(kw => (
                        <button key={kw} type="button" onClick={() => handleKeyword(kw)} disabled={beschaeftigt}
                          className="text-xs px-3 py-1.5 rounded-full border border-brand-border text-brand-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-50">
                          {kw}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Direkt ueber dem Feld, in das der Text zurueckkommt. */}
              <EntwurfHinweis
                entwurf={eingabeEntwurf}
                was="Eine angefangene Nachricht"
                onUebernehmen={w => setInput(w.input)}
              />

              <ChatComposer
                value={input}
                onChange={setInput}
                onSend={handleSend}
                pending={beschaeftigt}
                hint="Echo stellt keine Diagnosen und ersetzt keine professionelle Beratung."
                leftAccessory={
                  <button
                    type="button"
                    onClick={() => setGlossary((v) => !v)}
                    title="Glossar öffnen"
                    className={`h-9 px-3.5 rounded-full border text-xs font-medium transition-colors ${
                      showGlossary
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-brand-border text-brand-muted hover:border-accent/40 hover:text-accent'
                    }`}
                  >
                    Glossar
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </AppShell>
    </BelegeProvider>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function ChatSidebar({
  caseId, sessions, selected, onSelect, onNewChat,
}: {
  caseId: string
  sessions: EchoChatSession[]
  selected: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
}) {
  const bestaetigen = useBestaetigen()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      echoApi.renameSession(caseId, id, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['echo-sessions', caseId] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => echoApi.deleteSession(caseId, id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['echo-sessions', caseId] })
      qc.removeQueries({ queryKey: ['echo-history', caseId, id] })
      if (id === selected) onNewChat()
    },
  })

  const startEditing = (s: EchoChatSession) => {
    setEditingId(s.id)
    setEditingTitle(s.title ?? '')
  }

  const saveTitle = () => {
    if (!editingId) return
    const title = editingTitle.trim()
    if (!title) { setEditingId(null); return }
    renameMutation.mutate({ id: editingId, title })
  }

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-brand-border bg-white">
      {/* Neuer Chat */}
      <div className="p-3 border-b border-brand-border">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-brand border text-sm font-medium transition-colors ${
            selected === null
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-brand-border text-brand-text hover:border-accent hover:text-accent'
          }`}
        >
          <span className="text-base leading-none">+</span> Neuer Chat
        </button>
      </div>

      {/* Session-Liste */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="px-3 py-4 text-xs text-brand-muted/70 leading-relaxed">
            Noch keine Chats. Stell Echo deine erste Frage – der Chat wird automatisch gespeichert.
          </p>
        )}

        {sessions.map((s) => {
          const isActive = s.id === selected
          const isEditing = s.id === editingId

          return (
            <div
              key={s.id}
              className={`group relative rounded-brand transition-colors ${
                isActive ? 'bg-accent/10' : 'hover:bg-brand-bg'
              }`}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="w-full rounded-brand border border-accent bg-white px-3 py-2 text-sm text-brand-text outline-none"
                />
              ) : (
                <button
                  onClick={() => onSelect(s.id)}
                  className="w-full text-left px-3 py-2 pr-14"
                >
                  <span className={`block text-sm truncate ${
                    isActive ? 'text-accent font-semibold' : 'text-brand-text'
                  }`}>
                    {s.title ?? 'Neuer Chat'}
                  </span>
                  <span className="block text-[11px] text-brand-muted/70 mt-0.5">
                    {formatSessionDate(s.updated_at)}
                  </span>
                </button>
              )}

              {/* Hover-Aktionen */}
              {!isEditing && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditing(s) }}
                    title="Umbenennen"
                    className="p-1.5 rounded text-brand-muted hover:text-navy hover:bg-white text-xs"
                  >
                    ✎
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (await bestaetigen({ titel: 'Chat löschen?', text: 'Der ganze Verlauf dieses Gesprächs mit Echo ist danach weg – das lässt sich nicht rückgängig machen.', knopf: 'Löschen', gefahr: true })) {
                        deleteMutation.mutate(s.id)
                      }
                    }}
                    title="Löschen"
                    className="p-1.5 rounded text-brand-muted hover:text-red-600 hover:bg-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// ── Begrüßung ─────────────────────────────────────────────────────────────────

function WelcomePrompt({ onTopic }: { onTopic: (t: string) => void }) {
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z" />
        </svg>
      </div>
      <h2 className="card-title-lg mb-2">Echo ist bereit</h2>
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
