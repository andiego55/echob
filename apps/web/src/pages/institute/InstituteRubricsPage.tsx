/**
 * /institute/rubrics — Bewertungsraster verwalten (Grundlage der KI-Auswertung).
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import type { Rubric, RubricInput } from '@/types'

type Crit = { name: string; description: string; max_points: number }

const PRESETS: { name: string; description: string; criteria: Crit[] }[] = [
  {
    name: 'Fall-Analyse',
    description: 'Grundbewertung einer schriftlichen Fallanalyse.',
    criteria: [
      { name: 'Beobachtung vs. Interpretation', description: 'Trennt Beschreibung sauber von Deutung.', max_points: 4 },
      { name: 'Hypothesenbildung', description: 'Tastende, begründete Arbeitshypothesen ohne vorschnelle Diagnose.', max_points: 4 },
      { name: 'Fallverständnis', description: 'Erfasst Dynamik, Muster und Kontext stimmig.', max_points: 4 },
      { name: 'Haltung & Sprache', description: 'Respektvoll, nicht wertend, fachlich angemessen.', max_points: 3 },
    ],
  },
  {
    name: 'Erstgespräch-Vorbereitung',
    description: 'Bewertung der Vorbereitung auf ein Erstgespräch.',
    criteria: [
      { name: 'Zielklärung', description: 'Anliegen und Auftrag klar erfasst.', max_points: 3 },
      { name: 'Fragenqualität', description: 'Offene, hypothesengeleitete Fragen.', max_points: 4 },
      { name: 'Beziehungsgestaltung', description: 'Plan für einen sicheren, tragfähigen Rahmen.', max_points: 3 },
      { name: 'Risikoblick', description: 'Mögliche Belastungen/Risiken mitgedacht.', max_points: 3 },
    ],
  },
]

const emptyCrit = (): Crit => ({ name: '', description: '', max_points: 3 })

export default function InstituteRubricsPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Rubric | 'new' | null>(null)

  const { data: rubrics = [], isLoading } = useQuery({ queryKey: ['institute-rubrics'], queryFn: () => instituteApi.rubrics() })
  const del = useMutation({
    mutationFn: (id: string) => instituteApi.rubricDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-rubrics'] }),
  })

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-navy">Bewertungsraster</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-muted">
              Wiederverwendbare Raster (Kriterien × Punkte). Sie sind die Grundlage, wenn du eine Einreichung bewertest –
              die KI kann daraus einen Bewertungsvorschlag erstellen.
            </p>
          </div>
          {!editing && (
            <button onClick={() => setEditing('new')} className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0">+ Neues Raster</button>
          )}
        </header>

        {editing && (
          <RubricForm
            rubric={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}

        {isLoading ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : rubrics.length === 0 && !editing ? (
          <div className="card text-sm text-brand-muted">Noch kein Raster angelegt.</div>
        ) : (
          <div className="space-y-2">
            {rubrics.map(r => {
              const max = r.criteria.reduce((a, c) => a + (c.max_points || 0), 0)
              return (
                <div key={r.id} className="card flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{r.name}</p>
                    <p className="mt-0.5 text-xs text-brand-muted">
                      {r.criteria.length} Kriterien · max. {max} Punkte
                      {r.description ? ` · ${r.description}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button onClick={() => setEditing(r)} className="text-xs text-brand-muted transition-colors hover:text-accent">Bearbeiten</button>
                    <button onClick={() => { if (window.confirm('Dieses Raster löschen?')) del.mutate(r.id) }}
                      className="text-xs text-brand-muted transition-colors hover:text-red-600">Löschen</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </InstituteShell>
  )
}

function RubricForm({ rubric, onDone }: { rubric: Rubric | null; onDone: () => void }) {
  const qc = useQueryClient()
  const isEdit = !!rubric
  const [name, setName] = useState(rubric?.name ?? '')
  const [description, setDescription] = useState(rubric?.description ?? '')
  const [criteria, setCriteria] = useState<Crit[]>(
    rubric?.criteria.map(c => ({ name: c.name, description: c.description ?? '', max_points: c.max_points })) ?? [emptyCrit()],
  )

  const applyPreset = (p: typeof PRESETS[number]) => {
    if (!name.trim()) setName(p.name)
    if (!description.trim()) setDescription(p.description)
    setCriteria(p.criteria.map(c => ({ ...c })))
  }
  const setCrit = (i: number, patch: Partial<Crit>) => setCriteria(prev => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  const save = useMutation({
    mutationFn: () => {
      const payload: RubricInput = {
        name: name.trim(),
        description: description.trim() || null,
        criteria: criteria
          .filter(c => c.name.trim())
          .map((c, i) => ({ key: `k${i}`, name: c.name.trim(), description: c.description.trim() || null, max_points: c.max_points })),
      }
      return isEdit ? instituteApi.rubricUpdate(rubric!.id, payload) : instituteApi.rubricCreate(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institute-rubrics'] }); onDone() },
  })

  const canSave = !!name.trim() && criteria.some(c => c.name.trim())
  const max = criteria.reduce((a, c) => a + (c.max_points || 0), 0)

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-navy">{isEdit ? 'Raster bearbeiten' : 'Neues Raster'}</h2>
        {!isEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-brand-muted">Vorlage:</span>
            {PRESETS.map(p => (
              <button key={p.name} onClick={() => applyPreset(p)}
                className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-navy transition-colors hover:border-accent hover:text-accent">
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-text">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={200} placeholder="z. B. Fall-Analyse"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-text">Kurzbeschreibung (optional)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} placeholder="Wofür ist dieses Raster gedacht?"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-navy">Kriterien</span>
          <span className="text-xs text-brand-muted">max. {max} Punkte</span>
        </div>
        <div className="space-y-2">
          {criteria.map((c, i) => (
            <div key={i} className="flex flex-wrap items-start gap-2 rounded-brand border border-brand-border p-3">
              <div className="min-w-[180px] flex-1 space-y-2">
                <input value={c.name} onChange={e => setCrit(i, { name: e.target.value })} placeholder="Kriterium (z. B. Hypothesenbildung)"
                  className="w-full rounded-brand border border-brand-border bg-white px-2.5 py-1.5 text-sm font-semibold text-navy outline-none focus:border-accent" />
                <input value={c.description} onChange={e => setCrit(i, { description: e.target.value })} placeholder="Worauf wird geachtet? (optional)"
                  className="w-full rounded-brand border border-brand-border bg-white px-2.5 py-1.5 text-xs text-brand-text outline-none focus:border-accent" />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-[11px] text-brand-muted">Max. Punkte</label>
                <input type="number" min={1} max={100} value={c.max_points}
                  onChange={e => setCrit(i, { max_points: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })}
                  className="w-full rounded-brand border border-brand-border bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-accent" />
              </div>
              {criteria.length > 1 && (
                <button onClick={() => setCriteria(prev => prev.filter((_, j) => j !== i))}
                  className="mt-6 text-xs text-brand-muted hover:text-red-600">Entfernen</button>
              )}
            </div>
          ))}
          <button onClick={() => setCriteria(prev => [...prev, emptyCrit()])} className="text-xs text-accent hover:underline">+ Kriterium hinzufügen</button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-brand-border pt-3">
        <button onClick={() => save.mutate()} disabled={!canSave || save.isPending} className="btn-primary !py-2 !px-4 !text-sm">
          {save.isPending ? 'Speichern …' : isEdit ? 'Änderungen speichern' : 'Raster anlegen'}
        </button>
        <button onClick={onDone} disabled={save.isPending} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
        {save.isError && <span className="text-xs text-red-600">Speichern fehlgeschlagen.</span>}
      </div>
    </div>
  )
}
