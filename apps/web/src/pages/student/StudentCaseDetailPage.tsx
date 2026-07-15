/**
 * /student/cases/:id — Fallansicht der/des Studierenden (eigene Arbeitskopie).
 * Onboarding + Szenen + Selbstbild + Fremdeinschätzung. Echo-Dialog folgt (P2c-2).
 */
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import { Spinner } from '@/components/auth/StudentRoute'
import { studentApi } from '@/api/student'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS } from '@/types'
import type { ExampleCasePart, ExampleScene, ProfileModules } from '@/types'

const relTypeLabel = (v: string) => (RELATIONSHIP_TYPE_LABELS as Record<string, string>)[v] ?? v
const relStatusLabel = (v: string) => (RELATIONSHIP_STATUS_LABELS as Record<string, string>)[v] ?? v

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
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-case', id],
    queryFn: () => studentApi.caseDetail(id!),
    enabled: !!id,
  })

  if (isLoading) return <Spinner />

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <Link to="/student/dashboard" className="text-sm text-brand-muted no-underline hover:text-navy">
          ← Zurück zum Dashboard
        </Link>
        {isError || !data ? (
          <p className="mt-6 text-sm text-red-600">Fall nicht gefunden.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-navy">{data.title}</h1>
              <button
                disabled
                title="Der Echo-Dialog wird gerade gebaut"
                className="btn bg-white text-navy border-2 border-brand-border !py-2 !px-4 !text-sm opacity-50 cursor-not-allowed"
              >
                Mit Echo besprechen (bald)
              </button>
            </div>
            <CasePart part={data.primary} heading="Fallperson" />
            {data.partner && <CasePart part={data.partner} heading="Partnerperson (Paar-Analyse)" />}
          </>
        )}
      </div>
    </StudentShell>
  )
}

function CasePart({ part, heading }: { part: ExampleCasePart | null; heading: string }) {
  if (!part) return null
  const ob = part.onboarding
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-accent">{heading}</h2>
        <span className="text-sm text-brand-muted">
          · {part.person_name ?? '—'} · {relTypeLabel(part.relationship_type)} · {relStatusLabel(part.relationship_status)}
        </span>
      </div>

      <div className="card space-y-3">
        {part.main_concern && <Field label="Anliegen" value={part.main_concern} />}
        {ob?.relationship_description && <Field label="Verlauf" value={ob.relationship_description} />}
        {ob?.main_burden && <Field label="Zentrale Belastung" value={ob.main_burden} />}
        {ob?.typical_scenes && <Field label="Wiederkehrendes Muster" value={ob.typical_scenes} />}
        {ob?.significant_event && <Field label="Prägendes Ereignis" value={ob.significant_event} />}
      </div>

      {part.self_profile && <ProfileView title="Selbstauskunft (Selbstbild)" profile={part.self_profile} />}
      {part.person_profile && <ProfileView title="Einschätzung der anderen Person" profile={part.person_profile} />}

      <p className="mt-5 mb-3 text-sm font-semibold text-navy">{part.scenes.length} Szenen</p>
      <div className="space-y-3">
        {part.scenes.map(s => <SceneCard key={s.id} scene={s} />)}
      </div>
    </section>
  )
}

function ProfileView({ title, profile }: { title: string; profile: ProfileModules }) {
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
    <div className="mt-5">
      <p className="mb-2 text-sm font-semibold text-navy">{title}</p>
      <div className="card space-y-3">
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
    </div>
  )
}

function SceneCard({ scene: s }: { scene: ExampleScene }) {
  return (
    <div className="rounded-brand border border-brand-border bg-white px-5 py-4">
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
      {s.description && <p className="mt-2 text-sm leading-relaxed text-brand-text">{s.description}</p>}
      {s.user_reaction && <p className="mt-1.5 text-sm italic leading-relaxed text-brand-muted">{s.user_reaction}</p>}
      {s.pattern_tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {s.pattern_tags.map((t, i) => (
            <span key={i} className="rounded-full bg-brand-bg px-2 py-0.5 text-[10px] text-brand-muted">{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="text-sm leading-relaxed text-brand-text">{value}</p>
    </div>
  )
}
