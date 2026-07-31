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

// Gebrandete Linien-Icons (24x24-viewBox, currentColor) statt Emoji — im EchoB-Stil.
const KIND_ICON_PATH: Record<string, string> = {
  share:           'M9 15l6-6M10 6l1-1a4 4 0 015 5l-1 1M14 18l-1 1a4 4 0 01-5-5l1-1',
  assignment_sent: 'M12 20V5M6 11l6-6 6 6',
  assignment_done: 'M5 13l4 4L19 7',
  appointment:     'M4 8h16M7 3v3M17 3v3M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  session_note:    'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM9 8h6M9 12h6M9 16h4',
  report:          'M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5',
  echo:            'M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z',
  notes:           'M12 20h9M4 20l1-4L16 5l3 3L8 19l-4 1z',
  scene:           'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3 16l5-5 4 4 3-3 6 6',
  scale:           'M5 20V11M12 20V5M19 20v-6M4 20h16',
  client_report:   'M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5',
  onboarding:      'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z',
  profile:         'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0',
}
const KIND_ICON_FALLBACK = 'M12 9a3 3 0 100 6 3 3 0 000-6z'

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

const fmtScore = (n: number) => n.toFixed(1).replace('.', ',')

/** Vorher/Nachher einer Skala. Höhere Werte = auffälliger → Anstieg rot, Rückgang grün. */
function ScaleDelta({ before, after }: { before?: number | null; after?: number | null }) {
  if (after == null) return null
  if (before == null) {
    return (
      <p className="text-sm text-navy">
        Erstmals ermittelt: <strong className="tabular-nums">{fmtScore(after)}</strong>
        <span className="text-xs text-brand-muted"> / 5</span>
      </p>
    )
  }
  const up = after > before
  const same = after === before
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="tabular-nums text-brand-muted">{fmtScore(before)}</span>
      <span aria-hidden className="text-brand-muted">→</span>
      <span className={`tabular-nums font-semibold ${
        same ? 'text-brand-muted' : up ? 'text-red-600' : 'text-green-600'
      }`}>{fmtScore(after)}</span>
      <span className="text-xs text-brand-muted">/ 5</span>
      {!same && (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
          up ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {up ? `+${fmtScore(after - before)}` : `−${fmtScore(before - after)}`}
        </span>
      )}
    </div>
  )
}

function EventRow({ e }: { e: CaseHistoryEvent }) {
  const [open, setOpen] = useState(false)
  const isClient = e.actor === 'client'
  const d = detailText(e)
  const hasChange = e.before != null || e.after != null
  const expandable = !!e.body || hasChange
  return (
    <div className="py-2">
      <div
        className={`flex items-start gap-3 ${expandable ? 'cursor-pointer' : ''}`}
        onClick={expandable ? () => setOpen(o => !o) : undefined}
      >
        <span
          aria-hidden
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            isClient ? 'bg-accent/10 text-accent' : 'bg-brand-bg text-brand-muted'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
            strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
            <path d={KIND_ICON_PATH[e.kind] ?? KIND_ICON_FALLBACK} />
          </svg>
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
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-brand-muted tabular-nums">{fmtTime(e.at)}</span>
          {expandable && (
            <svg className={`h-4 w-4 text-brand-muted transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
      {expandable && open && (
        <div className="ml-10 mt-2 space-y-1 rounded-brand border border-brand-border bg-brand-bg/40 px-3 py-2">
          {hasChange && <ScaleDelta before={e.before} after={e.after} />}
          {e.body && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{e.body}</p>
          )}
        </div>
      )}
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
