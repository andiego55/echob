/**
 * /institute/assignments — Aufgaben erstellen & verwalten (Aufgabe/Reflexion/Ressource).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import type { AssignmentKind, AssignmentInput } from '@/types'

export const KIND_LABEL: Record<AssignmentKind, string> = { task: 'Aufgabe', reflection: 'Reflexion', resource: 'Ressource' }
const KIND_HINT: Record<AssignmentKind, string> = {
  task: 'Arbeitsauftrag mit Textantwort',
  reflection: 'Reflexionsfrage zum Nachdenken (Textantwort)',
  resource: 'Lesestoff/Link ohne Antwort',
}

export function KindBadge({ kind }: { kind: AssignmentKind }) {
  const cls: Record<AssignmentKind, string> = {
    task: 'bg-accent/10 text-accent',
    reflection: 'bg-violet-100 text-violet-700',
    resource: 'bg-slate-100 text-slate-600',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls[kind]}`}>{KIND_LABEL[kind]}</span>
}

export default function InstituteAssignmentsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)

  const { data: items = [], isLoading } = useQuery({ queryKey: ['institute-assignments'], queryFn: () => instituteApi.assignments() })
  const del = useMutation({
    mutationFn: (id: string) => instituteApi.assignmentDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institute-assignments'] }),
  })

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-navy">Aufgaben</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-muted">
              Weise Studierenden Aufgaben, Reflexionen und Ressourcen zu – nicht nur Fälle. Eingereichte Antworten
              kannst du mit Rückmeldung versehen.
            </p>
          </div>
          {!creating && <button onClick={() => setCreating(true)} className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0">+ Neue Aufgabe</button>}
        </header>

        {creating && <CreateForm onDone={(id) => { setCreating(false); if (id) navigate(`/institute/assignments/${id}`) }} />}

        {isLoading ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : items.length === 0 && !creating ? (
          <div className="card text-sm text-brand-muted">Noch keine Aufgabe angelegt.</div>
        ) : (
          <div className="space-y-2">
            {items.map(a => (
              <button key={a.id} onClick={() => navigate(`/institute/assignments/${a.id}`)}
                className="card w-full text-left hover:border-accent/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <KindBadge kind={a.kind} />
                      {a.status !== 'published' && <span className="text-[11px] text-brand-muted">({a.status})</span>}
                      <p className="truncate text-sm font-semibold text-navy">{a.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-brand-muted">
                      {a.assigned_count ?? 0} zugewiesen · {a.submitted_count ?? 0} eingereicht
                    </p>
                  </div>
                  <span
                    role="button" tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); if (window.confirm('Diese Aufgabe löschen? Alle Zuweisungen gehen verloren.')) del.mutate(a.id) }}
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

function CreateForm({ onDone }: { onDone: (id?: string) => void }) {
  const qc = useQueryClient()
  const [kind, setKind] = useState<AssignmentKind>('task')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [link, setLink] = useState('')
  const [due, setDue] = useState('')

  const create = useMutation({
    mutationFn: () => {
      const data: AssignmentInput = {
        kind, title: title.trim(), instructions: instructions.trim() || null,
        link: kind === 'resource' ? (link.trim() || null) : null, due_on: due || null,
      }
      return instituteApi.assignmentCreate(data)
    },
    onSuccess: (a) => { qc.invalidateQueries({ queryKey: ['institute-assignments'] }); onDone(a.id) },
  })

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-bold text-navy">Neue Aufgabe</h2>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-brand-text">Typ</label>
        <div className="flex flex-wrap gap-2">
          {(['task', 'reflection', 'resource'] as AssignmentKind[]).map(k => (
            <button key={k} onClick={() => setKind(k)}
              className={`rounded-brand border px-3 py-1.5 text-left text-xs transition-colors ${kind === k ? 'border-accent bg-accent/5' : 'border-brand-border hover:border-accent/50'}`}>
              <span className="block text-sm font-semibold text-navy">{KIND_LABEL[k]}</span>
              <span className="text-[11px] text-brand-muted">{KIND_HINT[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">Titel</label>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="z. B. Beobachtung vs. Interpretation üben"
          className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">{kind === 'resource' ? 'Beschreibung' : 'Aufgabenstellung'}</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} placeholder={kind === 'reflection' ? 'Worüber sollen die Studierenden reflektieren?' : 'Was ist zu tun?'}
          className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>
      {kind === 'resource' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-text">Link (optional)</label>
          <input value={link} onChange={e => setLink(e.target.value)} maxLength={1000} placeholder="https://…"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">Frist (optional)</label>
        <input type="date" value={due} onChange={e => setDue(e.target.value)}
          className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div className="flex items-center gap-3 border-t border-brand-border pt-3">
        <button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending} className="btn-primary !py-2 !px-4 !text-sm">
          {create.isPending ? 'Anlegen …' : 'Anlegen & zuweisen'}
        </button>
        <button onClick={() => onDone()} disabled={create.isPending} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
        {create.isError && <span className="text-xs text-red-600">Anlegen fehlgeschlagen.</span>}
      </div>
    </div>
  )
}
