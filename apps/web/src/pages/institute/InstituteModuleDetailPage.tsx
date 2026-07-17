/**
 * /institute/modules/:id — Modul bearbeiten: Metadaten, Leitfaden, Lektionen, Einschreibung.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import type { LearningModuleDetail, ModuleStep, ModuleStepKind, ModuleStepInput, ExampleSummary, Assignment } from '@/types'

const STEP_KIND_LABEL: Record<ModuleStepKind, string> = { lesson: 'Lektion', case: 'Fall', assignment: 'Aufgabe' }
const STEP_KIND_CLS: Record<ModuleStepKind, string> = {
  lesson: 'bg-slate-100 text-slate-600', case: 'bg-accent/10 text-accent', assignment: 'bg-violet-100 text-violet-700',
}

export default function InstituteModuleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['institute-module', id], queryFn: () => instituteApi.module(id!), enabled: !!id })
  const { data: studentsData } = useQuery({ queryKey: ['institute-students'], queryFn: () => instituteApi.listStudents() })
  const { data: examples = [] } = useQuery({ queryKey: ['institute-examples'], queryFn: () => instituteApi.listExamples() })
  const { data: assignments = [] } = useQuery({ queryKey: ['institute-assignments'], queryFn: () => instituteApi.assignments() })
  const del = useMutation({
    mutationFn: () => instituteApi.moduleDelete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institute-modules'] }); navigate('/institute/modules') },
  })

  if (isLoading || !data) {
    return <InstituteShell><div className="px-6 py-10 text-sm text-brand-muted">Lädt …</div></InstituteShell>
  }

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[820px] px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => navigate('/institute/modules')} className="text-xs text-brand-muted hover:text-navy transition-colors">← Alle Module</button>
          <button onClick={() => { if (window.confirm('Modul löschen? Einschreibungen und Fortschritt gehen verloren.')) del.mutate() }}
            className="text-xs text-brand-muted hover:text-red-600">Modul löschen</button>
        </div>

        <MetaCard module={data} />
        <StepsCard moduleId={id!} steps={data.steps} examples={examples} assignments={assignments} />
        <EnrollCard moduleId={id!} module={data} students={(studentsData?.students ?? [])} />
      </div>
    </InstituteShell>
  )
}

function MetaCard({ module }: { module: LearningModuleDetail }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState(module.title)
  const [description, setDescription] = useState(module.description ?? '')
  const [guide, setGuide] = useState(module.didactic_guide ?? '')
  const [status, setStatus] = useState(module.status)
  const [sellable, setSellable] = useState(module.sellable)
  const [savedOk, setSavedOk] = useState(false)

  const save = useMutation({
    mutationFn: () => instituteApi.moduleUpdate(module.id, {
      title: title.trim(), description: description.trim() || null,
      didactic_guide: guide.trim() || null, status, sellable,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institute-module', module.id] }); qc.invalidateQueries({ queryKey: ['institute-modules'] }); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000) },
  })
  const dirty = () => setSavedOk(false)

  return (
    <section className="card space-y-3">
      <h2 className="text-sm font-bold text-navy">Modul</h2>
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">Titel</label>
        <input value={title} onChange={e => { setTitle(e.target.value); dirty() }} maxLength={200}
          className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">Kurzbeschreibung</label>
        <textarea value={description} onChange={e => { setDescription(e.target.value); dirty() }} rows={2}
          className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-text">Didaktischer Leitfaden <span className="text-brand-muted">(nur für dich)</span></label>
        <textarea value={guide} onChange={e => { setGuide(e.target.value); dirty() }} rows={4} placeholder="Lernziele, Hinweise für die Durchführung, typische Fehler, Diskussionsfragen …"
          className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-brand-text">Status</label>
          <select value={status} onChange={e => { setStatus(e.target.value as typeof status); dirty() }}
            className="rounded-brand border border-brand-border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-accent">
            <option value="draft">Entwurf</option>
            <option value="published">Veröffentlicht</option>
            <option value="archived">Archiviert</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-text">
          <input type="checkbox" checked={sellable} onChange={e => { setSellable(e.target.checked); dirty() }} className="accent-accent" />
          Als verkaufbares Paket markieren
        </label>
      </div>
      <div className="flex items-center gap-3 border-t border-brand-border pt-3">
        <button onClick={() => save.mutate()} disabled={!title.trim() || save.isPending} className="btn-primary !py-2 !px-4 !text-sm">
          {save.isPending ? 'Speichern …' : savedOk ? '✓ Gespeichert' : 'Modul speichern'}
        </button>
      </div>
    </section>
  )
}

function StepsCard({ moduleId, steps, examples, assignments }: {
  moduleId: string; steps: ModuleStep[]; examples: ExampleSummary[]; assignments: Assignment[]
}) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const invalidate = () => qc.invalidateQueries({ queryKey: ['institute-module', moduleId] })

  const add = useMutation({
    mutationFn: (data: ModuleStepInput) => instituteApi.moduleStepAdd(moduleId, data),
    onSuccess: () => { invalidate(); setAdding(false) },
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => instituteApi.moduleStepsReorder(moduleId, ids),
    onSuccess: invalidate,
  })
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    const ids = steps.map(s => s.id)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    reorder.mutate(ids)
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-navy">Schritte</h2>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs font-semibold text-accent hover:underline">+ Schritt</button>}
      </div>

      {adding && (
        <StepForm examples={examples} assignments={assignments}
          onSubmit={(d) => add.mutate(d)} onCancel={() => setAdding(false)} pending={add.isPending} />
      )}

      {steps.length === 0 && !adding ? (
        <p className="text-sm text-brand-muted">Noch keine Schritte. Füge Lektionen, einen Fall oder eine Aufgabe hinzu.</p>
      ) : (
        <div className="space-y-2">
          {steps.map((s, i) => (
            <StepRow key={s.id} moduleId={moduleId} step={s} index={i} total={steps.length} onMove={move}
              examples={examples} assignments={assignments} />
          ))}
        </div>
      )}
    </section>
  )
}

function refTitle(step: ModuleStep, examples: ExampleSummary[], assignments: Assignment[]): string | null {
  if (step.kind === 'case') return examples.find(e => e.id === step.ref_id)?.title ?? '(Fall entfernt)'
  if (step.kind === 'assignment') return assignments.find(a => a.id === step.ref_id)?.title ?? '(Aufgabe entfernt)'
  return null
}

function StepRow({ moduleId, step, index, total, onMove, examples, assignments }: {
  moduleId: string; step: ModuleStep; index: number; total: number; onMove: (i: number, dir: -1 | 1) => void
  examples: ExampleSummary[]; assignments: Assignment[]
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const invalidate = () => qc.invalidateQueries({ queryKey: ['institute-module', moduleId] })
  const upd = useMutation({
    mutationFn: (d: ModuleStepInput) => instituteApi.moduleStepUpdate(moduleId, step.id, d),
    onSuccess: () => { invalidate(); setEditing(false) },
  })
  const del = useMutation({ mutationFn: () => instituteApi.moduleStepDelete(moduleId, step.id), onSuccess: invalidate })

  if (editing) {
    return (
      <div className="rounded-brand border border-accent/40 bg-brand-bg p-3">
        <StepForm examples={examples} assignments={assignments} initial={step}
          onSubmit={(d) => upd.mutate(d)} onCancel={() => setEditing(false)} pending={upd.isPending} />
      </div>
    )
  }

  const ref = refTitle(step, examples, assignments)
  return (
    <div className="rounded-brand border border-brand-border bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-brand-muted tabular-nums">{index + 1}.</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STEP_KIND_CLS[step.kind]}`}>{STEP_KIND_LABEL[step.kind]}</span>
          <span className="truncate text-sm font-semibold text-navy">{step.title}</span>
          {ref && <span className="truncate text-xs text-brand-muted">· {ref}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => onMove(index, -1)} disabled={index === 0} title="Nach oben" className="rounded p-1 text-brand-muted hover:text-navy disabled:opacity-30">↑</button>
          <button onClick={() => onMove(index, 1)} disabled={index === total - 1} title="Nach unten" className="rounded p-1 text-brand-muted hover:text-navy disabled:opacity-30">↓</button>
          <button onClick={() => setEditing(true)} className="ml-1 text-xs text-brand-muted hover:text-accent">Bearbeiten</button>
          <button onClick={() => { if (window.confirm('Schritt löschen?')) del.mutate() }} className="ml-1 text-xs text-brand-muted hover:text-red-600">Löschen</button>
        </div>
      </div>
    </div>
  )
}

function StepForm({ examples, assignments, initial, onSubmit, onCancel, pending }: {
  examples: ExampleSummary[]; assignments: Assignment[]; initial?: ModuleStep
  onSubmit: (d: ModuleStepInput) => void; onCancel: () => void; pending: boolean
}) {
  const [kind, setKind] = useState<ModuleStepKind>(initial?.kind ?? 'lesson')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [refId, setRefId] = useState(initial?.ref_id ?? '')
  const publishedExamples = examples.filter(e => e.status === 'published')

  const pickRef = (id: string, label: string) => { setRefId(id); if (!title.trim()) setTitle(label) }
  const canSubmit = !!title.trim() && (kind === 'lesson' || !!refId)
  const submit = () => onSubmit({
    kind, title: title.trim(),
    content: kind === 'lesson' ? content : null,
    ref_id: kind === 'lesson' ? null : (refId || null),
  })

  return (
    <div className="space-y-2 rounded-brand border border-brand-border p-3">
      <div className="flex flex-wrap gap-2">
        {(['lesson', 'case', 'assignment'] as ModuleStepKind[]).map(k => (
          <button key={k} onClick={() => { setKind(k); setRefId('') }}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${kind === k ? 'border-accent bg-accent/10 text-accent' : 'border-brand-border text-brand-muted hover:border-accent/50'}`}>
            {STEP_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Titel des Schritts"
        className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm font-semibold text-navy outline-none focus:border-accent" />

      {kind === 'lesson' && (
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Inhalt (Markdown möglich) …"
          className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
      )}
      {kind === 'case' && (
        <div>
          <select value={refId} onChange={e => { const ex = publishedExamples.find(x => x.id === e.target.value); pickRef(e.target.value, ex?.title ?? '') }}
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent">
            <option value="">Veröffentlichten Fall wählen …</option>
            {publishedExamples.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          {publishedExamples.length === 0 && <p className="mt-1 text-xs text-brand-muted">Noch kein veröffentlichter Fall vorhanden.</p>}
          <p className="mt-1 text-xs text-brand-muted">Studierende erhalten beim Öffnen automatisch eine eigene Arbeitskopie.</p>
        </div>
      )}
      {kind === 'assignment' && (
        <div>
          <select value={refId} onChange={e => { const a = assignments.find(x => x.id === e.target.value); pickRef(e.target.value, a?.title ?? '') }}
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent">
            <option value="">Aufgabe wählen …</option>
            {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          {assignments.length === 0 && <p className="mt-1 text-xs text-brand-muted">Noch keine Aufgabe vorhanden.</p>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={!canSubmit || pending} className="btn-primary !py-1.5 !px-4 !text-sm">
          {pending ? 'Speichern …' : 'Speichern'}
        </button>
        <button onClick={onCancel} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
      </div>
    </div>
  )
}

function EnrollCard({ moduleId, module, students }: {
  moduleId: string; module: LearningModuleDetail; students: { id: string; display_name: string | null }[]
}) {
  const qc = useQueryClient()
  const [picked, setPicked] = useState<string[]>([])
  const enroll = useMutation({
    mutationFn: (v: { student_ids?: string[]; to_all?: boolean }) => instituteApi.moduleEnroll(moduleId, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institute-module', moduleId] }); setPicked([]) },
  })
  const enrolledIds = new Set(module.students.map(s => s.student_id))
  const available = students.filter(s => !enrolledIds.has(s.id))
  const toggle = (sid: string) => setPicked(p => p.includes(sid) ? p.filter(x => x !== sid) : [...p, sid])

  return (
    <section className="card">
      <h2 className="text-sm font-bold text-navy mb-2">Einschreibung</h2>
      {available.length === 0 ? (
        <p className="text-sm text-brand-muted">Alle aktiven Studierenden sind eingeschrieben.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {available.map(s => (
              <button key={s.id} onClick={() => toggle(s.id)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${picked.includes(s.id) ? 'border-accent bg-accent/10 text-accent' : 'border-brand-border text-brand-muted hover:border-accent/50'}`}>
                {s.display_name || 'Studierende:r'}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={() => enroll.mutate({ student_ids: picked })} disabled={picked.length === 0 || enroll.isPending}
              className="btn-primary !py-1.5 !px-4 !text-sm disabled:opacity-40">
              {enroll.isPending ? 'Einschreiben …' : `Ausgewählte einschreiben (${picked.length})`}
            </button>
            <button onClick={() => enroll.mutate({ to_all: true })} disabled={enroll.isPending} className="text-sm text-brand-muted hover:text-accent">Alle einschreiben</button>
          </div>
        </>
      )}

      {module.students.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-brand-border pt-3">
          <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide">Fortschritt ({module.students.length})</p>
          {module.students.map(s => (
            <div key={s.student_id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-navy">{s.student_name}</span>
              <span className="shrink-0 text-xs text-brand-muted tabular-nums">
                {s.completed}/{s.total} {s.status === 'completed' && <span className="text-green-600 font-semibold">✓</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
