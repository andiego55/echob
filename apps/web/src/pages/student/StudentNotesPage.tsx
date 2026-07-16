/**
 * /student/cases/:id/notes — Notizen der/des Studierenden.
 * Sitzungsverlauf (titelbare Notizen aus Vorlagen) + stehender Fallüberblick,
 * Layout wie die Fachpersonen-Notizen.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { studentApi } from '@/api/student'
import type { StudentNotes, StudentSessionNote } from '@/types'

type Section = { heading: string; text: string }

const TEMPLATES: { name: string; fields: string[] }[] = [
  { name: 'Sitzungsnotiz', fields: ['Beobachtungen', 'Themen', 'Hypothesen', 'Nächste Schritte'] },
  { name: 'Erstgespräch', fields: ['Anliegen', 'Erster Eindruck', 'Offene Fragen', 'Vorgehen'] },
  { name: 'Verlaufsnotiz', fields: ['Veränderungen', 'Aktuelle Themen', 'Nächste Schritte'] },
  { name: 'Reflexion', fields: ['Was ist mir aufgefallen?', 'Eigene Resonanz', 'Was nehme ich mit?'] },
  { name: 'Freie Notiz', fields: ['Notiz'] },
]

const todayISO = () => new Date().toISOString().slice(0, 10)
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function StudentNotesPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-6">
        <header>
          <h1 className="text-xl font-bold text-navy">Notizen</h1>
          <p className="mt-0.5 text-sm text-brand-muted">Deine Arbeitsnotizen zu diesem Fall – nur für dich.</p>
        </header>

        <SessionNotesSection copyId={id!} />

        <details className="card">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <h2 className="text-sm font-bold text-navy">Fallüberblick</h2>
            <span className="text-xs text-brand-muted">stehende Notizen · auf-/zuklappen</span>
          </summary>
          <p className="mt-2 text-xs text-brand-muted">
            Stehende Notizen zum Fall (fließen in Echo und Berichte ein). Für einzelne Sitzungen nutze den Verlauf oben.
          </p>
          <div className="mt-4"><OverviewEditor copyId={id!} /></div>
        </details>
      </div>
    </StudentShell>
  )
}

function SessionNotesSection({ copyId }: { copyId: string }) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['student-session-notes', copyId],
    queryFn: () => studentApi.sessionNotes(copyId),
  })
  const del = useMutation({
    mutationFn: (nid: string) => studentApi.sessionNoteDelete(copyId, nid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-session-notes', copyId] }),
  })

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-navy">Sitzungsverlauf</h2>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-primary !py-1.5 !px-4 !text-sm">
            + Neue Sitzungsnotiz
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-5">
          <SessionNoteForm copyId={copyId} onDone={() => setCreating(false)} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-brand-muted">Wird geladen …</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-brand-muted">Noch keine Sitzungsnotizen. Lege die erste an.</p>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <SessionNoteCard
              key={n.id} copyId={copyId} note={n}
              onDelete={() => { if (window.confirm('Diese Sitzungsnotiz löschen?')) del.mutate(n.id) }}
              deleting={del.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionNoteCard({ copyId, note, onDelete, deleting }: {
  copyId: string; note: StudentSessionNote; onDelete: () => void; deleting: boolean
}) {
  const [editing, setEditing] = useState(false)
  const sections = note.content?.sections ?? []

  if (editing) {
    return (
      <div className="rounded-brand border border-accent/40 bg-brand-bg p-4">
        <SessionNoteForm copyId={copyId} note={note} onDone={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <details className="rounded-brand border border-brand-border bg-brand-bg px-4 py-2.5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="text-sm font-semibold text-navy">{note.title || 'Sitzungsnotiz'}</span>
          <span className="block text-[11px] text-brand-muted">{fmtDate(note.session_date)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <button onClick={(e) => { e.preventDefault(); setEditing(true) }} className="text-xs text-brand-muted transition-colors hover:text-accent">Bearbeiten</button>
          <button onClick={(e) => { e.preventDefault(); onDelete() }} disabled={deleting} className="text-xs text-brand-muted transition-colors hover:text-red-600 disabled:opacity-40">Löschen</button>
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        {sections.map((s, i) => (
          <div key={i}>
            {s.heading && <div className="text-xs font-bold text-navy">{s.heading}</div>}
            <div className="text-sm leading-relaxed text-brand-text"><MarkdownMessage content={s.text} /></div>
          </div>
        ))}
      </div>
    </details>
  )
}

function SessionNoteForm({ copyId, note, onDone }: {
  copyId: string; note?: StudentSessionNote; onDone: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!note
  const [date, setDate] = useState(note?.session_date ?? todayISO())
  const [title, setTitle] = useState(note?.title ?? '')
  const [sections, setSections] = useState<Section[]>(note?.content?.sections ?? [{ heading: '', text: '' }])

  const applyTemplate = (t: { name: string; fields: string[] }) => {
    setSections(t.fields.map(f => ({ heading: f, text: '' })))
    if (!title.trim()) setTitle(t.name)
  }
  const setSec = (i: number, patch: Partial<Section>) =>
    setSections(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const save = useMutation({
    mutationFn: () => {
      const payload = { session_date: date, title: title.trim() || null, sections }
      return isEdit
        ? studentApi.sessionNoteUpdate(copyId, note!.id, payload)
        : studentApi.sessionNoteCreate(copyId, payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-session-notes', copyId] }); onDone() },
  })

  const canSave = sections.some(s => s.text.trim() || s.heading.trim())

  return (
    <div className="space-y-3 rounded-brand border border-brand-border bg-white p-4">
      {!isEdit && (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy">Vorlage</div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <button key={t.name} onClick={() => applyTemplate(t)}
                className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-navy transition-colors hover:border-accent hover:text-accent">
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-text">Datum</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-brand-text">Titel</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="z. B. Sitzung 3"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="space-y-2 rounded-brand border border-brand-border p-3">
            <div className="flex items-center gap-2">
              <input value={s.heading} onChange={e => setSec(i, { heading: e.target.value })}
                placeholder="Abschnitt (z. B. Beobachtungen)"
                className="flex-1 rounded-brand border border-brand-border bg-white px-2.5 py-1.5 text-sm font-semibold text-navy outline-none focus:border-accent" />
              {sections.length > 1 && (
                <button onClick={() => setSections(prev => prev.filter((_, j) => j !== i))} className="text-xs text-brand-muted hover:text-red-600">Entfernen</button>
              )}
            </div>
            <textarea value={s.text} onChange={e => setSec(i, { text: e.target.value })} rows={4}
              className="w-full resize-y rounded-brand border border-brand-border bg-white px-2.5 py-2 text-sm text-brand-text outline-none focus:border-accent" />
          </div>
        ))}
        <button onClick={() => setSections(prev => [...prev, { heading: '', text: '' }])} className="text-xs text-accent hover:underline">+ Abschnitt hinzufügen</button>
      </div>

      <div className="flex items-center gap-3 border-t border-brand-border pt-3">
        <button onClick={() => save.mutate()} disabled={!canSave || save.isPending} className="btn-primary !py-1.5 !px-4 !text-sm">
          {save.isPending ? 'Speichern …' : isEdit ? 'Änderungen speichern' : 'Sitzungsnotiz speichern'}
        </button>
        <button onClick={onDone} disabled={save.isPending} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
        {save.isError && <span className="text-xs text-red-600">Speichern fehlgeschlagen.</span>}
      </div>
    </div>
  )
}

const FIELDS: { key: keyof StudentNotes; label: string; placeholder: string }[] = [
  { key: 'first_impressions',    label: 'Erste Eindrücke',    placeholder: 'Was fällt dir zuerst auf?' },
  { key: 'key_scenes',           label: 'Wichtige Szenen',    placeholder: 'Welche Szenen sind besonders aufschlussreich?' },
  { key: 'open_questions',       label: 'Offene Fragen',      placeholder: 'Was würdest du im Erstgespräch nachfragen?' },
  { key: 'conversation_prompts', label: 'Gesprächsimpulse',   placeholder: 'Mögliche Impulse für ein Gespräch …' },
  { key: 'next_steps',           label: 'Nächste Schritte',   placeholder: 'Wie würdest du weiter vorgehen?' },
  { key: 'free_text',            label: 'Freitext',           placeholder: 'Weitere Notizen …' },
]

const EMPTY: StudentNotes = {
  first_impressions: '', key_scenes: '', open_questions: '',
  conversation_prompts: '', next_steps: '', free_text: '',
}

function OverviewEditor({ copyId }: { copyId: string }) {
  const qc = useQueryClient()
  const [values, setValues] = useState<StudentNotes>(EMPTY)
  const [savedOk, setSavedOk] = useState(false)

  const { data } = useQuery({ queryKey: ['student-notes', copyId], queryFn: () => studentApi.notes(copyId) })
  useEffect(() => {
    if (data) setValues({
      first_impressions: data.first_impressions ?? '', key_scenes: data.key_scenes ?? '',
      open_questions: data.open_questions ?? '', conversation_prompts: data.conversation_prompts ?? '',
      next_steps: data.next_steps ?? '', free_text: data.free_text ?? '',
    })
  }, [data])

  const save = useMutation({
    mutationFn: () => studentApi.notesSave(copyId, values),
    onSuccess: (d) => { qc.setQueryData(['student-notes', copyId], d); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000) },
  })
  const set = (k: keyof StudentNotes, v: string) => { setValues(prev => ({ ...prev, [k]: v })); setSavedOk(false) }

  return (
    <div className="space-y-4">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="mb-1 block text-xs font-medium text-brand-text">{label}</label>
          <textarea
            rows={2}
            value={(values[key] ?? '') as string}
            onChange={e => set(key, e.target.value)}
            placeholder={placeholder}
            className="w-full resize-y rounded-brand border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary !py-2 !px-5 !text-sm">
          {save.isPending ? 'Wird gespeichert …' : savedOk ? '✓ Gespeichert' : 'Überblick speichern'}
        </button>
        {save.isError && <span className="text-xs text-red-600">Speichern fehlgeschlagen.</span>}
      </div>
    </div>
  )
}
