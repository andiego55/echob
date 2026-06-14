/**
 * /app/cases/:caseId/export — Druckbare Fall-Zusammenfassung
 *
 * Therapie-Brücke: ein vollständiger, druckbarer Auszug (Szenen, Skalen, Profile,
 * Onboarding) zum Mitnehmen zu Fachpersonen, die nicht im Portal registriert sind.
 * Reines Frontend: Browser-Druck (window.print) + Tailwind print:-Varianten,
 * keine Server-PDF-Erzeugung nötig.
 */
import { type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { casesApi } from '@/api/cases'
import { scenesApi } from '@/api/scenes'
import { onboardingApi } from '@/api/onboarding'
import { profileApi } from '@/api/profile'
import { personProfileApi } from '@/api/personProfile'
import { topicSummariesApi } from '@/api/topicSummaries'
import {
  RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS, CONTACT_FREQUENCY_LABELS, SCALE_LABELS,
} from '@/types'
import type { ScalesOverview } from '@/types'

export default function PrintSummaryPage() {
  const { caseId } = useParams<{ caseId: string }>()

  const { data: caseData } = useQuery({ queryKey: ['case', caseId], queryFn: () => casesApi.get(caseId!), enabled: !!caseId, retry: false })
  const { data: scenesData } = useQuery({ queryKey: ['scenes', caseId], queryFn: () => scenesApi.list(caseId!), enabled: !!caseId, retry: false })
  const { data: onboarding } = useQuery({ queryKey: ['onboarding', caseId], queryFn: () => onboardingApi.get(caseId!), enabled: !!caseId, retry: false })
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => profileApi.get(), retry: false })
  const { data: personProfile } = useQuery({ queryKey: ['person-profile', caseId], queryFn: () => personProfileApi.get(caseId!), enabled: !!caseId, retry: false })
  const { data: topicSummaries } = useQuery({ queryKey: ['topic-summaries', caseId], queryFn: () => topicSummariesApi.list(caseId!), enabled: !!caseId, retry: false })
  const { data: scales } = useQuery({
    queryKey: ['scales', caseId],
    queryFn: () => apiClient.get<ScalesOverview>(`/cases/${caseId}/scales`).then(r => r.data),
    enabled: !!caseId, retry: false,
  })

  const scenes = (scenesData?.scenes ?? []).filter(s => s.confirmed_by_user)
    .sort((a, b) => (a.scene_date ?? '').localeCompare(b.scene_date ?? ''))
  const relevantScales = (scales?.scores ?? []).filter(s => s.score > 0).sort((a, b) => b.score - a.score)
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  const personName = onboarding?.person_name || 'die andere Person'

  return (
    <div className="min-h-screen bg-brand-bg print:bg-white">
      {/* Werkzeugleiste – nicht im Druck */}
      <div className="print:hidden sticky top-0 z-10 border-b border-brand-border bg-white">
        <div className="mx-auto max-w-[820px] px-6 py-3 flex items-center justify-between gap-4">
          <Link to={`/app/cases/${caseId}`} className="text-sm text-brand-muted hover:text-navy transition-colors">← Zurück zum Fall</Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-brand-muted">Im Druck-Dialog „Als PDF speichern" wählen</span>
            <button onClick={() => window.print()} className="btn-primary !py-2 !px-4 !text-sm">Drucken / Als PDF speichern</button>
          </div>
        </div>
      </div>

      {/* Dokument */}
      <div className="mx-auto max-w-[820px] bg-white shadow-sm rounded-brand my-6 p-8 sm:p-10 text-brand-text leading-relaxed
                      print:my-0 print:max-w-none print:rounded-none print:shadow-none print:p-0">
        <header className="border-b border-brand-border pb-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">EchoB · Fall-Zusammenfassung</p>
          <h1 className="text-2xl font-bold text-navy mt-1">
            {caseData ? RELATIONSHIP_TYPE_LABELS[caseData.relationship_type] : 'Fall'}
          </h1>
          <p className="text-sm text-brand-muted mt-1">Erstellt am {today}{profile?.display_name ? ` · ${profile.display_name}` : ''}</p>
        </header>

        <p className="text-xs text-brand-muted bg-brand-bg border border-brand-border rounded-brand px-4 py-3 mb-7 print:bg-transparent">
          Diese Zusammenfassung beruht auf den Selbstauskünften der nutzenden Person und dient der
          Orientierung. Sie enthält <strong>keine Diagnose</strong> und ersetzt keine professionelle
          Beurteilung. Beschreibungen der anderen Person sind subjektive Wahrnehmungen.
        </p>

        {/* Überblick */}
        {caseData && (
          <Section title="Überblick">
            <Field label="Beziehungstyp" value={RELATIONSHIP_TYPE_LABELS[caseData.relationship_type]} />
            <Field label="Status" value={RELATIONSHIP_STATUS_LABELS[caseData.relationship_status]} />
            <Field label="Kontaktfrequenz" value={CONTACT_FREQUENCY_LABELS[caseData.contact_frequency]} />
            {onboarding?.person_name && <Field label="Bezeichnung der Person (Pseudonym)" value={onboarding.person_name} />}
            {caseData.main_concern && <Field label="Hauptanliegen" value={caseData.main_concern} />}
          </Section>
        )}

        {/* Ausgangslage (Onboarding) */}
        {onboarding && (onboarding.relationship_description || onboarding.main_burden || onboarding.typical_scenes || onboarding.significant_event) && (
          <Section title="Ausgangslage">
            <Para label="Beschreibung der Beziehung" value={onboarding.relationship_description} />
            <Para label="Hauptbelastung" value={onboarding.main_burden} />
            <Para label="Typische Szenen" value={onboarding.typical_scenes} />
            <Para label="Prägendes Ereignis" value={onboarding.significant_event} />
            {onboarding.distress_score != null && <Field label="Belastung (Onboarding)" value={`${onboarding.distress_score} / 10`} />}
          </Section>
        )}

        {/* Selbstbeschreibung */}
        {profile?.summary_text && (
          <Section title="Selbstbeschreibung der nutzenden Person">
            <p className="whitespace-pre-wrap text-sm">{profile.summary_text}</p>
          </Section>
        )}

        {/* Eindruck zur anderen Person */}
        {personProfile?.summary_text && (
          <Section title={`Wahrgenommener Eindruck zu ${personName}`}>
            <p className="whitespace-pre-wrap text-sm">{personProfile.summary_text}</p>
          </Section>
        )}

        {/* Themen-Zusammenfassungen */}
        {topicSummaries && topicSummaries.length > 0 && (
          <Section title="Reflexion zu Themen">
            <div className="space-y-3">
              {topicSummaries.map(t => (
                <div key={t.id}>
                  <p className="text-sm font-semibold text-navy">{t.topic_label}</p>
                  <p className="text-sm whitespace-pre-wrap">{t.summary_text}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Muster / Skalen */}
        {relevantScales.length > 0 && (
          <Section title="Eingeschätzte Muster (Skalen)">
            <p className="text-xs text-brand-muted mb-2">Skala 0–5, aus den dokumentierten Szenen geschätzt. Konfidenz in Klammern.</p>
            <div className="space-y-1.5">
              {relevantScales.map(s => (
                <div key={s.scale_key} className="flex items-center gap-3 text-sm">
                  <span className="w-52 flex-shrink-0">{SCALE_LABELS[s.scale_key] ?? s.label ?? s.scale_key}</span>
                  <span className="flex-1 h-2 rounded-full border border-brand-border overflow-hidden">
                    <span className="block h-full bg-accent print:bg-navy" style={{ width: `${(s.score / 5) * 100}%` }} />
                  </span>
                  <span className="w-24 flex-shrink-0 text-right text-brand-muted tabular-nums">
                    {s.score.toFixed(1)}/5 ({confidenceLabel(s.confidence)})
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Szenen */}
        <Section title={`Dokumentierte Szenen (${scenes.length})`}>
          {scenes.length === 0 ? (
            <p className="text-sm text-brand-muted">Noch keine bestätigten Szenen.</p>
          ) : (
            <div className="space-y-4">
              {scenes.map((s, i) => (
                <div key={s.id} className="break-inside-avoid border-l-2 border-brand-border pl-4">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-navy">{i + 1}. {s.title}</p>
                    <span className="text-xs text-brand-muted">
                      {s.scene_date ? new Date(s.scene_date).toLocaleDateString('de-DE') : 'ohne Datum'}
                      {s.distress_score ? ` · Belastung ${s.distress_score}/5` : ''}
                    </span>
                  </div>
                  {s.pattern_tags.length > 0 && (
                    <p className="text-xs text-brand-muted mt-0.5">Muster: {s.pattern_tags.join(', ')}</p>
                  )}
                  {s.description && <p className="text-sm mt-1 whitespace-pre-wrap">{s.description}</p>}
                  {s.user_reaction && <p className="text-sm mt-1 whitespace-pre-wrap"><span className="text-brand-muted">Eigene Reaktion: </span>{s.user_reaction}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <footer className="mt-8 pt-4 border-t border-brand-border text-xs text-brand-muted">
          Erstellt mit EchoB am {today}. Reflexionsmaterial, keine Diagnose. Bei akuter Gefahr: Notruf 110 / 112.
        </footer>
      </div>
    </div>
  )
}

// ── Hilfs-Komponenten ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7 break-inside-avoid">
      <h2 className="text-sm font-bold uppercase tracking-wide text-accent border-b border-brand-border pb-1 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm py-0.5">
      <span className="w-52 flex-shrink-0 text-brand-muted">{label}</span>
      <span className="flex-1 text-brand-text">{value}</span>
    </div>
  )
}

function Para({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="mb-2.5">
      <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function confidenceLabel(c: string): string {
  return c === 'high' ? 'hoch' : c === 'medium' ? 'mittel' : 'gering'
}
