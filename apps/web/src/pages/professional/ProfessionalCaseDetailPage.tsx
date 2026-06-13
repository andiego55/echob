/**
 * /professional/cases/:caseId — Fallansicht der Fachperson.
 * Zeigt NUR freigegebene Inhalte (Server liefert ein gefiltertes Bundle).
 * Bei Widerruf/keinem Zugriff antwortet der Server mit 404 → "Kein Zugriff".
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { Spinner } from '@/components/auth/ProfessionalRoute'
import { professionalApi } from '@/api/professional'
import {
  RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS, CONTACT_FREQUENCY_LABELS,
  SCALE_LABELS,
} from '@/types'
import type { ProfessionalNote, SharedCaseBundle, ScaleKey } from '@/types'

const TOPIC_LABELS: Record<string, string> = {
  topic_self: 'Über mich', topic_person: 'Über die Fallperson',
  topic_responsibility: 'Verantwortung', topic_guilt: 'Schuld',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function ProfessionalCaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const { data: bundle, isLoading, isError } = useQuery({
    queryKey: ['prof-case', caseId],
    queryFn: () => professionalApi.caseDetail(caseId!),
    retry: false,
    enabled: !!caseId,
  })
  const { data: glossary = [] } = useQuery({ queryKey: ['prof-glossary'], queryFn: professionalApi.glossary })

  if (isLoading) return <Spinner />

  if (isError || !bundle) {
    return (
      <ProfessionalShell>
        <div className="mx-auto max-w-[700px] px-6 py-16 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-lg font-semibold text-navy mb-2">Kein Zugriff</h1>
          <p className="text-sm text-brand-muted">
            Dieser Fall ist nicht (mehr) für dich freigegeben. Möglicherweise wurde die Freigabe widerrufen.
          </p>
          <Link to="/professional" className="mt-6 inline-block btn-primary !py-2 !px-5 !text-sm">Zum Postfach</Link>
        </div>
      </ProfessionalShell>
    )
  }

  const has = (t: SharedCaseBundle['allowed'][number]) => bundle.allowed.includes(t)

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <span className="label">{bundle.client_display_name}</span>
            <h1 className="mt-1 text-2xl font-bold text-navy">{bundle.case_title}</h1>
            <p className="mt-1 text-xs text-brand-muted">Du siehst nur die freigegebenen Inhalte dieses Falls.</p>
          </div>
          <Link to={`/professional/cases/${caseId}/echo`} className="btn-primary !py-2 !px-5 !text-sm shrink-0">
            💬 Mit Echo über diesen Fall sprechen
          </Link>
        </div>

        {/* Glossar */}
        {glossary.length > 0 && (
          <div className="mb-6 rounded-brand border border-brand-border bg-white px-5 py-4">
            <p className="text-sm font-bold text-navy mb-1">Glossar</p>
            <p className="text-xs text-brand-muted mb-3">
              Begriff anklicken, um ihn mit Echo im Kontext dieses Falls zu besprechen.
            </p>
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
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Fallinformationen */}
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

          {/* Onboarding */}
          {has('onboarding') && bundle.onboarding && (
            <Section title="Onboarding-Informationen">
              <dl className="space-y-1.5 text-sm">
                {bundle.onboarding.person_name && <Row k="Fallperson (Pseudonym)" v={bundle.onboarding.person_name} />}
                {bundle.onboarding.relationship_description && <Row k="Beziehungsbeschreibung" v={bundle.onboarding.relationship_description} />}
                {bundle.onboarding.typical_scenes && <Row k="Typische Szenen" v={bundle.onboarding.typical_scenes} />}
                {bundle.onboarding.main_burden && <Row k="Hauptbelastung" v={bundle.onboarding.main_burden} />}
                {bundle.onboarding.significant_event && <Row k="Prägendes Ereignis" v={bundle.onboarding.significant_event} />}
                {typeof bundle.onboarding.distress_score === 'number' && <Row k="Belastungswert" v={`${bundle.onboarding.distress_score}/10`} />}
              </dl>
            </Section>
          )}

          {/* Skalen */}
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

          {/* Themendialog-Zusammenfassungen */}
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

          {/* Profile (Hinweis – Detail fließt in Echo) */}
          {has('person_profile') && bundle.person_profile && (
            <Section title="Fragebogen zur Fallperson">
              <p className="text-xs text-brand-muted">Freigegeben. Die Einschätzung fließt in den Echo-Fallkontext ein.</p>
            </Section>
          )}
          {has('self_profile') && bundle.self_profile && (
            <Section title="Nutzerprofil / Selbstprofil">
              <p className="text-xs text-brand-muted">Freigegeben. Die Selbstbeschreibung fließt in den Echo-Fallkontext ein.</p>
            </Section>
          )}
        </div>

        {/* Szenen */}
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

        {/* Berichte */}
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

        {/* Notizen */}
        <div className="mt-4">
          <NotesEditor caseId={caseId!} initial={bundle.notes} />
        </div>

        {/* Gespeicherte Echo-Zusammenfassungen */}
        {bundle.echo_summaries.length > 0 && (
          <div className="mt-4">
            <Section title="Gespeicherte Echo-Zusammenfassungen">
              <div className="space-y-3">
                {bundle.echo_summaries.map(s => (
                  <div key={s.id} className="rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
                    {s.title && <p className="text-sm font-semibold text-navy">{s.title}</p>}
                    <p className="text-sm text-brand-muted whitespace-pre-wrap">{s.summary_text}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </ProfessionalShell>
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
