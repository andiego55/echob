/**
 * Profi-Panel in der Fallansicht: dem Nutzer etwas zuweisen (Dialog/Fragebogen/
 * Nachricht/Ressource) und Termine vorschlagen. Phase 0.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { collabApi, type AssignmentType } from '@/api/collab'

const TYPE_OPTIONS: { value: AssignmentType; label: string; contentLabel: string }[] = [
  { value: 'message', label: 'Nachricht', contentLabel: 'Nachricht an die Klient:in' },
  { value: 'dialog', label: 'Dialog-Vorschlag', contentLabel: 'Intention / Worum es gehen soll' },
  { value: 'questionnaire', label: 'Fragebogen', contentLabel: 'Einleitung / Frage' },
  { value: 'resource', label: 'Ressource', contentLabel: 'Beschreibung' },
]

function fmt(dt: string) {
  return new Date(dt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AssignPanel({ caseId }: { caseId: string }) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['assignments', caseId] })
    qc.invalidateQueries({ queryKey: ['appointments', caseId] })
  }

  const assignments = useQuery({ queryKey: ['assignments', caseId], queryFn: () => collabApi.listAssignments(caseId) })
  const appointments = useQuery({ queryKey: ['appointments', caseId], queryFn: () => collabApi.listAppointments(caseId) })

  // ── Zuweisung ──
  const [type, setType] = useState<AssignmentType>('message')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [url, setUrl] = useState('')
  const opt = TYPE_OPTIONS.find(o => o.value === type)!

  const createAssign = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {}
      if (type === 'message') payload.body = content
      if (type === 'dialog') { payload.intention = content; if (hypothesis.trim()) payload.hypothesis_for_echo = hypothesis }
      if (type === 'questionnaire') payload.intro = content
      if (type === 'resource') { payload.text = content; if (url.trim()) payload.url = url }
      return collabApi.createAssignment(caseId, { type, title: title.trim() || null, payload })
    },
    onSuccess: () => { setTitle(''); setContent(''); setHypothesis(''); setUrl(''); invalidate() },
  })

  // ── Termin ──
  const [apptTitle, setApptTitle] = useState('')
  const [apptWhen, setApptWhen] = useState('')
  const [apptLocation, setApptLocation] = useState('')
  const createAppt = useMutation({
    mutationFn: () => collabApi.createAppointment(caseId, {
      title: apptTitle.trim() || null,
      payload: apptLocation.trim() ? { location: apptLocation } : {},
      start_at: new Date(apptWhen).toISOString(),
    }),
    onSuccess: () => { setApptTitle(''); setApptWhen(''); setApptLocation(''); invalidate() },
  })

  const inputCls = 'w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent'

  return (
    <div className="card lg:col-span-2 border-accent/30">
      <h2 className="text-sm font-bold text-navy mb-1">Zuweisen & Termine</h2>
      <p className="text-xs text-brand-muted mb-4">
        Erscheint im Postfach der Klient:in. „Interne Hypothese" sieht nur Echo – nie die Klient:in.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Zuweisung */}
        <form onSubmit={e => { e.preventDefault(); if (content.trim()) createAssign.mutate() }} className="space-y-2.5">
          <div className="flex gap-2">
            <select value={type} onChange={e => setType(e.target.value as AssignmentType)} className={inputCls + ' max-w-[44%]'}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (optional)" className={inputCls} />
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder={opt.contentLabel} className={inputCls} />
          {type === 'dialog' && (
            <input value={hypothesis} onChange={e => setHypothesis(e.target.value)}
              placeholder="Interne Hypothese für Echo (optional, nicht sichtbar für Klient:in)" className={inputCls} />
          )}
          {type === 'resource' && (
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (optional)" className={inputCls} />
          )}
          <button type="submit" disabled={createAssign.isPending || !content.trim()}
            className="btn-primary !py-2 !text-sm disabled:opacity-60">
            {createAssign.isPending ? 'Wird gesendet …' : 'Zuweisen'}
          </button>
        </form>

        {/* Termin */}
        <form onSubmit={e => { e.preventDefault(); if (apptWhen) createAppt.mutate() }} className="space-y-2.5">
          <input value={apptTitle} onChange={e => setApptTitle(e.target.value)} placeholder="Termin-Titel (z. B. Erstgespräch)" className={inputCls} />
          <input type="datetime-local" value={apptWhen} onChange={e => setApptWhen(e.target.value)} className={inputCls} />
          <input value={apptLocation} onChange={e => setApptLocation(e.target.value)} placeholder="Ort / Video-Link (optional)" className={inputCls} />
          <button type="submit" disabled={createAppt.isPending || !apptWhen}
            className="text-sm font-semibold px-4 py-2 rounded-brand bg-navy text-white hover:bg-navy/90 disabled:opacity-60">
            {createAppt.isPending ? 'Wird vorgeschlagen …' : 'Termin vorschlagen'}
          </button>
        </form>
      </div>

      {/* Gesendete Items */}
      {(!!assignments.data?.length || !!appointments.data?.length) && (
        <div className="mt-5 border-t border-brand-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">Gesendet</p>
          <ul className="space-y-1 text-xs text-brand-text">
            {appointments.data?.map(a => (
              <li key={a.id}>📅 {a.title || 'Termin'} · {fmt(a.start_at)} · <span className="text-brand-muted">{a.status}</span></li>
            ))}
            {assignments.data?.map(a => (
              <li key={a.id}>
                {TYPE_OPTIONS.find(o => o.value === a.type)?.label ?? a.type}: {a.title || '–'} · <span className="text-brand-muted">{a.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
