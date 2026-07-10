/**
 * Fall-Verlauf (Tab „Verlauf" im Fall-Arbeitsplatz).
 * Oben: „Neue Freigaben ermitteln" – seit einem Datum nur die neu geteilten
 * Klient-Inhalte. Darunter: die vollständige Chronik aller Fall-Ereignisse,
 * nach Tag gruppiert. Read-only; Server liefert nur freigegebene Daten.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { professionalApi, type CaseHistoryEvent } from '@/api/professional'
import { SCALE_LABELS } from '@/types'

const KIND_ICON: Record<string, string> = {
  share: '🔓', assignment_sent: '📤', assignment_done: '✅', appointment: '📅',
  session_note: '🗒️', report: '📄', echo: '💬', notes: '✏️',
  scene: '🎬', scale: '📊', client_report: '📝', onboarding: '🧭', profile: '👤',
}

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

function detailText(e: CaseHistoryEvent): string | null {
  if (e.kind === 'scale' && e.detail) return (SCALE_LABELS as Record<string, string>)[e.detail] ?? e.detail
  return e.detail
}

function EventRow({ e }: { e: CaseHistoryEvent }) {
  const isClient = e.actor === 'client'
  const d = detailText(e)
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-bg text-sm" aria-hidden>
        {KIND_ICON[e.kind] ?? '•'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-navy">{e.title}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            isClient ? 'bg-accent/10 text-accent' : 'bg-brand-bg text-brand-muted'
          }`}>
            {isClient ? 'Klient:in' : 'Du'}
          </span>
        </div>
        {d && <p className="mt-0.5 text-xs text-brand-muted break-words">{d}</p>}
      </div>
      <span className="shrink-0 text-xs text-brand-muted tabular-nums">{fmtTime(e.at)}</span>
    </div>
  )
}

export default function CaseHistoryPanel({ caseId }: { caseId: string }) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, isLoading } = useQuery({
    queryKey: ['case-history', caseId],
    queryFn: () => professionalApi.caseHistory(caseId),
  })

  const [since, setSince] = useState(() => new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10))
  const [activeSince, setActiveSince] = useState<string | null>(null)
  const newShared = useQuery({
    queryKey: ['case-new-shared', caseId, activeSince],
    queryFn: () => professionalApi.caseNewShared(caseId, activeSince!),
    enabled: !!activeSince,
  })

  const events = data?.events ?? []
  const groups: { day: string; label: string; items: CaseHistoryEvent[] }[] = []
  for (const e of events) {
    const k = dayKey(e.at)
    const last = groups[groups.length - 1]
    if (last && last.day === k) last.items.push(e)
    else groups.push({ day: k, label: fmtDay(e.at), items: [e] })
  }

  const sharedItems = newShared.data?.items ?? []

  return (
    <div className="space-y-4">
      {/* Neue Freigaben ermitteln */}
      <div className="card">
        <h2 className="text-sm font-bold text-navy">Neue Freigaben ermitteln</h2>
        <p className="mt-1 text-xs text-brand-muted">
          Wähle ein Datum – du siehst dann nur die Inhalte, die die Klient:in <em>seit</em> dann neu
          geteilt hat (Szenen, Skalen, Berichte, Profil, Onboarding). Eigene Aktionen bleiben außen vor.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date" value={since} max={today}
            onChange={e => setSince(e.target.value)}
            className="rounded-brand border border-brand-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={() => setActiveSince(since)} disabled={!since}
            className="rounded-brand bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            Neue Freigaben ermitteln
          </button>
          {activeSince && (
            <button onClick={() => setActiveSince(null)}
              className="text-xs font-medium text-brand-muted transition-colors hover:text-navy">
              zurücksetzen
            </button>
          )}
        </div>

        {activeSince && (
          <div className="mt-3 border-t border-brand-border pt-3">
            {newShared.isLoading ? (
              <p className="text-sm text-brand-muted">Wird ermittelt …</p>
            ) : newShared.isError ? (
              <p className="text-sm text-red-600">Konnte nicht ermittelt werden.</p>
            ) : sharedItems.length === 0 ? (
              <p className="text-sm text-brand-muted">
                Seit {fmtDay(activeSince)} hat die Klient:in nichts Neues geteilt.
              </p>
            ) : (
              <>
                <p className="mb-1 text-xs font-semibold text-navy">
                  {sharedItems.length} neue{sharedItems.length === 1 ? 'r Inhalt' : ' Inhalte'} seit {fmtDay(activeSince)}
                </p>
                <div className="divide-y divide-brand-border">
                  {sharedItems.map((e, i) => <EventRow key={i} e={e} />)}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Vollständige Chronik */}
      <div className="card">
        <h2 className="mb-3 text-sm font-bold text-navy">Verlauf</h2>
        {isLoading ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-brand-muted">Noch keine Ereignisse in diesem Fall.</p>
        ) : (
          <div className="space-y-5">
            {groups.map(g => (
              <div key={g.day}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">{g.label}</div>
                <div className="divide-y divide-brand-border border-l-2 border-brand-border pl-3">
                  {g.items.map((e, i) => <EventRow key={i} e={e} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
