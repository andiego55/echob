/**
 * Der wöchentliche Check-in – fünf Minuten, drei Fragen, jede Woche.
 *
 * Alles andere im Paarraum braucht einen Anlass. Das hier ist der Gegenentwurf: ein
 * kleiner fester Termin, der auch dann trägt, wenn gerade nichts brennt.
 *
 * Reihenfolge wie überall im Modul – erst schreiben, dann die Antwort der anderen Person
 * sehen. Nicht als Prüfung, sondern damit die eigene Sicht die eigene bleibt.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import { coupleRhythmApi } from '@/api/coupleRhythm'
import type { CoupleCheckinEntry, CoupleCheckinWeek } from '@/api/coupleRhythm'
import { apiErrorMessage } from '@/api/errors'
import { MOOD_EMOJI } from './moods'
import Weiterfuehren from './Weiterfuehren'

function wochenLabel(iso: string): string {
  const start = new Date(iso)
  const ende = new Date(start)
  ende.setDate(ende.getDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  return `${f(start)} – ${f(ende)}`
}

export default function WeeklyCheckinCard({
  coupleId, ownAvatar, partnerAvatar,
}: { coupleId: string; ownAvatar?: string | null; partnerAvatar?: string | null }) {
  const qc = useQueryClient()
  const [mood, setMood] = useState<string | null>(null)
  const [highlight, setHighlight] = useState('')
  const [wish, setWish] = useState('')
  const [offen, setOffen] = useState(false)

  const { data } = useQuery({
    queryKey: ['couple-checkin', coupleId],
    queryFn: () => coupleRhythmApi.getCheckin(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const { data: verlauf = [] } = useQuery({
    queryKey: ['couple-checkin-history', coupleId],
    queryFn: () => coupleRhythmApi.history(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const save = useMutation({
    mutationFn: () => coupleRhythmApi.saveCheckin(coupleId, {
      mood, highlight: highlight.trim() || null, wish: wish.trim() || null,
    }),
    onSuccess: (d: CoupleCheckinWeek) => {
      qc.setQueryData(['couple-checkin', coupleId], d)
      qc.invalidateQueries({ queryKey: ['couple-checkin-history', coupleId] })
      qc.invalidateQueries({ queryKey: ['couple-dashboard', coupleId] })
      setOffen(false)
    },
  })

  if (!data) return null

  const fragen = data.questions
  const eigen = data.entries.find(e => e.is_own)
  const fremd = data.entries.find(e => !e.is_own)
  const kannSpeichern = !!mood || !!highlight.trim() || !!wish.trim()
  const formularZeigen = !data.own_done || offen

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy">Euer Wochen-Check-in</h2>
          <p className="mt-1 text-xs text-brand-muted">
            {wochenLabel(data.week_start)} · drei Fragen, fünf Minuten
          </p>
        </div>
        {data.own_done && !offen && (
          <button onClick={() => setOffen(true)} className="shrink-0 text-xs text-accent hover:underline">
            Antwort ergänzen
          </button>
        )}
      </div>

      {/* ── Die drei Fragen ───────────────────────────────────────── */}
      {formularZeigen && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-navy">{fragen.mood}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(data.moods).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setMood(m => (m === key ? null : key))}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    mood === key
                      ? 'border-accent bg-accent/10 font-medium text-accent'
                      : 'border-brand-border text-brand-muted hover:border-accent/40'
                  }`}
                >
                  <span className="mr-1">{MOOD_EMOJI[key] ?? '•'}</span>{label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-navy">{fragen.highlight}</label>
            <textarea
              value={highlight}
              onChange={e => setHighlight(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="Ein Moment, der dir geblieben ist."
              className="input mt-1.5 w-full resize-y !text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-navy">{fragen.wish}</label>
            <textarea
              value={wish}
              onChange={e => setWish(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="Klein und konkret – daraus wird leichter eine Abmachung."
              className="input mt-1.5 w-full resize-y !text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => save.mutate()}
              disabled={!kannSpeichern || save.isPending}
              className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
            >
              {save.isPending ? 'Speichere …' : 'Check-in abgeben'}
            </button>
            {offen && (
              <button onClick={() => setOffen(false)} className="text-xs text-brand-muted hover:text-navy">
                Abbrechen
              </button>
            )}
          </div>
          {save.isError && <p className="text-sm text-red-600">{apiErrorMessage(save.error)}</p>}
        </div>
      )}

      {/* ── Nebeneinander, sobald du dran warst ───────────────────── */}
      {data.own_done && !offen && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Antwort entry={eigen} avatar={ownAvatar} />
          <Antwort entry={fremd} avatar={partnerAvatar} />
        </div>
      )}

      {/* Der Satz "aus einem Wunsch wird schnell eine Abmachung" stand hier lange als
          blosse Behauptung. Jetzt steht der Weg dazu daneben - mit dem eigenen Wunsch
          bereits im Feld, damit aus zwei Zeilen kein neues Formular wird. */}
      {data.own_done && !offen && data.both_done && (
        <div className="mt-4">
          <Weiterfuehren
            coupleId={coupleId}
            abmachungSaat={eigen?.wish ?? ''}
            saat={[eigen?.wish, fremd?.wish].filter(Boolean).join(' ')}
            titel="Aus einem Wunsch wird eine Abmachung"
            hinweis="Ein Wunsch, den niemand aufschreibt, ist nächste Woche wieder derselbe."
          />
        </div>
      )}

      {/* ── Zeitstrahl: dass ihr drangeblieben seid ───────────────── */}
      {verlauf.length > 1 && (
        <div className="mt-4 border-t border-brand-border pt-3">
          <p className="text-[0.7rem] text-brand-muted">Die letzten Wochen</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {[...verlauf].reverse().map(w => (
              <div key={w.week_start} className="text-center">
                <div className="flex gap-0.5">
                  {w.moods.map(m => (
                    <span key={m.user_id} className="text-sm" title={`${m.name}: ${m.mood ?? '–'}`}>
                      {m.mood ? MOOD_EMOJI[m.mood] ?? '•' : '·'}
                    </span>
                  ))}
                </div>
                <p className="mt-0.5 text-[0.6rem] text-brand-muted">
                  {new Date(w.week_start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Antwort({ entry, avatar }: { entry?: CoupleCheckinEntry; avatar?: string | null }) {
  if (!entry) return null

  return (
    <div className="rounded-brand border border-brand-border px-3.5 py-3">
      <div className="flex items-center gap-2">
        <Avatar value={avatar} size="sm" />
        <p className="min-w-0 truncate text-sm font-semibold text-navy">
          {entry.is_own ? 'Du' : entry.name}
        </p>
        {entry.mood && entry.visible && (
          <span className="ml-auto text-base" aria-hidden>{MOOD_EMOJI[entry.mood] ?? '•'}</span>
        )}
      </div>

      {!entry.done ? (
        <p className="mt-2 text-xs text-brand-muted">Noch nicht ausgefüllt.</p>
      ) : !entry.visible ? (
        <p className="mt-2 text-xs text-brand-muted">
          Ausgefüllt – sichtbar, sobald du selbst geantwortet hast.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {entry.highlight && (
            <p className="whitespace-pre-wrap text-sm text-brand-text">{entry.highlight}</p>
          )}
          {entry.wish && (
            <p className="whitespace-pre-wrap text-sm text-brand-text">
              <span className="text-xs font-semibold text-accent">Wunsch: </span>
              {entry.wish}
            </p>
          )}
          {!entry.highlight && !entry.wish && (
            <p className="text-xs text-brand-muted">Nur die Stimmung – auch das ist eine Antwort.</p>
          )}
        </div>
      )}
    </div>
  )
}
