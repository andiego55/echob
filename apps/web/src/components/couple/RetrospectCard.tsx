/**
 * Rückblick über Zeit – was sich verändert hat.
 *
 * Punkte und Streak zeigen, *dass* ihr arbeitet. Diese Karte zeigt, *was daraus geworden
 * ist*: der Barometer-Schnitt im Vergleich zum Zeitraum davor, was ihr angefangen und was
 * ihr abgeschlossen habt – und darüber Echos Bild dieser Wochen.
 *
 * Der Barometer-Wert ist bewusst der Durchschnitt **beider**. Die Tageskurve der anderen
 * Person gibt der Server nicht heraus, und das ist hier keine technische Einschränkung,
 * sondern der Punkt: Ein Schnitt sagt etwas über euch, eine Chronik ihrer schlechten Tage
 * wäre Material für Vorhaltungen.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleRetrospectApi } from '@/api/coupleRetrospect'
import type { CoupleRetrospective, CoupleRetrospectStats } from '@/api/coupleRetrospect'
import { apiErrorMessage } from '@/api/errors'
import EchoThinking from './EchoThinking'
import { RetrospectSkeleton } from './Skeleton'
import { MOOD_EMOJI } from './moods'
import { barometerColor } from './EchoBarometer'

const ZEITRAEUME = [
  { days: 30, label: '30 Tage' },
  { days: 90, label: '3 Monate' },
  { days: 180, label: '6 Monate' },
]

export default function RetrospectCard({ coupleId }: { coupleId: string }) {
  const qc = useQueryClient()
  const [days, setDays] = useState(30)

  const { data } = useQuery({
    queryKey: ['couple-retrospect', coupleId, days],
    queryFn: () => coupleRetrospectApi.get(coupleId, days),
    enabled: !!coupleId,
    retry: false,
  })

  const schreiben = useMutation({
    mutationFn: () => coupleRetrospectApi.write(coupleId, days),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-retrospect', coupleId] }),
  })

  if (!data) return <RetrospectSkeleton />
  const s = data.stats

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-navy">Was sich verändert hat</h2>
            <p className="mt-1 text-xs text-brand-muted">
              {new Date(s.period_start).toLocaleDateString('de-DE')} bis{' '}
              {new Date(s.period_end).toLocaleDateString('de-DE')}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            {ZEITRAEUME.map(z => (
              <button
                key={z.days}
                onClick={() => setDays(z.days)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  days === z.days
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-brand-muted hover:text-navy'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>

        <Barometer stats={s} />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kachel label="Gespräche" wert={s.sessions_started}
            hinweis={`${s.sessions_closed} abgeschlossen`} />
          <Kachel label="Themen" wert={s.topics_opened}
            hinweis={`${s.topics_resolved} geklärt`} />
          <Kachel label="Abmachungen" wert={s.agreements_made}
            hinweis={`${s.agreements_kept} gehalten`} />
          <Kachel label="Wertschätzung" wert={s.appreciations}
            hinweis={`${s.checkin_weeks} Wochen Check-in`} />
        </div>

        {s.moods.length > 0 && (
          <div className="mt-4 border-t border-brand-border pt-3">
            <p className="text-[0.7rem] text-brand-muted">Stimmungen in den Check-ins</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.moods.map(m => (
                <span key={m.mood}
                  className="rounded-full bg-brand-bg px-3 py-1 text-xs text-brand-muted">
                  {MOOD_EMOJI[m.mood] ?? '•'} {m.mood} · {m.anzahl}×
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Echos Bild ────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-navy">Echos Bild dieser Wochen</h2>
            <p className="mt-1 text-xs text-brand-muted">
              Echo sieht nur diese Zahlen – keine Gesprächsinhalte, keine Beiträge.
            </p>
          </div>
          <button
            onClick={() => schreiben.mutate()}
            disabled={!s.has_substance || schreiben.isPending}
            className="btn-primary shrink-0 !py-2 !px-4 !text-sm disabled:opacity-50"
          >
            {schreiben.isPending
              ? <EchoThinking text="Echo schaut zurück …" size={34} />
              : 'Rückblick schreiben lassen'}
          </button>
        </div>

        {!s.has_substance && (
          <p className="mt-3 rounded-brand border border-dashed border-brand-border px-4 py-3.5 text-sm leading-relaxed text-brand-muted">
            Für einen Rückblick ist noch zu wenig passiert. Ein Text über einen leeren
            Zeitraum würde so tun, als gäbe es etwas zu sehen. Fangt mit dem Barometer oder
            einem Check-in an – nach ein paar Wochen lohnt sich der Blick zurück.
          </p>
        )}
        {schreiben.isError && (
          <p className="mt-3 text-sm text-red-600">{apiErrorMessage(schreiben.error)}</p>
        )}

        {data.retrospectives.length > 0 && (
          <div className="mt-4 space-y-3">
            {data.retrospectives.map((r, i) => (
              <Rueckblick key={r.id} eintrag={r} coupleId={coupleId} offen={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Barometer({ stats }: { stats: CoupleRetrospectStats }) {
  if (stats.barometer_avg === null) {
    return (
      <p className="mt-4 rounded-brand bg-brand-bg px-4 py-3 text-sm text-brand-muted">
        Noch keine Barometer-Werte in diesem Zeitraum.
      </p>
    )
  }
  const delta = stats.barometer_delta
  const farbe = barometerColor(Math.round(stats.barometer_avg))

  return (
    <div className="mt-4 rounded-brand border border-brand-border px-4 py-3.5">
      <p className="text-[0.7rem] text-brand-muted">Barometer – Schnitt von euch beiden</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-bold tabular-nums" style={{ color: farbe }}>
          {stats.barometer_avg.toFixed(1)}
        </span>
        {delta !== null && stats.barometer_avg_before !== null && (
          <span className="text-xs text-brand-muted">
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}{' '}
            {delta === 0 ? 'unverändert' : `${Math.abs(delta).toFixed(1)} gegenüber davor`}
            {' '}({stats.barometer_avg_before.toFixed(1)})
          </span>
        )}
      </div>
      {delta === null && (
        <p className="mt-1 text-xs text-brand-muted">
          Noch kein Vergleichszeitraum – beim nächsten Mal steht hier, wohin es geht.
        </p>
      )}
    </div>
  )
}

function Kachel({ label, wert, hinweis }: { label: string; wert: number; hinweis: string }) {
  return (
    <div className="rounded-brand border border-brand-border bg-white px-3.5 py-3">
      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-navy">{wert}</p>
      <p className="text-[0.65rem] text-brand-muted">{hinweis}</p>
    </div>
  )
}

function Rueckblick({
  eintrag, coupleId, offen,
}: { eintrag: CoupleRetrospective; coupleId: string; offen: boolean }) {
  const qc = useQueryClient()
  const loeschen = useMutation({
    mutationFn: () => coupleRetrospectApi.remove(eintrag.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-retrospect', coupleId] }),
  })

  return (
    <details open={offen} className="rounded-brand border border-brand-border px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-navy">
        {new Date(eintrag.period_start).toLocaleDateString('de-DE')} –{' '}
        {new Date(eintrag.period_end).toLocaleDateString('de-DE')}
      </summary>
      <div className="mt-3 text-sm text-brand-text">
        <MarkdownMessage content={eintrag.body} />
      </div>
      <button
        onClick={() => loeschen.mutate()}
        disabled={loeschen.isPending}
        className="mt-3 text-xs text-brand-muted hover:text-navy disabled:opacity-50"
      >
        {loeschen.isPending ? 'Lösche …' : 'Diesen Rückblick verwerfen'}
      </button>
      {loeschen.isError && (
        <p className="mt-2 text-xs text-red-600">{apiErrorMessage(loeschen.error)}</p>
      )}
    </details>
  )
}
