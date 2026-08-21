/**
 * Offene Fragen – der leichteste Zug im Paarraum.
 *
 * **Warum es das gibt.** Echo konnte man alles fragen, die andere Person fast nichts. Für
 * sie gab es nur schwere Wege (eine moderierte Sitzung, eine Mediation), enge (den festen
 * Wochen-Check-in) oder einseitige (die Wertschätzungswand). Für „Warum war dir der Abend
 * bei deinen Eltern so wichtig?" gab es keinen Ort.
 *
 * **Eine Frage, eine Antwort.** Ein Faden daraus zu machen wäre leicht und wäre falsch:
 * Unmoderiertes Hin und Her zwischen zwei Menschen, die gerade streiten, spitzt zu statt zu
 * klären. Deshalb endet jede Frage nach einer Antwort – und darunter steht der Weg, daraus
 * ein Gespräch zu machen, wenn es eines braucht.
 *
 * **Warum Anstöße.** Die häufigste Antwort auf ein leeres Feld ist ein leeres Feld. Der
 * Würfel legt eine Frage hinein, die man ändern kann – das ist niedriger als selbst anfangen.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coupleQuestionsApi } from '@/api/coupleQuestions'
import type { CoupleQuestion } from '@/api/coupleQuestions'
import { apiErrorMessage } from '@/api/errors'
import { CardSkeleton } from '@/components/Skeleton'
import Weiterfuehren from './Weiterfuehren'
import Fehlermeldung from '@/components/Fehlermeldung'

export default function QuestionsBoard({ coupleId }: { coupleId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['couple-questions', coupleId],
    queryFn: () => coupleQuestionsApi.list(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  if (isLoading) return <CardSkeleton />
  if (isError || !data) {
    return (
      <div className="card border-l-4 border-l-red-400">
        <p className="text-sm text-brand-muted">{apiErrorMessage(error)}</p>
      </div>
    )
  }

  const anMich = data.questions.filter(f => f.waiting_for_me)
  const vonMir = data.questions.filter(f => f.is_mine && f.status === 'open')
  const beantwortet = data.questions.filter(f => f.status === 'answered')
  const letzte = beantwortet[0]

  return (
    <div className="space-y-5">
      <Fragen coupleId={coupleId} prompts={data.prompts} />

      {anMich.length > 0 && (
        <div>
          <p className="section-label">Wartet auf dich</p>
          <div className="mt-2 space-y-3">
            {anMich.map(f => <AntwortZeile key={f.id} frage={f} coupleId={coupleId} />)}
          </div>
        </div>
      )}

      {vonMir.length > 0 && (
        <div>
          <p className="section-label">Von dir gefragt</p>
          <div className="mt-2 space-y-2">
            {vonMir.map(f => <EigeneZeile key={f.id} frage={f} coupleId={coupleId} />)}
          </div>
        </div>
      )}

      {beantwortet.length > 0 ? (
        <div>
          <p className="section-label">Beantwortet</p>
          <p className="mt-1 text-xs text-brand-muted">
            Bleibt stehen. Manche Antworten liest man ein Jahr später noch einmal anders.
          </p>
          <div className="mt-2.5 space-y-3">
            {beantwortet.map(f => <PaarZeile key={f.id} frage={f} />)}
          </div>
        </div>
      ) : anMich.length === 0 && vonMir.length === 0 ? (
        <div className="card card-static text-center">
          <p className="text-sm leading-relaxed text-brand-muted">
            Noch keine Frage unterwegs. Das hier ist der leichteste Weg zueinander im ganzen
            Raum: kein Termin, keine Moderation, keine Zusage. Eine Frage dalassen – die
            Antwort kommt, wenn sie kommt.
          </p>
        </div>
      ) : null}

      {/* Aus einer Antwort wird oft ein Gespräch. Nur bei der jüngsten, sonst hängt unter
          jeder alten Antwort ein Aufruf zum Handeln. */}
      {letzte?.answer && (
        <Weiterfuehren
          coupleId={coupleId}
          saat={letzte.answer}
          titel="Weiter darüber reden?"
          hinweis="Manche Antwort ist ein Anfang und kein Schlusspunkt."
          zuege={['gespraech', 'thema', 'abmachung']}
        />
      )}
    </div>
  )
}

/** Das Eingabefeld samt Würfel. */
function Fragen({ coupleId, prompts }: { coupleId: string; prompts: string[] }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [anstoss, setAnstoss] = useState(() => Math.floor(Math.random() * Math.max(prompts.length, 1)))

  const fragen = useMutation({
    mutationFn: () => coupleQuestionsApi.ask(coupleId, text.trim()),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['couple-questions', coupleId] })
      qc.invalidateQueries({ queryKey: ['couple-dashboard', coupleId] })
    },
  })

  return (
    <div className="card">
      <h2 className="card-title">Etwas fragen</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Eine Frage, eine Antwort. Sie wartet, bis die andere Person Zeit und Ruhe hat.
      </p>

      <form
        onSubmit={e => { e.preventDefault(); if (text.trim()) fragen.mutate() }}
        className="mt-3"
      >
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          maxLength={800}
          placeholder={prompts[anstoss % Math.max(prompts.length, 1)] ?? 'Was möchtest du wissen?'}
          className="input w-full resize-y !text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!text.trim() || fragen.isPending}
            className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-50"
          >
            {fragen.isPending ? 'Lege ab …' : 'Frage dalassen'}
          </button>
          {prompts.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setText(prompts[anstoss % prompts.length])}
                className="btn-quiet !py-1.5 !px-3.5 !text-xs"
              >
                Vorschlag übernehmen
              </button>
              <button
                type="button"
                onClick={() => setAnstoss(a => a + 1)}
                className="text-xs text-accent hover:underline"
              >
                Anderer Vorschlag
              </button>
            </>
          )}
        </div>
        <Fehlermeldung error={fragen.error} />
      </form>
    </div>
  )
}

/** Eine Frage an mich – mit dem Antwortfeld gleich darunter. */
function AntwortZeile({ frage, coupleId }: { frage: CoupleQuestion; coupleId: string }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')

  const antworten = useMutation({
    mutationFn: () => coupleQuestionsApi.answer(frage.id, text.trim()),
    onSuccess: () => {
      for (const key of [
        ['couple-questions', coupleId],
        ['couple-dashboard', coupleId],
        ['couple-progress', coupleId],
      ]) qc.invalidateQueries({ queryKey: key })
    },
  })

  return (
    <div className="card border-l-4 border-l-accent">
      <p className="text-[0.7rem] text-brand-muted">{frage.asked_by_name} fragt</p>
      <p className="mt-1 text-base font-semibold leading-snug text-navy">{frage.question}</p>
      <form
        onSubmit={e => { e.preventDefault(); if (text.trim()) antworten.mutate() }}
        className="mt-3"
      >
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          maxLength={800}
          placeholder="Antworte so ehrlich, wie es dir heute möglich ist."
          className="input w-full resize-y !text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!text.trim() || antworten.isPending}
            className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-50"
          >
            {antworten.isPending ? 'Sende …' : 'Antworten'}
          </button>
          <p className="text-[0.7rem] text-brand-muted">
            Danach steht beides nebeneinander – für euch beide.
          </p>
        </div>
        <Fehlermeldung error={antworten.error} />
      </form>
    </div>
  )
}

/** Eine eigene, noch offene Frage. */
function EigeneZeile({ frage, coupleId }: { frage: CoupleQuestion; coupleId: string }) {
  const qc = useQueryClient()
  const zurueck = useMutation({
    mutationFn: () => coupleQuestionsApi.withdraw(frage.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-questions', coupleId] })
      qc.invalidateQueries({ queryKey: ['couple-dashboard', coupleId] })
    },
  })

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-brand border border-dashed border-brand-border px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-sm leading-snug text-brand-text">{frage.question}</p>
        <p className="mt-0.5 text-[0.7rem] text-brand-muted">
          Wartet seit {new Date(frage.created_at).toLocaleDateString('de-DE')}.
        </p>
      </div>
      <button
        onClick={() => zurueck.mutate()}
        disabled={zurueck.isPending}
        className="shrink-0 text-xs text-brand-muted hover:text-navy disabled:opacity-50"
      >
        Zurückziehen
      </button>
    </div>
  )
}

/** Frage und Antwort nebeneinander – das Gedächtnis des Raums. */
function PaarZeile({ frage }: { frage: CoupleQuestion }) {
  return (
    <div className="rounded-brand border border-brand-border px-4 py-3.5">
      <p className="text-[0.65rem] text-brand-muted">
        {frage.is_mine ? 'Du hast gefragt' : `${frage.asked_by_name} hat gefragt`}
        {frage.answered_at && ` · beantwortet am ${new Date(frage.answered_at).toLocaleDateString('de-DE')}`}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-navy">{frage.question}</p>
      <p className="mt-2 whitespace-pre-wrap border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-brand-text">
        {frage.answer}
      </p>
    </div>
  )
}
