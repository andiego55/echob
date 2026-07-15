/**
 * /student/cases/:id/notes — Arbeitsnotizen der/des Studierenden (Felder wie Fachpersonen-Notizen).
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StudentShell from '@/components/student/StudentShell'
import StudentCaseNav from '@/components/student/StudentCaseNav'
import { studentApi } from '@/api/student'
import type { StudentNotes } from '@/types'

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

export default function StudentNotesPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [values, setValues] = useState<StudentNotes>(EMPTY)
  const [savedOk, setSavedOk] = useState(false)

  const { data } = useQuery({ queryKey: ['student-notes', id], queryFn: () => studentApi.notes(id!), enabled: !!id })
  useEffect(() => {
    if (data) setValues({
      first_impressions: data.first_impressions ?? '', key_scenes: data.key_scenes ?? '',
      open_questions: data.open_questions ?? '', conversation_prompts: data.conversation_prompts ?? '',
      next_steps: data.next_steps ?? '', free_text: data.free_text ?? '',
    })
  }, [data])

  const save = useMutation({
    mutationFn: () => studentApi.notesSave(id!, values),
    onSuccess: (d) => { qc.setQueryData(['student-notes', id], d); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000) },
  })

  const set = (k: keyof StudentNotes, v: string) => { setValues(prev => ({ ...prev, [k]: v })); setSavedOk(false) }

  return (
    <StudentShell>
      <StudentCaseNav copyId={id!} />
      <div className="mx-auto max-w-[820px] px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-navy">Notizen</h1>
            <p className="mt-0.5 text-sm text-brand-muted">Deine Arbeitsnotizen zu diesem Fall – nur für dich.</p>
          </div>
          <div className="flex items-center gap-3">
            {savedOk && <span className="text-xs font-medium text-green-600">✓ Gespeichert</span>}
            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary !py-2 !px-4 !text-sm">
              {save.isPending ? 'Speichern …' : 'Speichern'}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-navy">{label}</label>
              <textarea
                rows={3}
                value={(values[key] ?? '') as string}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full resize-y rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          ))}
        </div>

        {save.isError && <p className="mt-4 text-sm text-red-600">Speichern fehlgeschlagen.</p>}
      </div>
    </StudentShell>
  )
}
