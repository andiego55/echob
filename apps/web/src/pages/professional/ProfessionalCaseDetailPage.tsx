/**
 * /professional/cases/:caseId — Fall-Arbeitsplatz der Fachperson (Reitermenü).
 * Zeigt NUR freigegebene Inhalte (Server liefert ein gefiltertes Bundle).
 * Bei Widerruf/keinem Zugriff antwortet der Server mit 404 → "Kein Zugriff".
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import type {
  ProfessionalNote, SharedCaseBundle, ScaleKey, GlossaryTerm, NoteTemplate, SessionNote,
} from '@/types'
import { PROFILE_MODULES } from '@/utils/profileModules'
import { PERSON_PROFILE_MODULES } from '@/utils/personProfileModules'

const TOPIC_LABELS: Record<string, string> = {
  topic_self: 'Über mich', topic_person: 'Über die Fallperson',
  topic_responsibility: 'Verantwortung', topic_guilt: 'Schuld',
}

const HYP_LABELS: Record<string, string> = {
  hyp_dynamics: 'Beziehungsdynamik & Mechanik',
  hyp_clusterb: 'Persönlichkeitsstruktur (Cluster-B)',
  hyp_attachment: 'Bindungsmuster',
  hyp_trauma: 'Prägungen & Trauma',
  hyp_own_role: 'Eigener Anteil & Muster',
}

const TABS = [
  { key: 'ueber', label: 'Übersicht' },
  { key: 'dialog', label: 'Dialoge' },
  { key: 'questionnaire', label: 'Fragebögen' },
  { key: 'message', label: 'Nachrichten' },
  { key: 'resource', label: 'Ressourcen' },
  { key: 'echo', label: 'Echo' },
  { key: 'reports', label: 'Berichte' },
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
          <Link to="/professional/dashboard" title="Zum Dashboard"
            className="text-brand-muted hover:text-navy no-underline" aria-label="Zum Dashboard">
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

/** Gate für nicht-aktivierte (nicht-Demo) Fälle: Fall aktivieren (Sitz) oder Abo/Upgrade. */
/** Aktiver Fall (Sitz belegt): Hinweis + „Fall abschließen" (Werkzeuge zu, Einheit bleibt für den Monat). */
function CaseSeatActive({ caseId }: { caseId: string }) {
  const qc = useQueryClient()
  const release = useMutation({
    mutationFn: () => professionalApi.caseDeactivate(caseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prof-case', caseId] })
      qc.invalidateQueries({ queryKey: ['pro-billing'] })
      qc.invalidateQueries({ queryKey: ['pro-billing-activations'] })
    },
  })
  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap rounded-brand border border-green-200 bg-green-50 px-4 py-2.5">
      <p className="text-xs text-green-800">✓ Fall ist in diesem Abrechnungsmonat aktiviert – Werkzeuge frei.</p>
      <button
        onClick={() => {
          if (window.confirm(
            'Fall abschließen? Die Werkzeuge werden geschlossen. Die für diesen Abrechnungsmonat '
            + 'verbrauchte Einheit bleibt – eine erneute Aktivierung im selben Monat ist kostenlos.'))
            release.mutate()
        }}
        disabled={release.isPending}
        className="text-xs font-medium text-brand-muted hover:text-navy underline disabled:opacity-50"
      >
        {release.isPending ? 'Schließe …' : 'Fall abschließen'}
      </button>
    </div>
  )
}

function CaseActivationGate({ caseId }: { caseId: string }) {
  const qc = useQueryClient()
  const [err, setErr] = useState<string | null>(null)
  const activate = useMutation({
    mutationFn: () => professionalApi.caseActivate(caseId),
    onSuccess: () => {
      setErr(null)
      qc.invalidateQueries({ queryKey: ['prof-case', caseId] })
      qc.invalidateQueries({ queryKey: ['pro-billing'] })
      qc.invalidateQueries({ queryKey: ['pro-billing-activations'] })
    },
    onError: (e) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(detail ?? 'ERROR')
    },
  })
  const msg = err === 'PLAN_REQUIRED'
    ? 'Dafür ist ein aktives Praxis-Abo nötig.'
    : err === 'UPGRADE_REQUIRED'
      ? 'Das Fall-Kontingent Ihres Tarifs ist erreicht — bitte upgraden.'
      : err
        ? 'Aktivierung fehlgeschlagen.'
        : null

  return (
    <div className="mb-6 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">Fall nicht aktiviert</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Aktivieren Sie diesen Fall, um die Werkzeuge (Echo, Berichte, Notizen) zu nutzen.
            Er zählt dann als aktiver Fall Ihres Tarifs.
          </p>
          {msg && (
            <p className="mt-1 text-xs text-red-700">
              {msg} <Link to="/professional/settings" className="underline">Zur Abrechnung</Link>
            </p>
          )}
        </div>
        <button onClick={() => activate.mutate()} disabled={activate.isPending}
          className="shrink-0 text-sm font-semibold px-4 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
          {activate.isPending ? 'Aktiviere …' : 'Fall aktivieren'}
        </button>
      </div>
    </div>
  )
}

/** Hinweis + Schnellstart-Checkliste für den fiktiven Beispielfall (Spielwiese). */
function DemoIntro({ onGoto }: { onGoto: (t: TabKey) => void }) {
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('echob_demo_intro') === 'off',
  )
  if (dismissed) return null
  const close = () => {
    setDismissed(true)
    try { localStorage.setItem('echob_demo_intro', 'off') } catch { /* ignore */ }
  }
  const steps: { label: string; tab: TabKey }[] = [
    { label: 'Bericht erzeugen', tab: 'reports' },
    { label: 'Sitzungsnotiz schreiben', tab: 'notes' },
    { label: 'Mit Echo sprechen', tab: 'echo' },
  ]
  return (
    <div className="mb-6 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">Fiktiver Beispielfall — Ihre Spielwiese</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Probieren Sie hier alle Werkzeuge gefahrlos aus. Erfundener Fall, keine echten Daten.
          </p>
        </div>
        <button onClick={close} className="shrink-0 text-xs text-amber-700 hover:text-amber-900">
          Ausblenden
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {steps.map(s => (
          <button key={s.tab} onClick={() => onGoto(s.tab)}
            className="text-xs font-medium px-2.5 py-1 rounded-full border border-amber-300 bg-white text-amber-900 hover:border-amber-500 transition-colors">
            {s.label} →
          </button>
        ))}
      </div>
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
      const items: { label: string; value: string; likert?: number }[] = []
      for (const sel of mod.selections ?? []) {
        const v = ans[sel.key]
        if (v == null || (Array.isArray(v) && v.length === 0)) continue
        const toLabel = (x: unknown) => sel.options.find(o => o.value === x)?.label ?? String(x)
        items.push({ label: sel.label, value: Array.isArray(v) ? v.map(toLabel).join(', ') : toLabel(v) })
      }
      for (const it of mod.likertItems ?? []) {
        const v = ans[it.key]
        if (typeof v === 'number') items.push({ label: it.text, value: `${v}/5`, likert: v })
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
    .filter((x): x is { id: string; label: string; items: { label: string; value: string; likert?: number }[] } => x !== null)

  if (sections.length === 0) {
    return <p className="text-sm text-brand-muted">Keine ausgefüllten Angaben in diesem Profil.</p>
  }

  return (
    <div className="space-y-2">
      {sections.map(sec => (
        <details key={sec.id} className="group rounded-brand border border-brand-border bg-white px-4 py-2.5 open:border-accent/30">
          <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-medium text-navy">{sec.label}</span>
            <Chevron />
          </summary>
          <dl className="mt-3 space-y-3 border-t border-brand-border pt-3">
            {sec.items.map((it, i) => (
              <div key={i}>
                <dt className="text-xs text-brand-muted">{it.label}</dt>
                {it.likert != null ? (
                  <dd className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, k) => {
                      const n = k + 1
                      const active = n === it.likert
                      const filled = n < (it.likert ?? 0)
                      return (
                        <span key={k} className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-semibold tabular-nums ${
                          active ? 'bg-accent text-white' : filled ? 'bg-accent/15 text-accent' : 'border border-brand-border bg-white text-brand-muted/50'
                        }`}>{n}</span>
                      )
                    })}
                  </dd>
                ) : (
                  <dd className="text-sm text-brand-text whitespace-pre-wrap">{it.value}</dd>
                )}
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
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<TabKey>('ueber')
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && TABS.some(x => x.key === t)) setTab(t as TabKey)
  }, [searchParams])
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
  const updateSummary = useMutation({
    mutationFn: (v: { id: string; title: string | null; summary_text: string }) =>
      professionalApi.echoSummaryUpdate(caseId!, v.id, { title: v.title, summary_text: v.summary_text }),
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
          <h1 className="text-2xl font-bold text-navy">
            {bundle.case_title}
            {bundle.is_demo && (
              <span className="ml-2 align-middle px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                Beispiel
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-brand-muted">Sie sehen nur die freigegebenen Inhalte dieses Falls.</p>
        </div>
        {bundle.is_demo && <DemoIntro onGoto={setTab} />}
        {!bundle.is_demo && !bundle.activated && <CaseActivationGate caseId={caseId!} />}
        {!bundle.is_demo && bundle.activated && <CaseSeatActive caseId={caseId!} />}

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
            onUpdate={(v) => updateSummary.mutate(v)}
            updating={updateSummary.isPending}
          />
        )}
        {tab === 'reports' && <ReportsPanel caseId={caseId!} />}
        {tab === 'notes' && <NotesPanel caseId={caseId!} overview={bundle.notes} />}
        {tab === 'appointments' && <AppointmentsPanel caseId={caseId!} />}
      </div>
    </ProfessionalShell>
  )
}

/** Reiter „Übersicht": ausschließlich die freigegebenen Inhalte des Falls. */
function CouplePanel({ caseId }: { caseId: string }) {
  const qc = useQueryClient()
  const { data: status } = useQuery({
    queryKey: ['case-couple', caseId],
    queryFn: () => professionalApi.caseCoupleStatus(caseId),
  })
  const { data: groups = [] } = useQuery({
    queryKey: ['prof-cases-for-couple'],
    queryFn: professionalApi.cases,
    enabled: !!status,
  })
  const [partner, setPartner] = useState('')
  const create = useMutation({
    mutationFn: (partnerId: string) => professionalApi.createCouple(caseId, partnerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-couple', caseId] }),
  })
  const remove = useMutation({
    mutationFn: (coupleId: string) => professionalApi.deleteCouple(coupleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-couple', caseId] }),
  })

  if (!status) return null

  // Pseudonym (client_display_name) als Label — damit sich die Fachperson zurechtfindet.
  const allCases = groups.flatMap(g =>
    g.cases.map(c => ({ case_id: c.case_id, label: `${g.client_display_name} · ${c.case_title}` })),
  )

  if (status.coupled && status.couple_id) {
    const partnerLabel = allCases.find(c => c.case_id === status.partner_case_id)?.label
    return (
      <div className="mb-6 rounded-brand border border-accent/30 bg-accent/[0.04] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <span className="font-semibold text-navy">🔗 Partner gekoppelt{partnerLabel ? ` mit ${partnerLabel}` : ''}.</span>{' '}
          <span className="text-brand-muted">Sie können mit Echo über beide Fälle gemeinsam sprechen.</span>
          {status.partner_case_id && (
            <Link to={`/professional/cases/${status.partner_case_id}`} className="ml-2 text-xs text-accent hover:underline">Partnerfall öffnen →</Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/professional/couples/${status.couple_id}/echo`} className="btn-primary !py-1.5 !px-4 !text-xs">Paar-Analyse mit Echo</Link>
          <button
            onClick={() => {
              if (!window.confirm(
                'Kopplung wirklich lösen?\n\nAlle gespeicherten Paar-Dialoge und Paar-Analyse-Berichte dieser Kopplung gehen dabei UNWIDERRUFLICH verloren. Die Einzelfälle und ihre Freigaben bleiben unberührt.',
              )) return
              if (!window.confirm('Sicher? Dieser Schritt kann nicht rückgängig gemacht werden.')) return
              remove.mutate(status.couple_id!)
            }}
            className="text-xs text-brand-muted hover:text-red-600">Entkoppeln</button>
        </div>
      </div>
    )
  }

  const others = allCases.filter(c => c.case_id !== caseId)
  return (
    <div className="mb-6 rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
      <p className="text-sm font-semibold text-navy mb-1">Partner koppeln (Paar-Analyse)</p>
      <p className="text-xs text-brand-muted mb-2 max-w-[640px]">
        Wenn auch der/die Partner:in einen Fall an Sie freigegeben hat, können Sie beide Fälle koppeln und
        mit Echo gemeinsam betrachten. Die Freigaben bleiben unverändert – es entsteht kein neuer Datenzugriff.
      </p>
      {others.length === 0 ? (
        <p className="text-xs text-brand-muted/80">Kein weiterer freigegebener Fall zum Koppeln vorhanden.</p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={partner} onChange={e => setPartner(e.target.value)}
            className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm">
            <option value="">Partnerfall wählen …</option>
            {others.map(c => <option key={c.case_id} value={c.case_id}>{c.label}</option>)}
          </select>
          <button onClick={() => partner && create.mutate(partner)} disabled={!partner || create.isPending}
            className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-40">
            {create.isPending ? 'Koppeln …' : 'Koppeln'}
          </button>
        </div>
      )}
      {create.isError && <p className="mt-2 text-xs text-red-600">Konnte nicht koppeln. Beide Fälle müssen aktiv freigegeben sein.</p>}
    </div>
  )
}

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

      <CouplePanel caseId={bundle.case_id} />

      <div className="grid gap-4 lg:grid-cols-2">
        {has('case_info') && bundle.case && (
          <Section title="Fallinformationen">
            <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
              <Field label="Beziehungstyp"><InfoChip>{RELATIONSHIP_TYPE_LABELS[bundle.case.relationship_type]}</InfoChip></Field>
              <Field label="Status"><InfoChip>{RELATIONSHIP_STATUS_LABELS[bundle.case.relationship_status]}</InfoChip></Field>
              <Field label="Kontaktfrequenz"><InfoChip>{CONTACT_FREQUENCY_LABELS[bundle.case.contact_frequency]}</InfoChip></Field>
              {bundle.case.main_concern && <Field label="Hauptanliegen" wide>{bundle.case.main_concern}</Field>}
            </dl>
          </Section>
        )}

        {has('onboarding') && bundle.onboarding && (
          <Section title="Onboarding-Informationen">
            <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
              {bundle.onboarding.person_name && <Field label="Fallperson (Pseudonym)">{bundle.onboarding.person_name}</Field>}
              {typeof bundle.onboarding.distress_score === 'number' && <Field label="Belastungswert"><DistressBadge score={bundle.onboarding.distress_score} /></Field>}
              {bundle.onboarding.relationship_description && <Field label="Beziehungsbeschreibung" wide>{bundle.onboarding.relationship_description}</Field>}
              {bundle.onboarding.typical_scenes && <Field label="Typische Szenen" wide>{bundle.onboarding.typical_scenes}</Field>}
              {bundle.onboarding.main_burden && <Field label="Hauptbelastung" wide>{bundle.onboarding.main_burden}</Field>}
              {bundle.onboarding.significant_event && <Field label="Prägendes Ereignis" wide>{bundle.onboarding.significant_event}</Field>}
              {bundle.onboarding.memorable_scenes && <Field label="Erinnerliche Szenen" wide>{bundle.onboarding.memorable_scenes}</Field>}
            </dl>
          </Section>
        )}

        {has('scales') && bundle.scales.length > 0 && (
          <Section title="Skalen">
            <div className="space-y-2.5">
              {bundle.scales.filter(s => (Number(s.score) || 0) > 0).map(s => {
                const score = Number(s.score) || 0
                const label = SCALE_LABELS[s.scale_key as ScaleKey] ?? s.scale_key
                return (
                  <div key={s.scale_key} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 truncate text-xs font-medium text-navy" title={label}>{label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-border/70">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.round((score / 5) * 100))}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-accent">
                      {score.toFixed(1)}<span className="text-[10px] font-normal text-brand-muted">/5</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {has('topic_summaries') && bundle.topic_summaries.length > 0 && (
          <Section title="Themendialog-Zusammenfassungen">
            <div className="space-y-2">
              {bundle.topic_summaries.map(t => (
                <details key={t.topic} className="group rounded-brand border border-brand-border bg-white px-4 py-2.5 open:border-accent/30">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-medium text-navy truncate">{TOPIC_LABELS[t.topic] ?? t.topic}</span>
                    <Chevron />
                  </summary>
                  <div className="mt-3 border-t border-brand-border pt-3 text-sm text-brand-text leading-relaxed">
                    <MarkdownMessage content={t.summary_text} />
                  </div>
                </details>
              ))}
            </div>
          </Section>
        )}

        {has('hypotheses') && bundle.hypotheses.length > 0 && (
          <Section title="Hypothesen (tastend, keine Diagnose)">
            <div className="space-y-2">
              {bundle.hypotheses.map(h => (
                <details key={h.hypothesis_type} className="group rounded-brand border border-brand-border bg-white px-4 py-2.5 open:border-accent/30">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-medium text-navy truncate">{HYP_LABELS[h.hypothesis_type] ?? h.hypothesis_type}</span>
                    <Chevron />
                  </summary>
                  <div className="mt-3 border-t border-brand-border pt-3 text-sm text-brand-text leading-relaxed">
                    <MarkdownMessage content={h.summary_text} />
                  </div>
                </details>
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
              <div className="mb-3 text-sm text-brand-text leading-relaxed">
                <MarkdownMessage content={bundle.self_profile.summary_text} />
              </div>
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
                <div className="space-y-2.5">
                  {bundle.scenes.map(s => (
                    <div key={s.id} className="rounded-brand border border-brand-border bg-white px-4 py-3">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-navy">{s.title}</p>
                        {s.scene_date && <span className="text-xs text-brand-muted">{s.scene_date}</span>}
                      </div>
                      {s.description && <p className="mt-1.5 text-sm text-brand-text whitespace-pre-wrap leading-relaxed">{s.description}</p>}
                      {s.user_reaction && <p className="mt-1.5 text-xs text-brand-muted italic">Reaktion: {s.user_reaction}</p>}
                      {s.pattern_tags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {s.pattern_tags.map((t, i) => (
                            <span key={i} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">{t}</span>
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
                <details key={r.id} className="group rounded-brand border border-brand-border bg-white px-4 py-3 open:border-accent/30">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2 min-w-0">
                      <DocIcon />
                      <span className="text-sm font-medium text-navy truncate">{r.title || r.type_label || r.report_type}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {r.type_label && r.title && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">{r.type_label}</span>
                      )}
                      <Chevron />
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-brand-border pt-3">
                    {(r.content?.sections ?? []).map((sec, i) => (
                      <div key={i}>
                        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{sec.heading}</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy">{sec.text}</p>
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
function EchoPanel({ caseId, glossary, summaries, onDelete, deleting, onUpdate, updating }: {
  caseId: string
  glossary: GlossaryTerm[]
  summaries: SharedCaseBundle['echo_summaries']
  onDelete: (id: string) => void
  deleting: boolean
  onUpdate: (v: { id: string; title: string | null; summary_text: string }) => void
  updating: boolean
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
          <div className="space-y-2">
            {summaries.map(s => (
              <SummaryItem
                key={s.id} s={s}
                onDelete={onDelete} deleting={deleting}
                onUpdate={onUpdate} updating={updating}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

const STANDARD_REPORT_OPTIONS = [
  { key: 'verlauf', label: 'Verlaufsbericht', hint: 'Entwicklung über die Zeit' },
  { key: 'uebergabe', label: 'Übergabe-/Überweisung', hint: 'Kompakt zur Weitergabe' },
  { key: 'standort', label: 'Fall-Standortbestimmung', hint: 'Umfassende Momentaufnahme' },
] as const

const STANDARD_SOURCE_LABELS: Record<string, string> = {
  'standard:verlauf': 'Verlaufsbericht',
  'standard:uebergabe': 'Übergabe-/Überweisungsbericht',
  'standard:standort': 'Fall-Standortbestimmung',
  'standard:couple': 'Paaranalyse-Bericht',
}

function sourceLabel(source: string): string {
  return STANDARD_SOURCE_LABELS[source] || (source === 'template' ? 'Eigene Vorlage' : 'Bericht')
}

/** Reiter „Berichte": Standardbericht/eigene Vorlage wählen, generieren, Liste verwalten. */
function ReportsPanel({ caseId }: { caseId: string }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [selected, setSelected] = useState('standard:verlauf')   // 'standard:<key>' | 'template:<id>'

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['prof-case-reports', caseId],
    queryFn: () => professionalApi.caseReports(caseId),
  })
  const { data: templates = [] } = useQuery({
    queryKey: ['prof-report-templates'],
    queryFn: () => professionalApi.reportTemplates(),
  })
  const { data: coupleStatus } = useQuery({
    queryKey: ['case-couple', caseId],
    queryFn: () => professionalApi.caseCoupleStatus(caseId),
  })

  const create = useMutation({
    mutationFn: () => {
      const sep = selected.indexOf(':')
      const kind = selected.slice(0, sep)
      const val = selected.slice(sep + 1)
      return kind === 'standard'
        ? professionalApi.caseReportCreate(caseId, { source: 'standard', standard_key: val })
        : professionalApi.caseReportCreate(caseId, { source: 'template', template_id: val })
    },
    onSuccess: (rep) => {
      qc.invalidateQueries({ queryKey: ['prof-case-reports', caseId] })
      navigate(`/professional/cases/${caseId}/reports/${rep.id}`)
    },
  })
  const del = useMutation({
    mutationFn: (id: string) => professionalApi.caseReportDelete(caseId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prof-case-reports', caseId] }),
  })

  const tile = (active: boolean) =>
    `text-left rounded-brand border px-3 py-2 transition-colors ${
      active ? 'border-accent bg-accent/5' : 'border-brand-border hover:border-accent/50'
    }`

  return (
    <div className="space-y-6">
      <Section title="Neuen Bericht erstellen">
        <p className="text-sm text-brand-muted mb-4">
          Echo erstellt einen strukturierten Bericht aus dem freigegebenen Material sowie Ihren
          Notizen, Hypothesen und Echo-Zusammenfassungen. Sie können ihn danach bearbeiten und drucken.
        </p>

        <div className="text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">Standardberichte</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {STANDARD_REPORT_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setSelected(`standard:${o.key}`)}
              className={tile(selected === `standard:${o.key}`)}>
              <div className="text-sm font-semibold text-navy">{o.label}</div>
              <div className="text-[11px] text-brand-muted">{o.hint}</div>
            </button>
          ))}
        </div>

        {coupleStatus?.coupled && (
          <>
            <div className="text-xs font-semibold text-navy uppercase tracking-wide mt-4 mb-1.5">Paar-Analyse</div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button onClick={() => setSelected('standard:couple')}
                className={tile(selected === 'standard:couple')}>
                <div className="text-sm font-semibold text-navy">🔗 Paaranalyse-Bericht</div>
                <div className="text-[11px] text-brand-muted">Über beide gekoppelten Fälle</div>
              </button>
            </div>
          </>
        )}

        {templates.length > 0 && (
          <>
            <div className="text-xs font-semibold text-navy uppercase tracking-wide mt-4 mb-1.5">Eigene Vorlagen</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {templates.map(t => (
                <button key={t.id} onClick={() => setSelected(`template:${t.id}`)}
                  className={tile(selected === `template:${t.id}`)}>
                  <div className="text-sm font-semibold text-navy truncate">{t.name}</div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button onClick={() => create.mutate()} disabled={create.isPending}
            className="text-sm font-semibold px-4 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
            {create.isPending ? 'Echo erstellt den Bericht …' : 'Bericht erstellen'}
          </button>
          <Link to="/professional/report-templates" className="text-sm text-brand-muted hover:text-accent">
            Vorlagen verwalten →
          </Link>
          {create.isPending && (
            <span className="text-[11px] text-brand-muted">Das kann bis zu einer Minute dauern.</span>
          )}
        </div>
        {create.isError && (
          <p className="text-xs text-red-600 mt-2">Bericht konnte nicht erstellt werden. Bitte erneut versuchen.</p>
        )}
      </Section>

      <Section title="Erstellte Berichte">
        {isLoading ? (
          <p className="text-sm text-brand-muted">Wird geladen …</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-brand-muted">Noch keine Berichte erstellt.</p>
        ) : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id}
                className="flex items-center justify-between gap-3 rounded-brand border border-brand-border bg-white px-4 py-2.5">
                <Link to={`/professional/cases/${caseId}/reports/${r.id}`} className="flex items-center gap-2.5 min-w-0 no-underline group">
                  <DocIcon />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy truncate group-hover:text-accent transition-colors">{r.title || 'Bericht'}</span>
                    <span className="block text-[11px] text-brand-muted">{sourceLabel(r.source)} · {fmtSummaryDate(r.created_at)}</span>
                  </span>
                </Link>
                <button
                  onClick={() => { if (window.confirm('Diesen Bericht löschen?')) del.mutate(r.id) }}
                  disabled={del.isPending}
                  className="shrink-0 text-xs text-brand-muted hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function fmtSummaryDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** Eine gespeicherte Zusammenfassung: Titel + Datum, aufklappbar, mit Inline-Bearbeitung. */
function SummaryItem({ s, onDelete, deleting, onUpdate, updating }: {
  s: SharedCaseBundle['echo_summaries'][number]
  onDelete: (id: string) => void
  deleting: boolean
  onUpdate: (v: { id: string; title: string | null; summary_text: string }) => void
  updating: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(s.title ?? '')
  const [text, setText] = useState(s.summary_text)

  // „bearbeitet" nur zeigen, wenn merklich nach dem Erstellen geändert (>1 Min).
  const edited = new Date(s.updated_at).getTime() - new Date(s.created_at).getTime() > 60_000

  const start = () => { setTitle(s.title ?? ''); setText(s.summary_text); setEditing(true) }
  const save = () => {
    if (!text.trim()) return
    onUpdate({ id: s.id, title: title.trim() || null, summary_text: text })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-brand border border-accent bg-brand-bg px-4 py-3 space-y-2">
        <input
          value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
          placeholder="Titel (optional)"
          className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm font-semibold text-navy outline-none focus:border-accent"
        />
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={8}
          className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={updating || !text.trim()}
            className="text-sm font-semibold px-4 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
            {updating ? 'Wird gespeichert …' : 'Speichern'}
          </button>
          <button onClick={() => setEditing(false)} disabled={updating}
            className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
        </div>
      </div>
    )
  }

  return (
    <details className="rounded-brand border border-brand-border bg-brand-bg px-4 py-2.5">
      <summary className="flex items-start justify-between gap-3 cursor-pointer">
        <span className="min-w-0">
          <span className="text-sm font-semibold text-navy">{s.title || 'Zusammenfassung'}</span>
          <span className="block text-[11px] text-brand-muted">
            {fmtSummaryDate(s.created_at)}{edited && ` · bearbeitet ${fmtSummaryDate(s.updated_at)}`}
          </span>
        </span>
        <span className="shrink-0 flex items-center gap-3">
          <button
            onClick={(e) => { e.preventDefault(); start() }}
            className="text-xs text-brand-muted hover:text-accent transition-colors"
          >
            Bearbeiten
          </button>
          <button
            onClick={(e) => { e.preventDefault(); if (window.confirm('Diese Zusammenfassung löschen?')) onDelete(s.id) }}
            disabled={deleting}
            className="text-xs text-brand-muted hover:text-red-600 transition-colors disabled:opacity-40"
          >
            Löschen
          </button>
        </span>
      </summary>
      <div className="mt-2 text-sm text-brand-text leading-relaxed">
        <MarkdownMessage content={s.summary_text} />
      </div>
    </details>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm leading-relaxed text-navy">{children}</dd>
    </div>
  )
}

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-medium text-accent">{children}</span>
  )
}

function DocIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand-muted" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  )
}

function Chevron() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-open:rotate-180"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  )
}

function DistressBadge({ score }: { score: number }) {
  const pct = Math.min(100, Math.round((score / 10) * 100))
  const bar = score >= 7 ? 'bg-red-500' : score >= 4 ? 'bg-amber-400' : 'bg-green-500'
  const txt = score >= 7 ? 'text-red-600' : score >= 4 ? 'text-amber-600' : 'text-green-600'
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`text-base font-bold tabular-nums ${txt}`}>{score}<span className="text-xs font-normal text-brand-muted">/10</span></span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-brand-border">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
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

function fmtSessionDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}
const todayISO = () => new Date().toISOString().slice(0, 10)

/** Notizen-Reiter: Sitzungsverlauf (Hauptteil) + aufklappbarer dauerhafter Fallüberblick. */
function NotesPanel({ caseId, overview }: { caseId: string; overview: ProfessionalNote | null }) {
  return (
    <div className="space-y-6">
      <SessionNotesSection caseId={caseId} />

      <details className="card">
        <summary className="flex items-center justify-between cursor-pointer list-none">
          <h2 className="text-sm font-bold text-navy">Fallüberblick</h2>
          <span className="text-xs text-brand-muted">dauerhafte Notizen · auf-/zuklappen</span>
        </summary>
        <p className="mt-2 text-xs text-brand-muted">
          Stehende Notizen zum Fall (fließen in Echo und Berichte ein). Für einzelne Sitzungen nutze
          den Verlauf oben.
        </p>
        <div className="mt-4">
          <NotesOverviewEditor caseId={caseId} initial={overview} />
        </div>
      </details>
    </div>
  )
}

/** Der bisherige 6-Felder-Editor (stehender Fallüberblick), unverändert in der Logik. */
function NotesOverviewEditor({ caseId, initial }: { caseId: string; initial: ProfessionalNote | null }) {
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
          {mutation.isPending ? 'Wird gespeichert …' : saved ? '✓ Gespeichert' : 'Überblick speichern'}
        </button>
      </div>
    </div>
  )
}

function SessionNotesSection({ caseId }: { caseId: string }) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [managing, setManaging] = useState(false)

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['prof-session-notes', caseId],
    queryFn: () => professionalApi.sessionNotes(caseId),
  })
  const { data: templates = [] } = useQuery({
    queryKey: ['prof-note-templates'],
    queryFn: () => professionalApi.noteTemplates(),
  })

  const del = useMutation({
    mutationFn: (id: string) => professionalApi.sessionNoteDelete(caseId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prof-session-notes', caseId] }),
  })

  return (
    <Section title="Sitzungsverlauf">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!creating && (
          <button onClick={() => setCreating(true)}
            className="text-sm font-semibold px-4 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90">
            + Neue Sitzungsnotiz
          </button>
        )}
        <button onClick={() => setManaging(v => !v)} className="text-sm text-brand-muted hover:text-accent">
          {managing ? 'Vorlagen schließen' : 'Vorlagen verwalten'}
        </button>
      </div>

      {managing && <NoteTemplatesManager templates={templates} />}

      {creating && (
        <div className="mb-5">
          <SessionNoteForm caseId={caseId} templates={templates} onDone={() => setCreating(false)} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-brand-muted">Wird geladen …</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-brand-muted">Noch keine Sitzungsnotizen. Lege die erste an.</p>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <SessionNoteCard
              key={n.id} caseId={caseId} note={n}
              onDelete={() => { if (window.confirm('Diese Sitzungsnotiz löschen?')) del.mutate(n.id) }}
              deleting={del.isPending}
            />
          ))}
        </div>
      )}
    </Section>
  )
}

function SessionNoteCard({ caseId, note, onDelete, deleting }: {
  caseId: string; note: SessionNote; onDelete: () => void; deleting: boolean
}) {
  const [editing, setEditing] = useState(false)
  const sections = note.content?.sections ?? []

  if (editing) {
    return (
      <div className="rounded-brand border border-accent/40 bg-brand-bg p-4">
        <SessionNoteForm caseId={caseId} note={note} onDone={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <details className="rounded-brand border border-brand-border bg-brand-bg px-4 py-2.5">
      <summary className="flex items-start justify-between gap-3 cursor-pointer list-none">
        <span className="min-w-0">
          <span className="text-sm font-semibold text-navy">{note.title || 'Sitzungsnotiz'}</span>
          <span className="block text-[11px] text-brand-muted">{fmtSessionDate(note.session_date)}</span>
        </span>
        <span className="shrink-0 flex items-center gap-3">
          <button onClick={(e) => { e.preventDefault(); setEditing(true) }}
            className="text-xs text-brand-muted hover:text-accent transition-colors">Bearbeiten</button>
          <button onClick={(e) => { e.preventDefault(); onDelete() }} disabled={deleting}
            className="text-xs text-brand-muted hover:text-red-600 transition-colors disabled:opacity-40">Löschen</button>
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        {sections.map((s, i) => (
          <div key={i}>
            {s.heading && <div className="text-xs font-bold text-navy">{s.heading}</div>}
            <div className="text-sm text-brand-text leading-relaxed">
              <MarkdownMessage content={s.text} />
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

/** Formular für Erstellen/Bearbeiten einer Sitzungsnotiz (Datum + Titel + Abschnitte). */
function SessionNoteForm({ caseId, templates, note, onDone }: {
  caseId: string; templates?: NoteTemplate[]; note?: SessionNote; onDone: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!note
  const [date, setDate] = useState(note?.session_date ?? todayISO())
  const [title, setTitle] = useState(note?.title ?? '')
  const [sections, setSections] = useState<{ heading: string; text: string }[]>(
    note?.content?.sections ?? [{ heading: '', text: '' }],
  )

  const applyTemplate = (t: NoteTemplate) => {
    setSections(t.fields.map(f => ({ heading: f, text: '' })))
    if (!title.trim()) setTitle(t.name)
  }
  const setSec = (i: number, patch: Partial<{ heading: string; text: string }>) =>
    setSections(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const save = useMutation({
    mutationFn: () => {
      const payload = { session_date: date, title: title.trim() || null, sections }
      return isEdit
        ? professionalApi.sessionNoteUpdate(caseId, note!.id, payload)
        : professionalApi.sessionNoteCreate(caseId, payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prof-session-notes', caseId] }); onDone() },
  })

  const canSave = sections.some(s => s.text.trim() || s.heading.trim())

  return (
    <div className="rounded-brand border border-brand-border bg-white p-4 space-y-3">
      {!isEdit && templates && templates.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">Vorlage</div>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <button key={t.id} onClick={() => applyTemplate(t)}
                className="text-xs px-2.5 py-1 rounded-full border border-brand-border text-navy hover:border-accent hover:text-accent transition-colors">
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-text mb-1">Datum</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-brand-text mb-1">Titel</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="z. B. Sitzung 3"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="rounded-brand border border-brand-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input value={s.heading} onChange={e => setSec(i, { heading: e.target.value })}
                placeholder="Abschnitt (z. B. Beobachtungen)"
                className="flex-1 text-sm font-semibold text-navy bg-white border border-brand-border rounded-brand px-2.5 py-1.5 outline-none focus:border-accent" />
              {sections.length > 1 && (
                <button onClick={() => setSections(prev => prev.filter((_, j) => j !== i))}
                  className="text-xs text-brand-muted hover:text-red-600">Entfernen</button>
              )}
            </div>
            <textarea value={s.text} onChange={e => setSec(i, { text: e.target.value })} rows={4}
              className="w-full text-sm text-brand-text bg-white border border-brand-border rounded-brand px-2.5 py-2 outline-none focus:border-accent resize-y" />
          </div>
        ))}
        <button onClick={() => setSections(prev => [...prev, { heading: '', text: '' }])}
          className="text-xs text-accent hover:underline">+ Abschnitt hinzufügen</button>
      </div>

      <div className="flex items-center gap-3 border-t border-brand-border pt-3">
        <button onClick={() => save.mutate()} disabled={!canSave || save.isPending}
          className="text-sm font-semibold px-4 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
          {save.isPending ? 'Speichern …' : isEdit ? 'Änderungen speichern' : 'Sitzungsnotiz speichern'}
        </button>
        <button onClick={onDone} disabled={save.isPending} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
        {save.isError && <span className="text-xs text-red-600">Speichern fehlgeschlagen.</span>}
      </div>
    </div>
  )
}

/** Inline-Verwaltung eigener Notiz-Vorlagen (eingebaute nur lesbar). */
function NoteTemplatesManager({ templates }: { templates: NoteTemplate[] }) {
  const qc = useQueryClient()
  const own = templates.filter(t => !t.builtin)
  const builtin = templates.filter(t => t.builtin)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [fields, setFields] = useState<string[]>([''])

  const reset = () => { setEditingId(null); setName(''); setFields(['']) }
  const startEdit = (t: NoteTemplate) => {
    setEditingId(t.id); setName(t.name); setFields(t.fields.length ? t.fields : [''])
  }

  const save = useMutation({
    mutationFn: () => {
      const data = { name: name.trim(), fields: fields.map(f => f.trim()).filter(Boolean) }
      return editingId
        ? professionalApi.noteTemplateUpdate(editingId, data)
        : professionalApi.noteTemplateCreate(data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prof-note-templates'] }); reset() },
  })
  const del = useMutation({
    mutationFn: (id: string) => professionalApi.noteTemplateDelete(id),
    onSuccess: (_d, id) => { qc.invalidateQueries({ queryKey: ['prof-note-templates'] }); if (editingId === id) reset() },
  })

  const canSave = !!name.trim() && fields.some(f => f.trim())

  return (
    <div className="mb-5 rounded-brand border border-brand-border bg-brand-bg p-4 space-y-4">
      <div>
        <div className="text-xs font-semibold text-navy uppercase tracking-wide mb-2">
          {editingId ? 'Vorlage bearbeiten' : 'Neue Notiz-Vorlage'}
        </div>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={160} placeholder="Name der Vorlage"
          className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        <div className="mt-2 space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={f} onChange={e => setFields(prev => prev.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Abschnitt ${i + 1}`}
                className="flex-1 rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
              {fields.length > 1 && (
                <button onClick={() => setFields(prev => prev.filter((_, j) => j !== i))}
                  className="text-xs text-brand-muted hover:text-red-600">×</button>
              )}
            </div>
          ))}
          <button onClick={() => setFields(prev => [...prev, ''])} className="text-xs text-accent hover:underline">
            + Abschnitt
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => save.mutate()} disabled={!canSave || save.isPending}
            className="text-sm font-semibold px-3 py-1.5 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-50">
            {save.isPending ? 'Speichern …' : editingId ? 'Speichern' : 'Vorlage anlegen'}
          </button>
          {editingId && <button onClick={reset} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>}
        </div>
      </div>

      {own.length > 0 && (
        <div className="border-t border-brand-border pt-3">
          <div className="text-xs font-semibold text-navy mb-2">Eigene Vorlagen</div>
          <div className="space-y-1.5">
            {own.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-navy">{t.name}</span>
                  <span className="text-brand-muted"> · {t.fields.join(', ')}</span>
                </span>
                <span className="shrink-0 flex gap-3">
                  <button onClick={() => startEdit(t)} className="text-xs text-brand-muted hover:text-accent">Bearbeiten</button>
                  <button onClick={() => { if (window.confirm('Vorlage löschen?')) del.mutate(t.id) }}
                    className="text-xs text-brand-muted hover:text-red-600">Löschen</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-brand-border pt-3">
        <div className="text-xs font-semibold text-navy mb-1.5">Eingebaute Vorlagen</div>
        <div className="flex flex-wrap gap-1.5">
          {builtin.map(t => (
            <span key={t.id} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-brand-border text-brand-muted">
              {t.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
