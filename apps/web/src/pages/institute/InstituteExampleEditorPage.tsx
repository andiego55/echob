/**
 * /institute/examples/:id — Vorschau + Ablage eines generierten Beispielfalls.
 * Zeigt Onboarding + Szenen (primär + optional Partnerperson), Titel bearbeiten,
 * veröffentlichen/zurückziehen, löschen. (Inline-Editieren der Elemente: nächster Schritt.)
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { Spinner } from '@/components/auth/InstituteRoute'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { instituteApi } from '@/api/institute'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS } from '@/types'
import type { ExampleCasePart, ExampleScene, ProfileModules, DidacticsResult } from '@/types'

const relTypeLabel = (v: string) => (RELATIONSHIP_TYPE_LABELS as Record<string, string>)[v] ?? v
const relStatusLabel = (v: string) => (RELATIONSHIP_STATUS_LABELS as Record<string, string>)[v] ?? v

export default function InstituteExampleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['institute-example', id],
    queryFn: () => instituteApi.getExample(id!),
    enabled: !!id,
  })

  const [title, setTitle] = useState('')
  useEffect(() => { if (data) setTitle(data.title) }, [data])

  const patch = useMutation({
    mutationFn: (payload: { title?: string; status?: string }) => instituteApi.patchExample(id!, payload),
    onSuccess: (d) => {
      qc.setQueryData(['institute-example', id], d)
      qc.invalidateQueries({ queryKey: ['institute-examples'] })
    },
  })
  const remove = useMutation({
    mutationFn: () => instituteApi.deleteExample(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institute-examples'] })
      navigate('/institute/dashboard', { replace: true })
    },
  })

  if (isLoading) return <Spinner />
  if (isError || !data) {
    return (
      <InstituteShell>
        <div className="mx-auto max-w-[760px] px-6 py-10">
          <Link to="/institute/dashboard" className="text-sm text-brand-muted no-underline hover:text-navy">← Zurück</Link>
          <p className="mt-6 text-sm text-red-600">Beispiel nicht gefunden.</p>
        </div>
      </InstituteShell>
    )
  }

  const published = data.status === 'published'
  const titleChanged = title.trim() && title.trim() !== data.title

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/institute/dashboard" className="text-sm text-brand-muted no-underline hover:text-navy">
            ← Zurück zum Dashboard
          </Link>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
            published ? 'bg-green-100 text-green-700' : 'bg-brand-border/40 text-brand-muted'
          }`}>
            {published ? 'Veröffentlicht' : 'Entwurf'}
          </span>
        </div>

        {/* Titel + Aktionen */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-brand-muted">Titel des Beispiels</label>
            <div className="flex items-center gap-2">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2 text-lg font-bold text-navy outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              {titleChanged && (
                <button
                  onClick={() => patch.mutate({ title: title.trim() })}
                  disabled={patch.isPending}
                  className="btn-primary !py-2 !px-4 !text-sm whitespace-nowrap"
                >
                  Speichern
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => patch.mutate({ status: published ? 'draft' : 'published' })}
              disabled={patch.isPending}
              className={published
                ? 'btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-sm'
                : 'btn-primary !py-2 !px-4 !text-sm'}
            >
              {published ? 'Zurückziehen' : 'Veröffentlichen'}
            </button>
            <button
              onClick={() => { if (window.confirm('Beispiel und zugehörige Fälle löschen?')) remove.mutate() }}
              disabled={remove.isPending}
              className="text-xs text-brand-muted/70 hover:text-red-500 transition-colors"
            >
              Löschen
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-brand-muted">
          Prüfen Sie den generierten Fall. Über <strong className="text-navy">Veröffentlichen</strong> wird er
          für die Freigabe an Studierende vorbereitet. Das Bearbeiten einzelner Szenen folgt in Kürze.
        </p>

        {published && <AssignPanel exampleId={data.id} />}

        <DidacticsPanel exampleId={data.id} />

        <MasterSolutionPanel exampleId={data.id} initial={data.master_solution} />

        <CasePartView part={data.primary} heading="Fallperson" />
        {data.partner && <CasePartView part={data.partner} heading="Partnerperson (Paar-Analyse)" />}
      </div>
    </InstituteShell>
  )
}

function AssignPanel({ exampleId }: { exampleId: string }) {
  const qc = useQueryClient()
  const { data: studentsData } = useQuery({ queryKey: ['institute-students'], queryFn: instituteApi.listStudents })
  const { data: assignData } = useQuery({
    queryKey: ['example-assignments', exampleId],
    queryFn: () => instituteApi.exampleAssignments(exampleId),
  })
  const assign = useMutation({
    mutationFn: (studentId: string) => instituteApi.assignExample(exampleId, [studentId]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['example-assignments', exampleId] }),
  })

  const students = studentsData?.students ?? []
  const assigned = new Set(assignData?.student_ids ?? [])

  return (
    <div className="card mt-6">
      <p className="text-sm font-semibold text-navy">An Studierende freigeben</p>
      <p className="mt-1 text-xs text-brand-muted">
        Jede Freigabe erzeugt für die/den Studierende:n eine eigene Arbeitskopie (Klon inkl. Profile).
      </p>
      {students.length === 0 ? (
        <p className="mt-3 text-sm text-brand-muted">
          Noch keine Studierenden. <Link to="/institute/students" className="text-accent hover:underline">Einladen →</Link>
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {students.map(s => {
            const has = assigned.has(s.id)
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-brand border border-brand-border bg-white px-4 py-2">
                <span className="text-sm text-navy">{s.display_name || 'Studierende:r'}</span>
                {has ? (
                  <span className="text-xs font-semibold text-green-600">✓ Freigegeben</span>
                ) : (
                  <button
                    onClick={() => assign.mutate(s.id)}
                    disabled={assign.isPending}
                    className="text-xs font-semibold text-accent hover:text-navy transition-colors disabled:opacity-40"
                  >
                    Freigeben
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DidacticsPanel({ exampleId }: { exampleId: string }) {
  const qc = useQueryClient()
  const [result, setResult] = useState<DidacticsResult | null>(null)
  const gen = useMutation({
    mutationFn: () => instituteApi.exampleDidactics(exampleId),
    onSuccess: (r) => setResult(r),
  })
  const createTask = useMutation({
    mutationFn: (t: DidacticsResult['tasks'][number]) => instituteApi.assignmentCreate({ kind: t.kind, title: t.title, instructions: t.instructions }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-assignments'] }),
  })
  const createRubric = useMutation({
    mutationFn: (r: DidacticsResult['rubric']) => instituteApi.rubricCreate({ name: r.name, criteria: r.criteria.map((c, i) => ({ key: `k${i}`, name: c.name, description: c.description, max_points: c.max_points })) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-rubrics'] }),
  })

  return (
    <section className="card mt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy">Didaktik-Assistent</h2>
          <p className="mt-0.5 text-xs text-brand-muted">Leitfaden, Aufgaben und ein Bewertungsraster aus diesem Fall – als KI-Vorschlag, den du übernehmen kannst.</p>
        </div>
        <button onClick={() => gen.mutate()} disabled={gen.isPending} className="btn-primary !py-1.5 !px-4 !text-sm shrink-0">
          {gen.isPending ? 'Erstellt …' : result ? 'Neu vorschlagen' : '✨ Vorschläge erstellen'}
        </button>
      </div>
      {gen.isError && <p className="mt-2 text-xs text-red-600">Konnte nicht erstellen. Bitte erneut versuchen.</p>}

      {result && (
        <div className="mt-4 space-y-5">
          {result.guide && (
            <div>
              <p className="label mb-1">Didaktischer Leitfaden</p>
              <div className="rounded-brand border border-brand-border bg-brand-bg px-4 py-3 text-sm leading-relaxed text-brand-text">
                <MarkdownMessage content={result.guide} />
              </div>
            </div>
          )}
          {result.tasks.length > 0 && (
            <div>
              <p className="label mb-1">Aufgabenvorschläge</p>
              <div className="space-y-2">
                {result.tasks.map((t, i) => (
                  <div key={i} className="rounded-brand border border-brand-border px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy">{t.title}</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-brand-muted">{t.instructions}</p>
                      </div>
                      <button onClick={() => createTask.mutate(t)} disabled={createTask.isPending}
                        className="shrink-0 rounded-brand border border-accent bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-40">
                        Als Aufgabe anlegen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.rubric.criteria.length > 0 && (
            <div>
              <p className="label mb-1">Bewertungsraster · {result.rubric.name}</p>
              <div className="rounded-brand border border-brand-border px-3 py-2.5">
                <div className="space-y-1">
                  {result.rubric.criteria.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-navy">{c.name}</span>
                      <span className="shrink-0 text-xs text-brand-muted tabular-nums">max. {c.max_points}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => createRubric.mutate(result.rubric)} disabled={createRubric.isPending}
                  className="mt-2 rounded-brand border border-accent bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-40">
                  Als Raster anlegen
                </button>
              </div>
            </div>
          )}
          {(createTask.isSuccess || createRubric.isSuccess) && (
            <p className="text-xs font-medium text-green-600">✓ Angelegt – zu finden unter „Aufgaben" bzw. „Bewertungsraster".</p>
          )}
        </div>
      )}
    </section>
  )
}

function MasterSolutionPanel({ exampleId, initial }: { exampleId: string; initial: string | null }) {
  const qc = useQueryClient()
  const [text, setText] = useState(initial ?? '')
  const [savedOk, setSavedOk] = useState(false)
  useEffect(() => { setText(initial ?? '') }, [initial])

  const save = useMutation({
    mutationFn: () => instituteApi.patchExample(exampleId, { master_solution: text }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institute-example', exampleId] }); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000) },
  })
  const draft = useMutation({
    mutationFn: () => instituteApi.exampleMasterSolutionDraft(exampleId),
    onSuccess: (r) => { setText(r.master_solution); setSavedOk(false) },
  })

  return (
    <section className="card mt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy">Musterlösung · Experten-Blick</h2>
          <p className="mt-0.5 text-xs text-brand-muted">Nur für dich sichtbar. Dient der KI-Auswertung von Einreichungen als Vergleichsmaßstab.</p>
        </div>
        <button onClick={() => draft.mutate()} disabled={draft.isPending}
          className="btn shrink-0 border-2 border-brand-border bg-white text-navy hover:border-navy/30 !py-1.5 !px-3 !text-xs">
          {draft.isPending ? 'Entwurf …' : '✨ KI-Entwurf'}
        </button>
      </div>
      {draft.isError && <p className="mt-2 text-xs text-red-600">Entwurf fehlgeschlagen.</p>}
      <textarea value={text} onChange={e => { setText(e.target.value); setSavedOk(false) }} rows={8}
        placeholder="Experten-Einschätzung: Fallverständnis, Arbeitshypothesen, blinde Flecken, Vorgehen im Erstgespräch …"
        className="mt-3 w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary !py-1.5 !px-4 !text-sm">
          {save.isPending ? 'Speichern …' : savedOk ? '✓ Gespeichert' : 'Musterlösung speichern'}
        </button>
      </div>
    </section>
  )
}

function CasePartView({ part, heading }: { part: ExampleCasePart | null; heading: string }) {
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

      {/* Onboarding */}
      <div className="card space-y-3">
        {part.main_concern && (
          <Field label="Anliegen" value={part.main_concern} />
        )}
        {ob?.relationship_description && <Field label="Verlauf" value={ob.relationship_description} />}
        {ob?.main_burden && <Field label="Zentrale Belastung" value={ob.main_burden} />}
        {ob?.typical_scenes && <Field label="Wiederkehrendes Muster" value={ob.typical_scenes} />}
        {ob?.significant_event && <Field label="Prägendes Ereignis" value={ob.significant_event} />}
        {ob?.pattern_hypotheses && ob.pattern_hypotheses.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">Muster-Hypothesen</p>
            <div className="flex flex-wrap gap-2">
              {ob.pattern_hypotheses.map((h, i) => (
                <span key={i} className="rounded-full border border-brand-border bg-brand-bg px-3 py-1 text-xs text-brand-text">
                  {h.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {part.self_profile && <ProfileView title="Selbstauskunft (Selbstbild)" profile={part.self_profile} />}
      {part.person_profile && <ProfileView title="Einschätzung der anderen Person" profile={part.person_profile} />}

      {/* Szenen */}
      <p className="mt-5 mb-3 text-sm font-semibold text-navy">{part.scenes.length} Szenen</p>
      <div className="space-y-3">
        {part.scenes.map(s => <SceneCard key={s.id} scene={s} />)}
      </div>
    </section>
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
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
              Belastung {s.distress_score}
            </span>
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
        {texts.map((t, i) => (
          <p key={i} className="text-sm italic leading-relaxed text-brand-muted">{t}</p>
        ))}
      </div>
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
