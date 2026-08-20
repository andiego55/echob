/**
 * Eure Chronik – der Weg als Zeitstrahl.
 *
 * Punkte und Stufen sagen, *dass* ihr arbeitet. Sie sagen nicht, *was* ihr getan habt.
 * Genau das liegt aber längst in den Daten: jedes verbuchte Ereignis kennt Datum, Anlass
 * und die Person, die gehandelt hat. Sichtbar war davon bisher nichts.
 *
 * Gruppiert nach Tagen, weil ein Paar sich in Tagen erinnert und nicht in Einzelklicks.
 * Erreichte Meilensteine stehen als eigene Marken darüber – sie haben kein Datum
 * (sie werden aus den Ereignissen abgeleitet), aber sie gehören sichtbar dazu.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import { coupleApi } from '@/api/couple'
import type { CoupleProgress } from '@/api/couple'
import { useCoupleFaces } from './useCoupleFaces'

const SICHTBAR = 12

/** Zeichen je Ereignisart – knapp, kein Emoji-Regen. */
const MARKE: Record<string, string> = {
  agreement_kept: '◆',
  agreement_accepted: '◆',
  agreement_proposed: '◇',
  agreement_reviewed: '◈',
  session_started: '●',
  session_summarized: '◉',
  mediation_done: '▲',
  perspective_shared: '△',
  test_taken: '■',
  test_compared: '□',
  checkin_done: '·',
  appreciation_left: '♥',
  barometer_set: '~',
  context_shared: '○',
  self_feedback: '○',
}

function tagesLabel(iso: string): string {
  const d = new Date(iso)
  const heute = new Date()
  const gestern = new Date(heute)
  gestern.setDate(heute.getDate() - 1)
  const gleich = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (gleich(d, heute)) return 'Heute'
  if (gleich(d, gestern)) return 'Gestern'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function ChronicleCard({ coupleId }: { coupleId: string }) {
  const [alle, setAlle] = useState(false)
  const { own, partner } = useCoupleFaces(coupleId)

  // Gleicher Query-Key wie die Fortschrittskarte – react-query buendelt das zu einer Anfrage.
  const { data: progress } = useQuery({
    queryKey: ['couple-progress', coupleId],
    queryFn: () => coupleApi.progress(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  if (!progress) return null

  const erreicht = progress.milestones.filter(m => m.reached)
  const ereignisse = alle ? progress.recent : progress.recent.slice(0, SICHTBAR)

  // Nach Tagen bündeln – ein Paar erinnert sich in Tagen, nicht in Einzelklicks.
  const tage: { label: string; eintraege: CoupleProgress['recent'] }[] = []
  for (const e of ereignisse) {
    const label = tagesLabel(e.created_at)
    const letzter = tage[tage.length - 1]
    if (letzter && letzter.label === label) letzter.eintraege.push(e)
    else tage.push({ label, eintraege: [e] })
  }

  if (progress.recent.length === 0) {
    return (
      <div className="card card-static">
        <h2 className="card-title">Eure Chronik</h2>
        <p className="mt-3 rounded-brand border border-dashed border-brand-border px-4 py-3.5 text-sm leading-relaxed text-brand-muted">
          Hier entsteht euer Weg: jedes Gespräch, jede Abmachung, jeder Check-in.
          Nach den ersten Schritten steht hier eine Spur, an der ihr sehen könnt, wie
          weit ihr schon gekommen seid.
        </p>
      </div>
    )
  }

  return (
    <div className="card card-static">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="card-title">Eure Chronik</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Was ihr getan habt – nicht, wie viel.
          </p>
        </div>
        {erreicht.length > 0 && (
          <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-[0.65rem] font-semibold text-accent">
            {erreicht.length} {erreicht.length === 1 ? 'Meilenstein' : 'Meilensteine'}
          </span>
        )}
      </div>

      {/* ── Erreichte Meilensteine ───────────────────────────────── */}
      {erreicht.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {erreicht.map(m => (
            <span
              key={m.key}
              title={m.description}
              className="rounded-full border border-accent/30 bg-accent/[0.06] px-3 py-1 text-xs font-medium text-accent"
            >
              {m.title}
            </span>
          ))}
        </div>
      )}

      {/* ── Der Zeitstrahl ───────────────────────────────────────── */}
      <div className="mt-5 border-l-2 border-brand-border pl-4">
        {tage.map((tag, ti) => (
          <div key={tag.label + ti} className={ti > 0 ? 'mt-4' : ''}>
            <p className="relative text-[0.68rem] font-bold uppercase tracking-wide text-brand-muted">
              <span className="absolute -left-[1.32rem] top-1 h-2 w-2 rounded-full bg-accent/70" />
              {tag.label}
            </p>
            <div className="mt-1.5 space-y-1.5">
              {tag.eintraege.map((e, i) => {
                const gesicht = e.name === own.name ? own : partner
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <Avatar value={gesicht.avatar} size="xs" />
                    <span className="w-3 shrink-0 text-center text-[0.7rem] text-accent/70" aria-hidden>
                      {MARKE[e.kind] ?? '·'}
                    </span>
                    <p className="min-w-0 flex-1 text-sm text-brand-text">{e.label}</p>
                    <span className="shrink-0 text-[0.68rem] tabular-nums text-brand-muted">
                      +{e.points}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {progress.recent.length > SICHTBAR && (
        <button
          onClick={() => setAlle(a => !a)}
          className="mt-4 text-xs text-accent hover:underline"
        >
          {alle ? 'Weniger zeigen' : `Alle ${progress.recent.length} Schritte zeigen`}
        </button>
      )}
    </div>
  )
}
