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
import { instituteApi } from '@/api/institute'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS } from '@/types'
import type { ExampleCasePart, ExampleScene } from '@/types'

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

        <CasePartView part={data.primary} heading="Fallperson" />
        {data.partner && <CasePartView part={data.partner} heading="Partnerperson (Paar-Analyse)" />}
      </div>
    </InstituteShell>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="text-sm leading-relaxed text-brand-text">{value}</p>
    </div>
  )
}
