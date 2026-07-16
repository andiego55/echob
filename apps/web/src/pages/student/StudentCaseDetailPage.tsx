/**
 * /student/cases/:id — Fallansicht der/des Studierenden (eigene Arbeitskopie).
 * Layout wie die Fachpersonen-Fallübersicht; bei Partnerfall ein Toggle A/B.
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import { Spinner } from '@/components/auth/StudentRoute'
import { studentApi } from '@/api/student'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS, CONTACT_FREQUENCY_LABELS } from '@/types'
import type { ExampleCasePart, ExampleScene, ProfileModules } from '@/types'

const relTypeLabel = (v: string) => (RELATIONSHIP_TYPE_LABELS as Record<string, string>)[v] ?? v
const relStatusLabel = (v: string) => (RELATIONSHIP_STATUS_LABELS as Record<string, string>)[v] ?? v
const contactLabel = (v: string) => (CONTACT_FREQUENCY_LABELS as Record<string, string>)[v] ?? v

const SCORE_LABELS: Record<string, string> = {
  distress_index: 'Belastungsgrad',
  attachment_anxiety_score: 'Verlustangst / Nähebedürfnis',
  attachment_avoidance_score: 'Rückzug / Distanzschutz',
  attachment_ambivalence_score: 'Ambivalenz',
  emotional_overwhelm_score: 'Emotionale Überwältigung',
  self_soothing_score: 'Selbstberuhigung',
  impulse_pressure_score: 'Impulsdruck',
  withdrawal_tendency_score: 'Rückzugstendenz',
  guilt_tendency_score: 'Schuld-/Verantwortungsdruck',
  shame_score: 'Scham / Selbstabwertung',
  self_worth_dependency_score: 'Abhängigkeit von Bestätigung',
  boundary_awareness_score: 'Grenzen wahrnehmen',
  boundary_communication_score: 'Grenzen kommunizieren',
  boundary_stability_score: 'Grenzen halten',
  autonomy_score: 'Autonomieerleben',
  perception_uncertainty_score: 'Wahrnehmungsverunsicherung',
  reality_check_need_score: 'Bedarf an Realitätsabgleich',
  observation_interpretation_clarity_score: 'Beobachtung vs. Interpretation',
  social_support_score: 'Soziale Unterstützung',
  self_stabilization_score: 'Selbststabilisierung',
  professional_support_access_score: 'Zugang zu Hilfe',
  emotional_volatility: 'Emotionale Volatilität',
  empathy_deficit: 'Empathie-Defizit',
  grandiosity: 'Grandiosität',
  manipulation_score: 'Manipulation',
  attachment_instability: 'Bindungsinstabilität',
  impulsivity_score: 'Impulsivität',
  relational_burden: 'Beziehungsbelastung',
}

export default function StudentCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [side, setSide] = useState<'primary' | 'partner'>('primary')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-case', id],
    queryFn: () => studentApi.caseDetail(id!),
    enabled: !!id,
  })

  if (isLoading) return <Spinner />

  const hasPartner = !!data?.partner
  const part = side === 'partner' && data?.partner ? data.partner : data?.primary

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[1000px] px-6 py-8">
        {isError || !data ? (
          <p className="text-sm text-red-600">Fall nicht gefunden.</p>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-navy">{data.title}</h1>
              <p className="mt-1 text-xs text-brand-muted">
                Fiktiver Übungsfall – deine Arbeitskopie. Keine echten Patient:innen.
              </p>
            </div>

            {hasPartner && (
              <div className="mb-6 inline-flex rounded-brand border border-brand-border bg-white p-0.5">
                {([
                  ['primary', data.primary?.person_name ?? 'Fallperson'],
                  ['partner', data.partner?.person_name ?? 'Partnerperson'],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setSide(k)}
                    className={`rounded-[6px] px-4 py-1.5 text-sm font-medium transition-colors ${
                      side === k ? 'bg-accent text-white' : 'text-brand-muted hover:text-navy'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {part && <CaseOverview part={part} />}
          </>
        )}
      </div>
    </StudentShell>
  )
}

function CaseOverview({ part }: { part: ExampleCasePart }) {
  const ob = part.onboarding
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Fallinformationen">
          <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
            {part.person_name && <Field label="Person (Pseudonym)"><InfoChip>{part.person_name}</InfoChip></Field>}
            <Field label="Beziehungstyp"><InfoChip>{relTypeLabel(part.relationship_type)}</InfoChip></Field>
            <Field label="Status"><InfoChip>{relStatusLabel(part.relationship_status)}</InfoChip></Field>
            <Field label="Kontaktfrequenz"><InfoChip>{contactLabel(part.contact_frequency)}</InfoChip></Field>
            {part.main_concern && <Field label="Hauptanliegen" wide>{part.main_concern}</Field>}
          </dl>
        </Section>

        {ob && (ob.relationship_description || ob.typical_scenes || ob.main_burden || ob.significant_event || ob.memorable_scenes) && (
          <Section title="Onboarding-Informationen">
            <dl className="grid grid-cols-1 gap-x-5 gap-y-3">
              {ob.relationship_description && <Field label="Beziehungsbeschreibung">{ob.relationship_description}</Field>}
              {ob.typical_scenes && <Field label="Typische Szenen">{ob.typical_scenes}</Field>}
              {ob.main_burden && <Field label="Hauptbelastung">{ob.main_burden}</Field>}
              {ob.significant_event && <Field label="Prägendes Ereignis">{ob.significant_event}</Field>}
              {ob.memorable_scenes && <Field label="Erinnerliche Szenen">{ob.memorable_scenes}</Field>}
            </dl>
          </Section>
        )}

        <ProfileSection title="Selbstauskunft (Selbstbild)" profile={part.self_profile} />
        <ProfileSection title="Einschätzung der anderen Person" profile={part.person_profile} />
      </div>

      <div className="mt-4">
        <Section title={`Szenen (${part.scenes.length})`}>
          {part.scenes.length === 0 ? (
            <p className="text-sm text-brand-muted">Keine Szenen erfasst.</p>
          ) : (
            <div className="space-y-2.5">
              {part.scenes.map(s => <SceneCard key={s.id} scene={s} />)}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function ProfileSection({ title, profile }: { title: string; profile: ProfileModules | null }) {
  if (!profile) return null
  const scores: { label: string; value: number }[] = []
  const texts: string[] = []
  let patterns: string[] = []
  for (const mod of Object.values(profile.modules || {})) {
    for (const [k, v] of Object.entries(mod || {})) {
      if (SCORE_LABELS[k] && typeof v === 'number') scores.push({ label: SCORE_LABELS[k], value: v })
      else if (k === 'free_text' && typeof v === 'string' && v.trim()) texts.push(v)
      else if (k === 'perceived_patterns' && Array.isArray(v)) patterns = v.filter(p => typeof p === 'string')
    }
  }
  if (scores.length === 0 && texts.length === 0 && patterns.length === 0) return null
  return (
    <Section title={title}>
      <div className="space-y-3">
        {scores.length > 0 && (
          <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
            {scores.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-xs text-brand-muted" title={s.label}>{s.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-border/50">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(s.value / 5) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-navy">{s.value}</span>
              </div>
            ))}
          </div>
        )}
        {patterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {patterns.map((p, i) => (
              <span key={i} className="rounded-full border border-brand-border bg-brand-bg px-2.5 py-0.5 text-xs text-brand-text">{p}</span>
            ))}
          </div>
        )}
        {texts.map((t, i) => <p key={i} className="text-sm italic leading-relaxed text-brand-muted">{t}</p>)}
      </div>
    </Section>
  )
}

function SceneCard({ scene: s }: { scene: ExampleScene }) {
  return (
    <div className="rounded-brand border border-brand-border bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-navy">{s.title ?? 'Szene'}</p>
        <div className="flex shrink-0 items-center gap-2">
          {s.scene_date && (
            <span className="text-[11px] text-brand-muted">
              {new Date(s.scene_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          {s.distress_score != null && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">Belastung {s.distress_score}</span>
          )}
        </div>
      </div>
      {s.description && <p className="mt-1.5 text-sm leading-relaxed text-brand-text whitespace-pre-wrap">{s.description}</p>}
      {s.user_reaction && <p className="mt-1.5 text-xs italic text-brand-muted">Reaktion: {s.user_reaction}</p>}
      {s.pattern_tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {s.pattern_tags.map((t, i) => (
            <span key={i} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="mb-3 text-sm font-bold text-navy">{title}</h2>
      {children}
    </div>
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
