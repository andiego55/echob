/**
 * Reiter im Fall-Arbeitsplatz: Termine vorschlagen + Terminliste mit Status.
 * Aus der früheren „Zuweisen & Termine"-Sammelkarte herausgelöst (Reitermenü, Phase 1).
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { collabApi } from '@/api/collab'

const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent'

function fmt(dt: string) {
  return new Date(dt).toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function AppointmentsPanel({ caseId }: { caseId: string }) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['appointments', caseId] })
  const appointments = useQuery({
    queryKey: ['appointments', caseId], queryFn: () => collabApi.listAppointments(caseId),
  })

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

  return (
    <div className="space-y-4">
      <div className="card border-accent/30">
        <h2 className="text-sm font-bold text-navy mb-3">Termin vorschlagen</h2>
        <form onSubmit={e => { e.preventDefault(); if (apptWhen) createAppt.mutate() }} className="space-y-2.5">
          <input value={apptTitle} onChange={e => setApptTitle(e.target.value)} placeholder="Termin-Titel (z. B. Erstgespräch)" className={inputCls} />
          <input type="datetime-local" value={apptWhen} onChange={e => setApptWhen(e.target.value)} className={inputCls} />
          <input value={apptLocation} onChange={e => setApptLocation(e.target.value)} placeholder="Ort / Video-Link (optional)" className={inputCls} />
          <button type="submit" disabled={createAppt.isPending || !apptWhen} className="btn-primary !py-2 !text-sm disabled:opacity-60">
            {createAppt.isPending ? 'Wird vorgeschlagen …' : 'Termin vorschlagen'}
          </button>
        </form>
      </div>

      {!!appointments.data?.length && (
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-3">Termine</p>
          <ul className="space-y-2 text-sm">
            {appointments.data.map(a => {
              const loc = (a.payload as { location?: string })?.location
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 border-b border-brand-border pb-2 last:border-0 last:pb-0">
                  <span className="text-brand-text">
                    {a.title || 'Termin'}{loc && <span className="text-brand-muted"> · {loc}</span>}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-brand-muted shrink-0">
                    <span>{a.status}</span><span>{fmt(a.start_at)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
