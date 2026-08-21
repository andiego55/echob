/**
 * Impulse – kleine Übungen, die beide getrennt beantworten und danach nebeneinander sehen.
 *
 * **Wofür.** Alles andere im Paarraum braucht einen Anlass: ein Thema, einen Streit, eine
 * fällige Abmachung. Der Check-in ist die Ausnahme, stellt aber jede Woche dieselben drei
 * Fragen. Wer den Raum öffnete, ohne dass gerade etwas brannte, fand also Arbeit oder
 * Wiederholung – nie etwas Neues. Genau daran schläft ein Werkzeug ein.
 *
 * **Die Mechanik ist geliehen** – erst schreiben, dann sehen, wie beim Check-in. Und aus
 * demselben Grund: Wer zuerst die Antwort der anderen Person liest, schreibt nicht mehr
 * seine eigene, sondern eine Reaktion darauf. Neu ist nur, dass die Frage wechselt.
 *
 * **Der Fortschrittsbalken ist Absicht.** Nicht als Punktejagd – er zeigt einen Weg, den
 * man begonnen hat, und das ist der stärkste Grund wiederzukommen. Deshalb zählt er Paare,
 * nie Personen: Es gibt hier nichts zu gewinnen und niemanden zu schlagen.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import { coupleImpulsesApi } from '@/api/coupleImpulses'
import type { CoupleImpulse } from '@/api/coupleImpulses'
import { apiErrorMessage } from '@/api/errors'
import { CardSkeleton } from './Skeleton'
import Weiterfuehren from './Weiterfuehren'
import { useCoupleFaces } from './useCoupleFaces'

export default function ImpulseBoard({ coupleId }: { coupleId: string }) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['couple-impulses', coupleId],
    queryFn: () => coupleImpulsesApi.list(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  if (isLoading) return <CardSkeleton label="Impulse werden geladen" />
  if (isError || !data) {
    return (
      <div className="card border-l-4 border-l-red-400">
        <p className="text-sm text-brand-muted">{apiErrorMessage(error)}</p>
      </div>
    )
  }

  const aktiv = data.impulses.find(i => i.slug === (gewaehlt ?? data.suggested))
    ?? data.impulses[0]

  // Nach Gruppen, Reihenfolge aus dem Katalog – leicht vorn, fordernd hinten.
  const gruppen: { name: string; eintraege: CoupleImpulse[] }[] = []
  for (const i of data.impulses) {
    const letzte = gruppen[gruppen.length - 1]
    if (letzte && letzte.name === i.group) letzte.eintraege.push(i)
    else gruppen.push({ name: i.group, eintraege: [i] })
  }

  const anteil = data.total > 0 ? Math.round((data.done_count / data.total) * 100) : 0

  return (
    <div className="space-y-5">
      {/* ── Wo ihr steht ────────────────────────────────────────────── */}
      <div className="card card-hero card-static">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="card-title-lg">Impulse</h2>
          <p className="text-xs text-brand-muted">
            {data.done_count === 0
              ? `${data.total} Übungen, fünf bis fünfzehn Minuten`
              : `${data.done_count} von ${data.total} gemeinsam gemacht`}
          </p>
        </div>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-brand-text">
          Eine Frage, die ihr getrennt beantwortet – danach seht ihr beide Antworten
          nebeneinander. Kein Richtig, kein Falsch, keine Auswertung. Am interessantesten ist
          fast immer die Stelle, an der ihr auseinandergeht.
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-brand-border">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${Math.max(anteil, data.done_count > 0 ? 4 : 0)}%` }}
          />
        </div>
      </div>

      {/* ── Der aktuelle Impuls ─────────────────────────────────────── */}
      {aktiv && <ImpulsKarte key={aktiv.slug} coupleId={coupleId} impuls={aktiv} />}

      {/* ── Der Katalog ─────────────────────────────────────────────── */}
      <div>
        <p className="section-label">Alle Impulse</p>
        <div className="mt-2 space-y-4">
          {gruppen.map(g => (
            <div key={g.name}>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-muted">
                {g.name}
              </p>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {g.eintraege.map(i => (
                  <button
                    key={i.slug}
                    onClick={() => setGewaehlt(i.slug)}
                    className={`rounded-brand border px-3.5 py-2.5 text-left transition ${
                      i.slug === aktiv?.slug
                        ? 'border-accent bg-accent/[0.05]'
                        : 'border-brand-border bg-white hover:border-accent/50'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-navy">{i.title}</span>
                      {i.both_done ? (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[0.6rem] font-semibold text-green-800">
                          gemacht
                        </span>
                      ) : i.own_done ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.6rem] font-semibold text-amber-800">
                          wartet
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[0.7rem] text-brand-muted">{i.duration}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Ein Impuls: Frage, Warum, Antwortfeld – und nach beiden Antworten der Vergleich. */
function ImpulsKarte({ coupleId, impuls }: { coupleId: string; impuls: CoupleImpulse }) {
  const qc = useQueryClient()
  const gesichter = useCoupleFaces(coupleId)
  const eigen = impuls.entries.find(e => e.is_own)
  const [text, setText] = useState(eigen?.answer ?? '')
  const [aendern, setAendern] = useState(false)

  const speichern = useMutation({
    mutationFn: () => coupleImpulsesApi.answer(coupleId, impuls.slug, text.trim()),
    onSuccess: () => {
      setAendern(false)
      for (const key of [
        ['couple-impulses', coupleId],
        ['couple-dashboard', coupleId],
        ['couple-progress', coupleId],
      ]) qc.invalidateQueries({ queryKey: key })
    },
  })

  const schreiben = !impuls.own_done || aendern

  return (
    <div className="card border-l-4 border-l-accent">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="card-title">{impuls.title}</h2>
        <p className="text-xs text-brand-muted">{impuls.duration}</p>
      </div>

      <p className="mt-2.5 text-base font-semibold leading-snug text-navy">{impuls.question}</p>
      <p className="mt-2 max-w-[62ch] text-xs leading-relaxed text-brand-muted">
        <span className="font-semibold text-navy">Warum diese Frage: </span>{impuls.why}
      </p>

      {schreiben ? (
        <form
          onSubmit={e => { e.preventDefault(); if (text.trim()) speichern.mutate() }}
          className="mt-4"
        >
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            maxLength={1200}
            placeholder="Schreib, was dir dazu einfällt – ungeordnet ist völlig in Ordnung."
            className="input w-full resize-y !text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!text.trim() || speichern.isPending}
              className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-50"
            >
              {speichern.isPending ? 'Speichere …' : impuls.own_done ? 'Antwort ändern' : 'Antwort abgeben'}
            </button>
            {aendern && (
              <button type="button" onClick={() => setAendern(false)}
                className="text-xs text-brand-muted hover:text-navy">
                Abbrechen
              </button>
            )}
            <p className="text-[0.7rem] text-brand-muted">
              {impuls.entries.some(e => !e.is_own && e.done)
                ? 'Die andere Antwort liegt schon vor – du siehst sie, sobald du abgegeben hast.'
                : 'Erst schreiben, dann sehen. So bleibt deine Sicht deine.'}
            </p>
          </div>
          {speichern.isError && (
            <p className="mt-2 text-xs text-red-600">{apiErrorMessage(speichern.error)}</p>
          )}
        </form>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {impuls.entries.map(e => (
              <div
                key={e.user_id}
                className={`rounded-brand border px-3.5 py-3 ${
                  e.is_own ? 'border-brand-border bg-brand-bg' : 'border-accent/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar value={gesichter.faceFor(e.user_id).avatar} size="sm" />
                  <p className="text-xs font-semibold text-navy">{e.is_own ? 'Du' : e.name}</p>
                </div>
                {e.answer ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-text">
                    {e.answer}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-brand-muted">
                    Hat noch nicht geantwortet. Kein Druck – der Impuls bleibt stehen.
                  </p>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setAendern(true)} className="mt-3 text-xs text-accent hover:underline">
            Meine Antwort ändern
          </button>
        </>
      )}

      {/* Zwei Antworten nebeneinander sind interessant. Etwas daraus zu machen ist der Punkt. */}
      {impuls.both_done && (
        <div className="mt-5">
          <Weiterfuehren
            coupleId={coupleId}
            saat={impuls.question}
            titel="Und daraus?"
            hinweis="Die spannendste Stelle ist die, an der eure Antworten auseinandergehen."
            zuege={['gespraech', 'abmachung', 'thema']}
          />
        </div>
      )}
    </div>
  )
}
