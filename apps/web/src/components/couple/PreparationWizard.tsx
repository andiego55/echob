/**
 * Vorbereitungs-Assistent: in fünf kleinen Schritten von „ich bin sauer" zu einem Gespräch,
 * das ankommen kann.
 *
 * Am Ende steht genau das, was der Kontext-Composer sonst per Hand verlangt – nur eben
 * geführt. Freigegeben wird auch hier ausdrücklich zum Schluss, nichts läuft automatisch.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coupleSessionsApi } from '@/api/coupleSessions'
import { apiErrorMessage } from '@/api/errors'

const MOOD_EMOJI: Record<string, string> = {
  ruhig: '🌤', hoffnungsvoll: '🌱', angespannt: '⚡',
  traurig: '🌧', wuetend: '🔥', erschoepft: '🌙',
}

const STEPS = ['Stimmung', 'Wertschätzung', 'Anliegen', 'Bitte', 'Freigeben'] as const

export default function PreparationWizard({
  sessionId, onDone,
}: { sessionId: string; onDone?: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [mood, setMood] = useState('')
  const [appreciation, setAppreciation] = useState('')
  const [concern, setConcern] = useState('')
  const [request, setRequest] = useState('')
  const [coached, setCoached] = useState<string | null>(null)

  const { data: ctx } = useQuery({
    queryKey: ['couple-context', sessionId],
    queryFn: () => coupleSessionsApi.getContext(sessionId),
    enabled: !!sessionId,
  })

  const coach = useMutation({
    mutationFn: () => coupleSessionsApi.rephrase(sessionId, concern),
    onSuccess: setCoached,
  })

  const finish = useMutation({
    mutationFn: () => coupleSessionsApi.saveContext(sessionId, {
      confirmed_text: buildText(),
      mood: mood || null,
      appreciation: appreciation.trim() || null,
    }),
    onSuccess: d => {
      qc.setQueryData(['couple-context', sessionId], d)
      qc.invalidateQueries({ queryKey: ['couple-session', sessionId] })
      onDone?.()
    },
  })

  function buildText(): string {
    const parts: string[] = []
    if (concern.trim()) parts.push(coached?.split('\nGeändert:')[0].trim() || concern.trim())
    if (request.trim()) parts.push(`Meine Bitte: ${request.trim()}`)
    return parts.join('\n\n')
  }

  const moods = ctx?.moods ?? {}
  const canFinish = concern.trim().length > 0

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-navy">Vorbereitung</h2>
        <span className="text-[0.7rem] text-brand-muted">
          Schritt {step + 1} von {STEPS.length} · {STEPS[step]}
        </span>
      </div>

      <div className="mt-2 flex gap-1">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition ${i <= step ? 'bg-accent' : 'bg-brand-bg'}`} />
        ))}
      </div>

      <div className="mt-4">
        {step === 0 && (
          <div>
            <p className="text-sm font-medium text-navy">Wie kommst du gerade rein?</p>
            <p className="mt-1 text-xs text-brand-muted">
              Beide sehen es. Zu wissen, wie der andere ankommt, verhindert die Hälfte der
              Missverständnisse.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(moods).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setMood(key)}
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
        )}

        {step === 1 && (
          <div>
            <p className="text-sm font-medium text-navy">Was schätzt du an ihr oder ihm?</p>
            <p className="mt-1 text-xs text-brand-muted">
              Eine Kleinigkeit reicht. Wer sich gesehen fühlt, kann besser zuhören – deshalb
              fangen gute Gespräche hier an.
            </p>
            <textarea
              value={appreciation}
              onChange={e => setAppreciation(e.target.value)}
              rows={3}
              placeholder="z. B. „Du hast letzte Woche den Einkauf übernommen, ohne dass ich fragen musste.“"
              className="input mt-3 w-full resize-y !text-sm"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm font-medium text-navy">Worum geht es dir?</p>
            <p className="mt-1 text-xs text-brand-muted">
              Schreib es erst so, wie es dir rausrutscht. Echo hilft dir danach, es so zu
              sagen, dass es ankommt.
            </p>
            <textarea
              value={concern}
              onChange={e => { setConcern(e.target.value); setCoached(null) }}
              rows={4}
              placeholder="z. B. „Du bist nie da, wenn ich dich brauche.“"
              className="input mt-3 w-full resize-y !text-sm"
            />
            <button
              onClick={() => coach.mutate()}
              disabled={!concern.trim() || coach.isPending}
              className="btn-outline !py-1.5 !px-3.5 !text-xs mt-2 disabled:opacity-50"
            >
              {coach.isPending ? 'Echo formuliert …' : 'Als Ich-Botschaft formulieren'}
            </button>

            {coach.isError && (
              <p className="mt-2 text-xs text-red-600">{apiErrorMessage(coach.error)}</p>
            )}

            {coached && (
              <div className="mt-3 rounded-brand border border-accent/40 bg-accent/[0.05] px-3.5 py-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-accent">Vorschlag</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-brand-text">{coached}</p>
                <p className="mt-2 text-[0.68rem] text-brand-muted">
                  Nur für dich. Du kannst ihn übernehmen oder bei deinen Worten bleiben.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-sm font-medium text-navy">Was ist deine eine Bitte?</p>
            <p className="mt-1 text-xs text-brand-muted">
              Eine. Konkret und klein genug, dass sie diese Woche erfüllbar wäre.
            </p>
            <textarea
              value={request}
              onChange={e => setRequest(e.target.value)}
              rows={3}
              placeholder="z. B. „Lass uns sonntags 20 Minuten reden, bevor der Fernseher angeht.“"
              className="input mt-3 w-full resize-y !text-sm"
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="text-sm font-medium text-navy">Das geht ins Gespräch</p>
            <p className="mt-1 text-xs text-brand-muted">
              Echo bekommt genau das – und deine Partnerperson sieht es im Raum. Alles andere
              aus deinem Fall bleibt privat.
            </p>
            <div className="mt-3 space-y-2 rounded-brand border border-brand-border px-3.5 py-3">
              {mood && (
                <p className="text-xs text-brand-muted">
                  Stimmung: {MOOD_EMOJI[mood]} {moods[mood]}
                </p>
              )}
              {appreciation.trim() && (
                <p className="text-xs text-brand-muted">Wertschätzung: {appreciation.trim()}</p>
              )}
              <p className="whitespace-pre-wrap text-sm text-brand-text">
                {buildText() || 'Noch nichts geschrieben.'}
              </p>
            </div>
            <button
              onClick={() => finish.mutate()}
              disabled={!canFinish || finish.isPending}
              className="btn-primary !py-2 !px-5 !text-sm mt-3 disabled:opacity-50"
            >
              {finish.isPending ? 'Gebe frei …' : 'Für die Sitzung freigeben'}
            </button>
            {finish.isError && (
              <p className="mt-2 text-xs text-red-600">{apiErrorMessage(finish.error)}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-brand-border pt-3">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-xs text-brand-muted hover:text-navy disabled:opacity-40"
        >
          ← Zurück
        </button>
        {step < STEPS.length - 1 && (
          <button
            onClick={() => setStep(s => s + 1)}
            className="text-xs font-medium text-accent hover:underline"
          >
            {step === 0 && !mood ? 'Überspringen' : 'Weiter'} →
          </button>
        )}
      </div>
    </div>
  )
}
