/**
 * /professional/cases/:caseId — Fall-Arbeitsplatz der Fachperson (Reitermenü).
 * Zeigt NUR freigegebene Inhalte (Server liefert ein gefiltertes Bundle).
 * Bei Widerruf/keinem Zugriff antwortet der Server mit 404 → "Kein Zugriff".
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { Spinner } from '@/components/auth/ProfessionalRoute'
import { professionalApi } from '@/api/professional'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import AssignmentTypePanel from '@/components/professional/AssignmentTypePanel'
import AppointmentsPanel from '@/components/professional/AppointmentsPanel'
import {
  RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS, CONTACT_FREQUENCY_LABELS,
  SCALE_LABELS, SHARE_ELEMENT_LABELS,
} from '@/types'
import type { ProfessionalNote, SharedCaseBundle, ScaleKey, GlossaryTerm } from '@/types'
import { PROFILE_MODULES } from '@/utils/profileModules'
import { PERSON_PROFILE_MODULES } from '@/utils/personProfileModules'

const TOPIC_LABELS: Record<string, string> = {
  topic_self: 'Über mich', topic_person: 'Über die Fallperson',
  topic_responsibility: 'Verantwortung', topic_guilt: 'Schuld',
}

const TABS = [
  { key: 'ueber', label: 'Übersicht' },
  { key: 'dialog', label: 'Dialoge' },
  { key: 'questionnaire', label: 'Fragebögen' },
  { key: 'message', label: 'Nachrichten' },
  { key: 'resource', label: 'Ressourcen' },
  { key: 'echo', label: 'Echo' },
  { key: 'notes', label: 'Notizen' },
  { key: 'appointments', label: 'Termine' },
] as const
type TabKey = (typeof TABS)[number]['key']

/** Zweite Headerleiste des Fall-Arbeitsplatzes – Stil wie die Nutzer-CaseNav.
 *  Links steht fest die aktuell gewählte Klient:in (bleibt beim Scrollen sichtbar). */
function CaseWorkspaceNav({ active, onSelect, clientName }: {
  active: TabKey; onSelect: (k: TabKey) => void; clientName: string
}) {
  return (
    <div className="border-b border-brand-border bg-white sticky top-14 z-30">
      <div className="mx-auto max-w-[1100px] px-6 flex items-stretch gap-1">
        <div className="flex items-center gap-2 flex-shrink-0 pr-3 mr-1 border-r border-brand-border">
          <Link to="/professional/cases" title="Zu Klient:innen"
            className="text-brand-muted hover:text-navy no-underline" aria-label="Zu Klient:innen">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm font-semibold text-navy whitespace-nowrap">{clientName}</span>
        </div>
        <nav className="flex gap-0 overflow-x-auto flex-1 min-w-0" aria-label="Fall-Navigation">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active === key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-brand-muted hover:text-brand-text hover:border-brand-border'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy mb-3">{title}</h2>
      {children}
    </div>
  )
}

type ProfileLikeConfig = {
  id: string
  label: string
  selections?: { key: string; label: string; multi?: boolean; options: { value: string; label: string }[] }[]
  likertItems: { key: string; text: string }[]
  freeTexts?: { key: string; label: string }[]
  freeTextKey?: string
  freeTextLabel?: string
}

/** Rendert die ausgefüllten Antworten eines Profils (modules) anhand der Modul-Konfiguration. */
function ProfileAnswers({ modules, config }: {
  modules: Record<string, Record<string, unknown>>
  config: ProfileLikeConfig[]
}) {
  const sections = config
    .map(mod => {
      const ans = modules?.[mod.id] ?? {}
      const items: { label: string; value: string }[] = []
      for (const sel of mod.selections ?? []) {
        const v = ans[sel.key]
        if (v == null || (Array.isArray(v) && v.length === 0)) continue
        const toLabel = (x: unknown) => sel.options.find(o => o.value === x)?.label ?? String(x)
        items.push({ label: sel.label, value: Array.isArray(v) ? v.map(toLabel).join(', ') : toLabel(v) })
      }
      for (const it of mod.likertItems ?? []) {
        const v = ans[it.key]
        if (typeof v === 'number') items.push({ label: it.text, value: `${v}/5` })
      }
      for (const ft of mod.freeTexts ?? []) {
        const v = ans[ft.key]
        if (typeof v === 'string' && v.trim()) items.push({ label: ft.label, value: v })
      }
      if (mod.freeTextKey && mod.freeTextLabel) {
        const v = ans[mod.freeTextKey]
        if (typeof v === 'string' && v.trim()) items.push({ label: mod.freeTextLabel, value: v })
      }
      return items.length ? { id: mod.id, label: mod.label, items } : null
    })
    .filter((x): x is { id: string; label: string; items: { label: string; value: string }[] } => x !== null)

  if (sections.length === 0) {
    return <p className="text-sm text-brand-muted">Keine ausgefüllten Angaben in diesem Profil.</p>
  }

  return (
    <div className="space-y-2">
      {sections.map(sec => (
        <details key={sec.id} className="rounded-brand border border-brand-border bg-brand-bg px-4 py-2.5">
          <summary className="text-sm font-semibold text-navy cursor-pointer">{sec.label}</summary>
          <dl className="mt-2 space-y-2">
            {sec.items.map((it, i) => (
              <div key={i}>
                <dt className="text-xs text-brand-muted">{it.label}</dt>
                <dd className="text-sm text-brand-text whitespace-pre-wrap">{it.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </div>
  )
}

export default function ProfessionalCaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const [tab, setTab] = useState<TabKey>('ueber')
  const { data: bundle, isLoading, isError } = useQuery({
    queryKey: ['prof-case', caseId],
    queryFn: () => professionalApi.caseDetail(caseId!),
    retry: false,
    enabled: !!caseId,
  })
  const { data: glossary = [] } = useQuery({ queryKey: ['prof-glossary'], queryFn: professionalApi.glossary })

  const qc = useQueryClient()
  const deleteSummary = useMutation({
    mutationFn: (summaryId: string) => professionalApi.echoSummaryDelete(caseId!, summaryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prof-case', caseId] }),
  })

  if (isLoading) return <Spinner />

  if (isError || !bundle) {
    return (
      <ProfessionalShell>
        <div className="mx-auto max-w-[700px] px-6 py-16 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-lg font-semibold text-navy mb-2">Kein Zugriff</h1>
          <p className="text-sm text-brand-muted">
            Dieser Fall ist nicht (mehr) für Sie freigegeben. Möglicherweise wurde die Freigabe widerrufen.
          </p>
          <Link to="/professional" className="mt-6 inline-block btn-primary !py-2 !px-5 !text-sm">Zum Postfach</Link>
        </div>
      </ProfessionalShell>
    )
  }

  return (
    <ProfessionalShell>
      <CaseWorkspaceNav active={tab} onSelect={setTab} clientName={bundle.client_display_name} />
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Fall-Kopf (Klient:in steht oben in der Leiste) */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">{bundle.case_title}</h1>
          <p className="mt-1 text-xs text-brand-muted">Sie sehen nur die freigegebenen Inhalte dieses Falls.</p>
        </div>

        {tab === 'ueber' && <OverviewPanel bundle={bundle} />}
        {tab === 'dialog' && <AssignmentTypePanel caseId={caseId!} type="dialog" />}
        {tab === 'questionnaire' && <AssignmentTypePanel caseId={caseId!} type="questionnaire" />}
        {tab === 'message' && <AssignmentTypePanel caseId={caseId!} type="message" />}
        {tab === 'resource' && <AssignmentTypePanel caseId={caseId!} type="resource" />}
        {tab === 'echo' && (
          <EchoPanel
            caseId={caseId!}
            glossary={glossary}
            summaries={bundle.echo_summaries}
            onDelete={(id) => deleteSummary.mutate(id)}
            deleting={deleteSummary.isPending}
          />
        )}
        {tab === 'notes' && <NotesEditor caseId={caseId!} initial={bundle.notes} />}
        {tab === 'appointments' && <AppointmentsPanel caseId={caseId!} />}
      </div>
    </ProfessionalShell>
  )
}

/** Reiter „Übersicht": ausschließlich die freigegebenen Inhalte des Falls. */
function OverviewPanel({ bundle }: { bundle: SharedCaseBundle }) {
  const has = (t: SharedCaseBundle['allowed'][number]) => bundle.allowed.includes(t)
  return (
    <div>
      {/* Freigegebene Inhalte auf einen Blick */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {bundle.allowed.map(et => (
          <span key={et} className="text-[11px] px-2.5 py-1 rounded-full bg-accent/5 border border-accent/20 text-accent">
            {SHARE_ELEMENT_LABELS[et]}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {has('case_info') && bundle.case && (
          <Section title="Fallinformationen">
            <dl className="space-y-1.5 text-sm">
              <Row k="Beziehungstyp" v={RELATIONSHIP_TYPE_LABELS[bundle.case.relationship_type]} />
              <Row k="Status" v={RELATIONSHIP_STATUS_LABELS[bundle.case.relationship_status]} />
              <Row k="Kontaktfrequenz" v={CONTACT_FREQUENCY_LABELS[bundle.case.contact_frequency]} />
              {bundle.case.main_concern && <Row k="Hauptanliegen" v={bundle.case.main_concern} />}
            </dl>
          </Section>
        )}

        {has('onboarding') && bundle.onboarding && (
          <Section title="Onboarding-Informationen">
            <dl className="space-y-1.5 text-sm">
              {bundle.onboarding.person_name && <Row k="Fallperson (Pseudonym)" v={bundle.onboarding.person_name} />}
              {bundle.onboarding.relationship_description && <Row k="Beziehungsbeschreibung" v={bundle.onboarding.relationship_description} />}
              {bundle.onboarding.typical_scenes && <Row k="Typische Szenen" v={bundle.onboarding.typical_scenes} />}
              {bundle.onboarding.main_burden && <Row k="Hauptbelastung" v={bundle.onboarding.main_burden} />}
              {bundle.onboarding.significant_event && <Row k="Prägendes Ereignis" v={bundle.onboarding.significant_event} />}
              {bundle.onboarding.memorable_scenes && <Row k="Erinnerliche Szenen" v={bundle.onboarding.memorable_scenes} />}
              {typeof bundle.onboarding.distress_score === 'number' && <Row k="Belastungswert" v={`${bundle.onboarding.distress_score}/10`} />}
            </dl>
          </Section>
        )}

        {has('scales') && bundle.scales.length > 0 && (
          <Section title="Skalen">
            <div className="space-y-2">
              {bundle.scales.filter(s => (s.score ?? 0) > 0).map(s => (
                <div key={s.scale_key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-brand-text">{SCALE_LABELS[s.scale_key as ScaleKey] ?? s.scale_key}</span>
                    <span className="text-brand-muted">{Math.round(s.score)}/100</span>
                  </div>
                  <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.round(s.score))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {has('topic_summaries') && bundle.topic_summaries.length > 0 && (
          <Section title="Themendialog-Zusammenfassungen">
            <div className="space-y-3">
              {bundle.topic_summaries.map(t => (
                <div key={t.topic}>
                  <p className="text-xs font-semibold text-navy">{TOPIC_LABELS[t.topic] ?? t.topic}</p>
                  <p className="text-sm text-brand-muted whitespace-pre-wrap">{t.summary_text}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {has('person_profile') && bundle.person_profile && (
          <Section title="Fragebogen zur Fallperson">
            <ProfileAnswers modules={bundle.person_profile.modules} config={PERSON_PROFILE_MODULES} />
          </Section>
        )}
        {has('self_profile') && bundle.self_profile && (
          <Section title="Selbstprofil der nutzenden Person">
            {bundle.self_profile.summary_text && (
              <p className="mb-3 text-sm text-brand-muted whitespace-pre-wrap">{bundle.self_profile.summary_text}</p>
            )}
            <ProfileAnswers modules={bundle.self_profile.modules} config={PROFILE_MODULES} />
          </Section>
        )}
      </div>

      {(has('all_scenes') || has('scene')) && (
        <div className="mt-4">
          <Section title={`Szenen (${bundle.scenes.length})`}>
            {bundle.scenes.length === 0
              ? <p className="text-sm text-brand-muted">Keine freigegebenen Szenen.</p>
              : (
                <div className="space-y-4">
                  {bundle.scenes.map(s => (
                    <div key={s.id} className="border-b border-brand-border pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-navy">{s.title}</p>
                        {s.scene_date && <span className="text-xs text-brand-muted">{s.scene_date}</span>}
                      </div>
                      {s.description && <p className="mt-1 text-sm text-brand-muted whitespace-pre-wrap">{s.description}</p>}
                      {s.user_reaction && <p className="mt-1 text-xs text-brand-muted italic">Reaktion: {s.user_reaction}</p>}
                      {s.pattern_tags?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {s.pattern_tags.map((t, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-bg text-brand-muted">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </Section>
        </div>
      )}

      {has('reports') && bundle.reports.length > 0 && (
        <div className="mt-4">
          <Section title={`Berichte (${bundle.reports.length})`}>
            <div className="space-y-4">
              {bundle.reports.map(r => (
                <details key={r.id} className="rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
                  <summary className="text-sm font-semibold text-navy cursor-pointer">
                    {r.title || r.type_label || r.report_type}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {(r.content?.sections ?? []).map((sec, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold text-navy">{sec.heading}</p>
                        <p className="text-sm text-brand-muted whitespace-pre-wrap">{sec.text}</p>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

/** Reiter „Echo": Fall-Echo öffnen, Glossar, gespeicherte Zusammenfassungen. */
function EchoPanel({ caseId, glossary, summaries, onDelete, deleting }: {
  caseId: string
  glossary: GlossaryTerm[]
  summaries: SharedCaseBundle['echo_summaries']
  onDelete: (id: string) => void
  deleting: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-navy mb-1">Mit Echo über diesen Fall sprechen</h2>
          <p className="text-xs text-brand-muted">Vorbereitung auf Basis der freigegebenen Inhalte – ohne Diagnosen.</p>
        </div>
        <Link to={`/professional/cases/${caseId}/echo`} className="btn-primary !py-2 !px-5 !text-sm shrink-0">
          💬 Echo öffnen
        </Link>
      </div>

      {glossary.length > 0 && (
        <Section title="Glossar">
          <p className="text-xs text-brand-muted mb-3">Begriff anklicken, um ihn mit Echo im Kontext dieses Falls zu besprechen.</p>
          <div className="flex flex-wrap gap-2">
            {glossary.map(g => (
              <Link
                key={g.slug}
                to={`/professional/cases/${caseId}/echo?glossary=${g.slug}`}
                title={g.definition}
                className="text-xs px-3 py-1.5 rounded-full border border-brand-border text-brand-muted no-underline hover:border-accent hover:text-accent transition-colors"
              >
                {g.term}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {summaries.length > 0 && (
        <Section title="Gespeicherte Echo-Zusammenfassungen">
          <div className="space-y-3">
            {summaries.map(s => (
              <div key={s.id} className="rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  {s.title
                    ? <p className="text-sm font-semibold text-navy">{s.title}</p>
                    : <span className="text-xs text-brand-muted">Zusammenfassung</span>}
                  <button
                    onClick={() => { if (window.confirm('Diese Zusammenfassung löschen?')) onDelete(s.id) }}
                    disabled={deleting}
                    className="shrink-0 text-xs text-brand-muted hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    Löschen
                  </button>
                </div>
                <div className="text-sm text-brand-text leading-relaxed">
                  <MarkdownMessage content={s.summary_text} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-brand-muted shrink-0">{k}:</dt>
      <dd className="text-brand-text font-medium">{v}</dd>
    </div>
  )
}

const NOTE_FIELDS: { key: keyof ProfessionalNote; label: string }[] = [
  { key: 'first_impressions', label: 'Erste Eindrücke' },
  { key: 'key_scenes', label: 'Wichtige Szenen' },
  { key: 'open_questions', label: 'Offene Fragen' },
  { key: 'conversation_prompts', label: 'Gesprächsimpulse' },
  { key: 'next_steps', label: 'Nächste Schritte' },
  { key: 'free_text', label: 'Freitext' },
]

function NotesEditor({ caseId, initial }: { caseId: string; initial: ProfessionalNote | null }) {
  const qc = useQueryClient()
  const [note, setNote] = useState<ProfessionalNote>(initial ?? {})
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () => professionalApi.saveNotes(caseId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prof-case', caseId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  return (
    <Section title="Meine Notizen">
      <div className="space-y-3">
        {NOTE_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-brand-text mb-1">{label}</label>
            <textarea
              value={note[key] ?? ''}
              onChange={e => { setNote(p => ({ ...p, [key]: e.target.value })); setSaved(false) }}
              rows={2}
              className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-y"
            />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary !py-2 !px-5 !text-sm">
            {mutation.isPending ? 'Wird gespeichert …' : saved ? '✓ Gespeichert' : 'Notizen speichern'}
          </button>
        </div>
      </div>
    </Section>
  )
}
