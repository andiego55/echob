/**
 * Das Stimmungsbarometer – der niedrigschwelligste Anlass im ganzen Modul.
 *
 * Ein Regler von 1 bis 10, den jede Person für sich stellt und die andere immer sieht.
 * Kein Formular, kein Termin, zwei Sekunden.
 *
 * **Zustand, kein Urteil.** Die Frage lautet, wie es *dir gerade mit euch* geht – nicht,
 * wie gut die andere Person ihre Sache macht. Deshalb steht neben jeder Zahl ein Wort
 * („angespannt", „nah") statt einer Note, und deshalb gibt es die Notiz: Sie verhindert,
 * dass eine niedrige Zahl als stummer Vorwurf im Raum steht.
 *
 * Der Regler schickt erst beim Loslassen – während des Schiebens soll nichts passieren.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import { coupleBarometerApi } from '@/api/coupleRhythm'
import type { CoupleBarometerEntry } from '@/api/coupleRhythm'
import { apiErrorMessage } from '@/api/errors'
import EchoBarometer, { BarometerSparkline, barometerColor } from './EchoBarometer'

export default function BarometerCard({
  coupleId, ownAvatar, partnerAvatar,
}: { coupleId: string; ownAvatar?: string | null; partnerAvatar?: string | null }) {
  const qc = useQueryClient()
  const [wert, setWert] = useState<number | null>(null)
  const [notiz, setNotiz] = useState('')
  const [notizOffen, setNotizOffen] = useState(false)

  const { data } = useQuery({
    queryKey: ['couple-barometer', coupleId],
    queryFn: () => coupleBarometerApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
    refetchInterval: 60000,
  })

  const eigen = data?.entries.find(e => e.is_own)
  const fremd = data?.entries.find(e => !e.is_own)

  // Serverstand übernehmen, solange man nicht selbst am Regler ist.
  useEffect(() => {
    if (eigen && wert === null) setWert(eigen.value ?? 6)
  }, [eigen, wert])

  const speichern = useMutation({
    mutationFn: (v: number) => coupleBarometerApi.set(coupleId, v, notiz.trim() || null),
    onSuccess: d => {
      qc.setQueryData(['couple-barometer', coupleId], d)
      qc.invalidateQueries({ queryKey: ['couple-dashboard', coupleId] })
      setNotizOffen(false)
    },
  })

  if (!data || wert === null) return null

  const wortDazu = data.levels[String(wert)] ?? ''
  const veraendert = wert !== (eigen?.value ?? null)

  return (
    <div className="card card-hero card-static">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="card-title-lg">Wie nah fühlt es sich gerade an?</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Kein Zeugnis füreinander – nur, wie es dir mit euch geht. Beide sehen es immer.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* ── Dein Regler ───────────────────────────────────────────── */}
        <div className="rounded-brand border border-brand-border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Avatar value={ownAvatar} size="sm" />
            <p className="text-sm font-semibold text-navy">Du</p>
            <span
              className="ml-auto text-lg font-bold tabular-nums"
              style={{ color: barometerColor(wert) }}
            >
              {wert}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-center">
            <EchoBarometer value={wert} size={128} />
          </div>
          <p className="text-center text-xs font-medium" style={{ color: barometerColor(wert) }}>
            {wortDazu}
          </p>

          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={wert}
            onChange={e => setWert(Number(e.target.value))}
            onPointerUp={() => veraendert && speichern.mutate(wert)}
            onKeyUp={() => veraendert && speichern.mutate(wert)}
            aria-label="Dein Stimmungsbarometer von 1 bis 10"
            className="mt-3 w-full cursor-pointer"
            style={{ accentColor: barometerColor(wert) }}
          />
          <div className="flex justify-between text-[0.62rem] text-brand-muted">
            <span>weit weg</span>
            <span>sehr verbunden</span>
          </div>

          {/* Die Notiz ist wichtiger, als sie aussieht – sie macht aus einer Zahl
              etwas Besprechbares. */}
          {notizOffen ? (
            <div className="mt-3">
              <input
                value={notiz}
                onChange={e => setNotiz(e.target.value)}
                maxLength={data.note_max_chars}
                placeholder="Woran liegt es gerade? (optional)"
                className="input !text-xs"
                autoFocus
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => speichern.mutate(wert)}
                  disabled={speichern.isPending}
                  className="btn-primary !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
                >
                  {speichern.isPending ? 'Speichere …' : 'Speichern'}
                </button>
                <button
                  onClick={() => { setNotiz(''); setNotizOffen(false) }}
                  className="text-xs text-brand-muted hover:text-navy"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNotizOffen(true)}
              className="mt-2.5 text-xs text-accent hover:underline"
            >
              + Ein Satz dazu
            </button>
          )}

          {eigen?.note && !notizOffen && (
            <p className="mt-2 text-xs italic text-brand-muted">„{eigen.note}"</p>
          )}
          {speichern.isError && (
            <p className="mt-2 text-xs text-red-600">{apiErrorMessage(speichern.error)}</p>
          )}
        </div>

        {/* ── Ihr Regler ────────────────────────────────────────────── */}
        <PartnerSeite entry={fremd} avatar={partnerAvatar} />
      </div>

      {data.own_history.length > 1 && (
        <div className="mt-4 border-t border-brand-border pt-3">
          <p className="text-[0.7rem] text-brand-muted">Dein Verlauf</p>
          <div className="mt-1.5">
            <BarometerSparkline points={data.own_history} />
          </div>
        </div>
      )}
    </div>
  )
}

function PartnerSeite({
  entry, avatar,
}: { entry?: CoupleBarometerEntry; avatar?: string | null }) {
  if (!entry) return null

  return (
    <div className="rounded-brand border border-brand-border px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Avatar value={avatar} size="sm" />
        <p className="min-w-0 truncate text-sm font-semibold text-navy">{entry.name}</p>
        {entry.value !== null && (
          <span
            className="ml-auto text-lg font-bold tabular-nums"
            style={{ color: barometerColor(entry.value) }}
          >
            {entry.value}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center">
        <EchoBarometer value={entry.value} size={128} />
      </div>

      {entry.value === null ? (
        <p className="mt-1 text-center text-xs text-brand-muted">
          Noch nicht gestellt.
        </p>
      ) : (
        <>
          <p
            className="text-center text-xs font-medium"
            style={{ color: barometerColor(entry.value) }}
          >
            {entry.label}
          </p>
          {entry.note && (
            <p className="mt-2.5 text-xs italic text-brand-text">„{entry.note}"</p>
          )}
          {entry.updated_at && (
            <p className="mt-2 text-[0.62rem] text-brand-muted">
              zuletzt {new Date(entry.updated_at).toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit',
              })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
