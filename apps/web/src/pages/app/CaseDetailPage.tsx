/**
 * /app/cases/:caseId — Fall-Überblick
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { casesApi } from '@/api/cases'
import { scenesApi } from '@/api/scenes'
import { personProfileApi } from '@/api/personProfile'
import { topicSummariesApi, type TopicSummary } from '@/api/topicSummaries'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import { hypothesesApi } from '@/api/hypotheses'
import {
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_STATUS_LABELS,
  CONTACT_FREQUENCY_LABELS,
} from '@/types'

const TOPIC_ORDER = ['topic_self', 'topic_person', 'topic_responsibility', 'topic_guilt'] as const


export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesApi.get(caseId!),
    enabled: !!caseId,
  })

  const { data: scenesData } = useQuery({
    queryKey: ['scenes', caseId],
    queryFn: () => scenesApi.list(caseId!),
    enabled: !!caseId,
  })

  const { data: personProfile } = useQuery({
    queryKey: ['person-profile', caseId],
    queryFn: () => personProfileApi.get(caseId!),
    enabled: !!caseId,
  })

  const { data: topicSummaries = [] } = useQuery({
    queryKey: ['topic-summaries', caseId],
    queryFn: () => topicSummariesApi.list(caseId!),
    enabled: !!caseId,
  })

  if (isLoading || !caseData) {
    return (
      <AppShell>
        <div className="px-6 py-10 text-sm text-brand-muted">Wird geladen …</div>
      </AppShell>
    )
  }

  const c = caseData
  const sceneCount = scenesData?.total ?? 0
  const coreSummaryCount = topicSummaries.filter((s) => !s.topic.startsWith('content_')).length

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Fall-Header */}
        <div className="card mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="label mb-2">{RELATIONSHIP_TYPE_LABELS[c.relationship_type]}</span>
              <h1 className="mt-2 text-xl font-bold text-navy">
                {RELATIONSHIP_STATUS_LABELS[c.relationship_status]}
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                Kontakt: {CONTACT_FREQUENCY_LABELS[c.contact_frequency]}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              <Link
                to={`/app/cases/${caseId}/echo`}
                className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-sm"
              >
                Mit Echo sprechen
              </Link>
              <Link
                to={`/app/cases/${caseId}/share`}
                className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-sm"
              >
                Freigaben
              </Link>
              <Link
                to={`/app/cases/${caseId}/scenes/new`}
                className="btn-primary !py-2 !px-4 !text-sm"
              >
                + Szene festhalten
              </Link>
            </div>
          </div>

          {c.main_concern && (
            <div className="mt-4 rounded-brand bg-brand-bg border border-brand-border px-4 py-3">
              <p className="text-xs font-semibold text-brand-muted mb-1">Hauptanliegen</p>
              <p className="text-sm text-brand-text">{c.main_concern}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-brand-border pt-3">
            <span className="text-xs text-brand-muted">
              {sceneCount} {sceneCount === 1 ? 'Szene' : 'Szenen'} dokumentiert
            </span>
            <span className="text-xs text-brand-muted">
              {coreSummaryCount} von 4 Themendialogen gespeichert
            </span>
          </div>
        </div>

        {/* Nächster Schritt */}
        <NextStepCard caseId={caseId!} sceneCount={sceneCount} topicCount={coreSummaryCount} />

        {/* Schnell-Aktionen */}
        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          <QuickCard
            title="Szenen"
            value={
              sceneCount === 0
                ? 'Noch nichts dokumentiert'
                : `${sceneCount} ${sceneCount === 1 ? 'Szene' : 'Szenen'} dokumentiert`
            }
            to={`/app/cases/${caseId}/scenes`}
            cta={sceneCount === 0 ? 'Erste Szene festhalten' : 'Alle Szenen ansehen'}
          />
          <QuickCard
            title="Echo"
            value="Dein KI-Begleiter"
            to={`/app/cases/${caseId}/echo`}
            cta="Gespräch starten"
          />
          <QuickCard
            title="Berichte"
            value="Muster & Verlauf"
            to={`/app/cases/${caseId}/reports`}
            cta="Bericht erstellen"
          />
        </div>

        {/* Personenprofil-Karte */}
        <div className="mt-6">
          <PersonProfileCard
            caseId={caseId!}
            hasModules={(personProfile?.completed_modules?.length ?? 0) > 0}
            summaryText={personProfile?.summary_text ?? null}
          />
        </div>

        {/* Themendialog-Zusammenfassungen */}
        <div className="mt-6">
          <TopicSummariesCard caseId={caseId!} summaries={topicSummaries} />
        </div>

        {/* Hypothesen */}
        <div className="mt-6">
          <HypothesesOverviewCard caseId={caseId!} />
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-brand-muted/70 max-w-xl">
          EchoB analysiert Beziehungsmuster auf Basis deiner eigenen Angaben.
          Die App ersetzt keine psychologische Beratung und stellt keine Diagnosen.
        </p>

        {/* Gefahrenzone: Fall endgültig löschen */}
        <DangerZone caseId={caseId!} />
      </div>
    </AppShell>
  )
}

function NextStepCard({ caseId, sceneCount, topicCount }: {
  caseId: string
  sceneCount: number
  topicCount: number
}) {
  if (sceneCount === 0) {
    return (
      <div className="rounded-brand border border-accent/30 bg-accent/5 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1.5">Einstieg</p>
          <p className="text-sm text-navy max-w-[540px] leading-relaxed">
            Fang an, indem du eine konkrete Situation festhältst – was ist zuletzt passiert, das dich beschäftigt hat?
            Auch kleine Beobachtungen helfen Echo, deinen Fall zu verstehen.
          </p>
        </div>
        <Link
          to={`/app/cases/${caseId}/scenes/new`}
          className="text-xs font-semibold text-accent hover:underline shrink-0 no-underline self-end"
        >
          Erste Szene festhalten →
        </Link>
      </div>
    )
  }

  if (topicCount === 0) {
    return (
      <div className="rounded-brand border border-accent/30 bg-accent/5 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1.5">Nächster Schritt</p>
          <p className="text-sm text-navy max-w-[540px] leading-relaxed">
            Du hast bereits Szenen dokumentiert – ein guter Start. Jetzt kannst du mit Echo in einem geführten Dialog tiefer einsteigen und deine Sichtweise strukturieren.
          </p>
        </div>
        <Link
          to={`/app/cases/${caseId}/topics/topic_self`}
          className="text-xs font-semibold text-accent hover:underline shrink-0 no-underline self-end"
        >
          Ersten Themendialog starten →
        </Link>
      </div>
    )
  }

  if (topicCount < 4) {
    return (
      <div className="rounded-brand border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">Guter Fortschritt</p>
          <p className="text-sm text-navy max-w-[540px] leading-relaxed">
            {topicCount} von 4 Themendialogen abgeschlossen. Die gespeicherten Zusammenfassungen fließen bereits als Kontext in alle Echo-Gespräche ein.
          </p>
        </div>
        <Link
          to={`/app/cases/${caseId}/echo`}
          className="text-xs font-semibold text-emerald-700 hover:underline shrink-0 no-underline self-end"
        >
          Weiter reflektieren →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-brand border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">Vollständig</p>
        <p className="text-sm text-navy max-w-[540px] leading-relaxed">
          Alle 4 Themendialoge abgeschlossen – Echo hat jetzt einen soliden Überblick über deine Situation und kann dir besonders gezielt helfen.
        </p>
      </div>
      <Link
        to={`/app/cases/${caseId}/echo`}
        className="text-xs font-semibold text-emerald-700 hover:underline shrink-0 no-underline self-end"
      >
        Mit Echo sprechen →
      </Link>
    </div>
  )
}

function PersonProfileCard({ caseId, hasModules, summaryText }: {
  caseId: string
  hasModules: boolean
  summaryText: string | null
}) {
  return (
    <Link
      to={`/app/cases/${caseId}/person-profile`}
      className="card block no-underline hover:border-accent/40 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-2xl mb-2">👤</div>
          <p className="text-xs font-semibold text-brand-muted mb-1">Personenprofil</p>
          {hasModules ? (
            <>
              <p className="text-sm font-medium text-navy mb-1">Einschätzung vorhanden</p>
              {summaryText ? (
                <p className="text-xs text-brand-muted line-clamp-2">{summaryText}</p>
              ) : (
                <p className="text-xs text-brand-muted">Keine gespeicherte Beschreibung</p>
              )}
            </>
          ) : (
            <p className="text-sm font-medium text-navy">Personenprofil anlegen</p>
          )}
        </div>
        <span className="text-xs text-accent font-medium flex-shrink-0">
          {hasModules ? 'Ansehen →' : 'Anlegen →'}
        </span>
      </div>
    </Link>
  )
}

const TOPIC_LABELS: Record<string, string> = {
  topic_self:           'Über mich',
  topic_person:         'Über die Fallperson',
  topic_responsibility: 'Verantwortung',
  topic_guilt:          'Schuld',
}

function TopicSummariesCard({ caseId, summaries }: { caseId: string; summaries: TopicSummary[] }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpanded = (topic: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(topic)) next.delete(topic)
      else next.add(topic)
      return next
    })

  const saveMutation = useMutation({
    mutationFn: ({ topic, text }: { topic: string; text: string }) =>
      topicSummariesApi.save(caseId, topic, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topic-summaries', caseId] })
      setEditingTopic(null)
    },
  })

  const summaryMap = Object.fromEntries(summaries.map(s => [s.topic, s]))
  const coreSummaries = summaries.filter((s) => !s.topic.startsWith('content_'))
  const contentSummaries = summaries.filter((s) => s.topic.startsWith('content_'))
  const hasSummaries = coreSummaries.length > 0

  return (
    <div className="card">
      <div className="mb-4">
        <p className="text-xs font-semibold text-brand-muted mb-0.5">Themendialoge</p>
        <p className="text-sm font-medium text-navy">
          {hasSummaries
            ? `${coreSummaries.length} von 4 Zusammenfassungen gespeichert`
            : 'Noch keine gespeicherten Zusammenfassungen'}
        </p>
        <p className="text-xs text-brand-muted mt-2 leading-relaxed">
          Geführte Dialoge zu vier Kernthemen – gespeicherte Zusammenfassungen fließen als Kontext in alle Echo-Gespräche und Berichte ein.
          Für freie Gespräche nutze den{' '}
          <Link to={`/app/cases/${caseId}/echo`} className="text-accent font-medium hover:underline">
            Echo-Chat →
          </Link>
        </p>
      </div>

      <div className="space-y-3">
        {TOPIC_ORDER.map(topic => {
          const saved = summaryMap[topic]
          const isEditing = editingTopic === topic

          return (
            <div key={topic} className="rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-navy">{TOPIC_LABELS[topic]}</p>
                <div className="flex gap-2">
                  {saved && !isEditing && (
                    <button
                      onClick={() => { setEditingTopic(topic); setEditValue(saved.summary_text) }}
                      className="text-xs text-brand-muted hover:text-navy transition-colors"
                    >
                      Bearbeiten
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/app/cases/${caseId}/topics/${topic}`)}
                    className="text-xs text-accent hover:underline"
                  >
                    {saved ? 'Dialog erneut führen →' : 'Dialog starten →'}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2 mt-2">
                  <textarea
                    className="w-full text-sm text-brand-text border border-brand-border rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                    rows={4}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveMutation.mutate({ topic, text: editValue.trim() })}
                      disabled={saveMutation.isPending || !editValue.trim()}
                      className="rounded-brand border border-accent bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
                    >
                      {saveMutation.isPending ? 'Speichern …' : 'Speichern'}
                    </button>
                    <button
                      onClick={() => setEditingTopic(null)}
                      className="rounded-brand border border-brand-border bg-white px-3 py-1 text-xs text-brand-muted hover:text-navy transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : saved ? (
                <div className="mt-2 text-sm text-brand-muted leading-relaxed">
                  <MarkdownMessage content={saved.summary_text} />
                </div>
              ) : (
                <p className="text-xs text-brand-muted/60 italic mt-1">Noch keine Zusammenfassung gespeichert</p>
              )}
            </div>
          )
        })}

        {/* Wissens-Dialoge (aus Reflexionen zu Wissensseiten) */}
        <div className="mt-4 pt-4 border-t border-brand-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider">Wissens-Dialoge</p>
            <Link to="/wissen" className="text-xs text-accent hover:underline flex-shrink-0">+ Wissensseite reflektieren →</Link>
          </div>
          {contentSummaries.length === 0 ? (
            <p className="text-xs text-brand-muted/60 italic">
              Noch keine. Starte einen über „Auf meine Situation beziehen" auf einer{' '}
              <Link to="/wissen" className="text-accent hover:underline">Wissensseite</Link>.
            </p>
          ) : (
            <div className="space-y-2">
              {contentSummaries.map((s) => {
                const slug = s.topic.slice('content_'.length)
                const meta = CONTENT_MANIFEST.find((m) => m.slug === slug)
                const isOpen = expanded.has(s.topic)
                return (
                  <div key={s.topic} className="rounded-brand border border-accent/20 bg-accent/5 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => toggleExpanded(s.topic)}
                        className="flex items-center gap-1.5 min-w-0 text-left"
                      >
                        <svg
                          className={`w-3.5 h-3.5 flex-shrink-0 text-accent transition-transform ${isOpen ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-xs font-semibold text-navy truncate">{meta?.title ?? slug}</span>
                      </button>
                      <button
                        onClick={() => navigate(`/app/cases/${caseId}/topics/${s.topic}`)}
                        className="text-xs text-accent hover:underline flex-shrink-0"
                      >
                        Dialog erneut führen →
                      </button>
                    </div>
                    {isOpen && (
                      <div className="mt-2 text-sm text-brand-muted leading-relaxed">
                        <MarkdownMessage content={s.summary_text} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HypothesesOverviewCard({ caseId }: { caseId: string }) {
  const { data: saved = [] } = useQuery({
    queryKey: ['hypotheses', caseId],
    queryFn: () => hypothesesApi.list(caseId),
    enabled: !!caseId,
  })
  const [hypOpen, setHypOpen] = useState<Set<string>>(new Set())
  const toggleHyp = (key: string) =>
    setHypOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold text-brand-muted mb-0.5">Hypothesen</p>
          <p className="text-sm font-medium text-navy">
            {saved.length > 0
              ? `${saved.length} Arbeitshypothese${saved.length === 1 ? '' : 'n'} gespeichert`
              : 'Noch keine Hypothesen entwickelt'}
          </p>
        </div>
        <Link to={`/app/cases/${caseId}/hypotheses`} className="text-xs font-semibold text-accent hover:underline shrink-0">
          Zu den Hypothesen →
        </Link>
      </div>

      {saved.length > 0 ? (
        <div className="space-y-2">
          {saved.map(h => {
            const isOpen = hypOpen.has(h.hypothesis_type)
            return (
              <div key={h.hypothesis_type} className="rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
                <button onClick={() => toggleHyp(h.hypothesis_type)} className="flex items-center gap-1.5 w-full text-left">
                  <svg className={`w-3.5 h-3.5 flex-shrink-0 text-accent transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-semibold text-navy">{h.label}</span>
                </button>
                {isOpen && (
                  <div className="mt-2 text-sm text-brand-muted leading-relaxed"><MarkdownMessage content={h.summary_text} /></div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-brand-muted/70 leading-relaxed">
          Geführte Dialoge zu Dynamik, Persönlichkeitsstruktur (Cluster-B), Bindung, Prägungen und eigenem Anteil –
          tastend, keine Diagnosen. Echo kennt dabei den vollen Fallkontext.
        </p>
      )}
    </div>
  )
}

function QuickCard({ title, value, to, cta }: {
  title: string; value: string; to: string; cta: string
}) {
  return (
    <Link to={to} className="card block no-underline hover:border-accent/40 transition-all">
      <p className="text-xs font-semibold text-brand-muted mb-1">{title}</p>
      <p className="text-sm font-medium text-navy mb-3">{value}</p>
      <span className="text-xs text-accent font-medium">{cta} →</span>
    </Link>
  )
}

function DangerZone({ caseId }: { caseId: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const del = useMutation({
    mutationFn: () => casesApi.deleteForever(caseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] })
      navigate('/app', { replace: true })
    },
  })

  return (
    <div className="mt-8 rounded-brand border border-red-200 bg-red-50/50 px-5 py-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-700">Fall endgültig löschen</p>
          <p className="text-xs text-brand-muted">
            Entfernt diesen Fall mit allen Szenen, Echo-Gesprächen, Berichten und Hypothesen – unwiderruflich.
          </p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="text-sm text-red-600 hover:underline shrink-0">
            Löschen…
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 border-t border-red-200 pt-3">
          <p className="text-sm text-red-800 mb-2">
            Tippe <strong>LÖSCHEN</strong>, um diesen Fall unwiderruflich zu entfernen.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
              className="w-40 rounded-brand border border-red-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <button
              onClick={() => del.mutate()}
              disabled={confirmText.trim().toUpperCase() !== 'LÖSCHEN' || del.isPending}
              className="rounded-brand bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
            >
              {del.isPending ? 'Lösche…' : 'Endgültig löschen'}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirmText('') }}
              className="px-3 py-2 text-sm text-brand-muted hover:text-navy"
            >
              Abbrechen
            </button>
          </div>
          {del.isError && (
            <p className="mt-2 text-sm text-red-600">Löschen fehlgeschlagen. Bitte erneut versuchen.</p>
          )}
        </div>
      )}
    </div>
  )
}
