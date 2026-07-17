/**
 * /institute/modules — Lernmodule erstellen & verwalten.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'

const STATUS_LABEL: Record<string, string> = { draft: 'Entwurf', published: 'Veröffentlicht', archived: 'Archiviert' }

export default function InstituteModulesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { data: items = [], isLoading } = useQuery({ queryKey: ['institute-modules'], queryFn: () => instituteApi.modules() })
  const create = useMutation({
    mutationFn: () => instituteApi.moduleCreate({ title: title.trim(), description: description.trim() || null }),
    onSuccess: (m) => { qc.invalidateQueries({ queryKey: ['institute-modules'] }); navigate(`/institute/modules/${m.id}`) },
  })
  const del = useMutation({
    mutationFn: (id: string) => instituteApi.moduleDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-modules'] }),
  })

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-navy">Lernmodule</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-muted">
              Strukturierte Lerneinheiten aus Lektionen und didaktischem Leitfaden. Fundament für verkaufbare Module –
              zuweisbar an deine Studierenden, mit Fortschritts-Anzeige.
            </p>
          </div>
          {!creating && <button onClick={() => setCreating(true)} className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0">+ Neues Modul</button>}
        </header>

        {creating && (
          <div className="card space-y-3">
            <h2 className="text-sm font-bold text-navy">Neues Modul</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-text">Titel</label>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="z. B. Erstgespräch führen"
                className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-text">Kurzbeschreibung (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
            <div className="flex items-center gap-3 border-t border-brand-border pt-3">
              <button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending} className="btn-primary !py-2 !px-4 !text-sm">
                {create.isPending ? 'Anlegen …' : 'Anlegen & bearbeiten'}
              </button>
              <button onClick={() => setCreating(false)} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : items.length === 0 && !creating ? (
          <div className="card text-sm text-brand-muted">Noch kein Modul angelegt.</div>
        ) : (
          <div className="space-y-2">
            {items.map(m => (
              <button key={m.id} onClick={() => navigate(`/institute/modules/${m.id}`)}
                className="card w-full text-left hover:border-accent/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-navy">{m.title}</p>
                      {m.status !== 'published' && <span className="text-[11px] text-brand-muted">({STATUS_LABEL[m.status]})</span>}
                      {m.sellable && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">verkaufbar</span>}
                    </div>
                    <p className="mt-1 text-xs text-brand-muted">{m.step_count ?? 0} Lektionen · {m.enrolled_count ?? 0} eingeschrieben</p>
                  </div>
                  <span role="button" tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); if (window.confirm('Modul löschen? Einschreibungen und Fortschritt gehen verloren.')) del.mutate(m.id) }}
                    className="shrink-0 text-xs text-brand-muted transition-colors hover:text-red-600">Löschen</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </InstituteShell>
  )
}
