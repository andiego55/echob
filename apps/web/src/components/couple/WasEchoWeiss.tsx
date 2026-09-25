/**
 * „Was Echo weiß" — und wie man es wieder zurücknimmt.
 *
 * **Warum das eine eigene Datei ist.** Der Block stand mitten in der 900-Zeilen-Seite der
 * Sitzung und konnte nur eines: anzeigen. Es gab keinen Weg zurück. Wer sich verschrieben
 * hatte, zu viel geschrieben hatte oder es sich anders überlegte, sah seinen Beitrag dort
 * stehen — für die Partnerperson lesbar, für Echo verwendbar — und hatte keinen Knopf.
 *
 * **Zurückziehen heißt hier „soll gerade nicht gelten", nicht „war nichts".** Der Text
 * wandert zurück in den eigenen Entwurf und lässt sich erneut freigeben; genauso macht es
 * der Paarraum schon mit einem zurückgenommenen Gesprächsvorschlag.
 *
 * **Was es nicht kann, und das steht auch dabei.** Hat Echo schon geantwortet, ist das
 * gesagt. Ein Knopf, der so täte, als ließe sich das einsammeln, wäre eine Zusage, die
 * niemand halten kann.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { coupleSessionsApi, type CoupleSharedContext } from '@/api/coupleSessions'
import { MOOD_EMOJI } from './moods'
import Fehlermeldung from '@/components/Fehlermeldung'
import { useBestaetigen } from '@/components/Bestaetigung'

export default function WasEchoWeiss({
  sessionId, contexts, ownUserId, moods, echoHatGeantwortet,
}: {
  sessionId: string
  contexts: CoupleSharedContext[]
  /** Wessen Beitrag sich zurückziehen lässt — nur der eigene. */
  ownUserId?: string
  /** Die Beschriftungen der Stimmungen, wie der Server sie kennt. */
  moods: Record<string, string>
  /** Steht schon etwas im Verlauf? Dann sagt der Hinweis, was Zurückziehen (nicht) tut. */
  echoHatGeantwortet: boolean
}) {
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()

  const zurueckziehen = useMutation({
    mutationFn: () => coupleSessionsApi.withdrawContext(sessionId),
    onSuccess: ctx => {
      qc.setQueryData(['couple-context', sessionId], ctx)
      qc.invalidateQueries({ queryKey: ['couple-session', sessionId] })
    },
  })

  return (
    <div className="card">
      <h2 className="card-title">Was Echo weiß</h2>
      {contexts.length === 0 ? (
        <p className="mt-2 text-sm text-brand-muted">
          Noch nichts. Echo kennt nur, was ihr hier ausdrücklich freigebt.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {contexts.map(c => {
            const eigen = !!ownUserId && c.user_id === ownUserId
            return (
              <div key={c.user_id} className="rounded-brand border border-brand-border px-3.5 py-3">
                <p className="text-xs font-semibold text-navy">
                  {eigen ? 'Von dir' : `Von ${c.name}`}
                </p>
                {c.mood && (
                  <p className="mt-0.5 text-[0.7rem] text-brand-muted">
                    Kommt {MOOD_EMOJI[c.mood] ?? ''} {moods[c.mood] ?? c.mood} herein
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-sm text-brand-muted">{c.text}</p>
                {c.appreciation && (
                  <p className="mt-2 rounded-brand bg-accent/[0.06] px-2.5 py-1.5 text-xs text-brand-text">
                    <span className="font-medium text-navy">
                      {eigen ? 'Du schätzt:' : 'Schätzt an dir:'}
                    </span>{' '}
                    {c.appreciation}
                  </p>
                )}

                {/* Nur am eigenen Beitrag. Den der anderen Person anzufassen waere nicht
                    „zurueckziehen", sondern loeschen — das gehoert niemandem hier. */}
                {eigen && (
                  <button
                    onClick={async () => {
                      const ok = await bestaetigen({
                        titel: 'Deinen Beitrag zurückziehen?',
                        text: echoHatGeantwortet
                          ? 'Er verschwindet aus dem Raum und aus Echos Wissen, und dein Text '
                            + 'wandert zurück in deinen Entwurf. Was Echo schon geantwortet '
                            + 'hat, bleibt im Verlauf stehen.'
                          : 'Er verschwindet aus dem Raum und aus Echos Wissen. Dein Text '
                            + 'wandert zurück in deinen Entwurf — du kannst ihn ändern und '
                            + 'neu freigeben.',
                        knopf: 'Zurückziehen',
                      })
                      if (ok) zurueckziehen.mutate()
                    }}
                    disabled={zurueckziehen.isPending}
                    className="mt-2.5 text-[0.7rem] text-brand-muted hover:text-navy disabled:opacity-50"
                  >
                    {zurueckziehen.isPending ? 'Ziehe zurück …' : 'Zurückziehen'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <Fehlermeldung error={zurueckziehen.error} />
    </div>
  )
}
