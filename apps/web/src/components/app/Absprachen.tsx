/**
 * Die Absprache — dasselbe Bauteil für beide Seiten.
 *
 * **Warum eine Komponente und nicht zwei.** Klient:in und Fachperson sehen hier dasselbe:
 * denselben Text, denselben Stand, dieselben zwei Haken. Zwei Fassungen hätten irgendwann
 * zwei Vorstellungen davon, wann eine Absprache gilt — und dann liest jede Seite etwas
 * anderes über eine Verabredung, die sie gemeinsam getroffen haben. Genau das darf hier
 * nicht passieren.
 *
 * Unterschiedlich ist nur, welche Anschrift die Aufrufe haben und als welche Seite man
 * handelt. Beides kommt von außen herein.
 *
 * **Was der Stand sagen muss, und zwar in einem Blick:** Gilt sie? Und wenn nicht — wer
 * fehlt? „Wartet auf dich" und „Wartet auf die andere Seite" sind zwei völlig
 * verschiedene Auskünfte, und die zweite ist die, bei der man nichts tun kann.
 *
 * **Kein Vertrag.** Das steht unter der Liste, nicht im Kleingedruckten: Eine
 * Selbstverpflichtung, die niemand einklagen kann und die keine Behandlung ersetzt.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { apiErrorMessage } from '@/api/errors'
import Fehlermeldung from '@/components/Fehlermeldung'
import { useBestaetigen } from '@/components/Bestaetigung'

export type Seite = 'klient' | 'fachperson'

interface Absprache {
  id: string
  text: string
  vorgeschlagen_von: Seite
  gilt: boolean
  beendet: boolean
  beendet_von: Seite | null
  wartet_auf: Seite[]
  created_at: string
}

const MAX_ZEICHEN = 1500

/** Wie die jeweils andere Seite heißt — aus der Sicht, in der man gerade ist. */
const ANDERE: Record<Seite, string> = {
  klient: 'deine Fachperson',
  fachperson: 'die Klient:in',
}

export default function Absprachen({ caseId, seite }: {
  caseId: string
  /** Als welche Seite gehandelt wird. Kommt vom Aufrufer, nie aus einer Antwort. */
  seite: Seite
}) {
  const qc = useQueryClient()
  const nachfragen = useBestaetigen()
  const [neu, setNeu] = useState('')
  const [schreibt, setSchreibt] = useState(false)

  const basis = seite === 'fachperson'
    ? `/professional/cases/${caseId}/absprachen`
    : `/cases/${caseId}/absprachen`
  const schluessel = ['absprachen', caseId, seite]

  const { data = [], isLoading, error } = useQuery({
    queryKey: schluessel,
    queryFn: () => apiClient.get<Absprache[]>(basis).then(r => r.data),
    retry: false,
  })

  const frisch = () => qc.invalidateQueries({ queryKey: schluessel })

  const anlegen = useMutation({
    mutationFn: (text: string) =>
      apiClient.post<Absprache>(basis, { text }).then(r => r.data),
    onSuccess: () => { setNeu(''); setSchreibt(false); frisch() },
  })
  const bestaetigen = useMutation({
    mutationFn: (id: string) => apiClient.post(`${basis}/${id}/bestaetigen`),
    onSuccess: frisch,
  })
  const aendern = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      apiClient.put(`${basis}/${id}`, { text }),
    onSuccess: frisch,
  })
  const beenden = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${basis}/${id}`),
    onSuccess: frisch,
  })

  // Der Fehler VOR dem Ladezustand. Ohne Freigabe antwortet der Server mit 422 - das ist
  // kein Fehler, sondern eine Auskunft, und sie gehoert dorthin, wo man sie liest.
  if (error) {
    return (
      <section className="card card-static">
        <h2 className="card-title-lg">Absprachen</h2>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-brand-muted">
          {apiErrorMessage(error)}
        </p>
      </section>
    )
  }

  const laufend = data.filter(a => !a.beendet)
  const beendet = data.filter(a => a.beendet)

  return (
    <section className="card card-static">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="card-title-lg">Absprachen</h2>
        {!schreibt && !isLoading && (
          <button
            type="button"
            onClick={() => setSchreibt(true)}
            className="text-[0.82rem] font-semibold text-accent hover:underline"
          >
            + Etwas vorschlagen
          </button>
        )}
      </div>
      <p className="mt-1 max-w-[62ch] text-[0.84rem] leading-relaxed text-brand-muted">
        Was ihr miteinander verabredet habt. Eine Absprache gilt erst, wenn{' '}
        <strong className="text-navy">beide</strong> zugestimmt haben — und wer sie
        ändert, braucht die Zustimmung der anderen Seite erneut.
      </p>

      {schreibt && (
        <div className="beitrag-neu mt-4 rounded-brand border border-accent/30 bg-accent/[0.04] p-4">
          <textarea
            value={neu}
            onChange={e => setNeu(e.target.value.slice(0, MAX_ZEICHEN))}
            rows={3}
            autoFocus
            placeholder="Wenn ich merke, dass ich zumache, sage ich es — statt still zu werden."
            className="input resize-y text-[0.95rem] leading-relaxed"
          />
          <p className="mt-1 text-[0.74rem] text-brand-muted">
            Ein Satz, den man sich merken kann. Was man nicht auswendig sagen kann, trägt
            im Ernstfall nicht.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!neu.trim() || anlegen.isPending}
              onClick={() => anlegen.mutate(neu)}
              className="btn-primary !px-4 !py-1.5 !text-sm disabled:opacity-40"
            >
              {anlegen.isPending ? 'Wird vorgeschlagen …' : 'Vorschlagen'}
            </button>
            <button
              type="button"
              onClick={() => { setSchreibt(false); setNeu('') }}
              className="text-[0.82rem] text-brand-muted hover:text-navy"
            >
              Abbrechen
            </button>
          </div>
          <Fehlermeldung error={anlegen.error} className="mt-2" />
        </div>
      )}

      {isLoading ? (
        <p className="mt-4 text-[0.86rem] text-brand-muted">Wird geladen …</p>
      ) : data.length === 0 && !schreibt ? (
        <p className="mt-4 text-[0.88rem] leading-relaxed text-brand-muted">
          Noch nichts verabredet. Eine Absprache ist kein Vertrag — eher der eine Satz,
          an den ihr euch beide erinnern wollt, wenn es schwierig wird.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {laufend.map(a => (
            <Karte
              key={a.id} absprache={a} seite={seite}
              onBestaetigen={() => bestaetigen.mutate(a.id)}
              onAendern={text => aendern.mutateAsync({ id: a.id, text })}
              onBeenden={async () => {
                if (await nachfragen({
                  titel: 'Absprache beenden?',
                  text: 'Sie gilt danach nicht mehr. Sie bleibt sichtbar — dass ihr sie '
                    + 'einmal getroffen habt, gehört zur Geschichte.',
                  knopf: 'Beenden',
                })) beenden.mutate(a.id)
              }}
              laeuft={bestaetigen.isPending || beenden.isPending}
            />
          ))}

          {beendet.length > 0 && (
            <details className="pt-1">
              <summary className="cursor-pointer text-[0.8rem] text-brand-muted">
                {beendet.length === 1 ? 'Eine beendete Absprache' : `${beendet.length} beendete Absprachen`}
              </summary>
              <div className="mt-2 space-y-2">
                {beendet.map(a => (
                  <div key={a.id} className="rounded-brand border border-brand-border px-4 py-2.5 opacity-70">
                    <p className="text-[0.9rem] leading-relaxed text-brand-muted line-through decoration-brand-muted/40">
                      {a.text}
                    </p>
                    <p className="mt-1 text-[0.72rem] text-brand-muted">
                      Beendet von {a.beendet_von === seite ? 'dir' : ANDERE[seite]}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <p className="mt-4 border-t border-brand-border/60 pt-3 text-[0.74rem] leading-relaxed text-brand-muted">
        Absprachen sind kein Vertrag: Niemand kann sie einklagen, und sie ersetzen keine
        Behandlung. Es ist eine Verabredung zwischen zwei Menschen — jede Seite kann sie
        jederzeit beenden.
      </p>

      <Fehlermeldung
        error={bestaetigen.error ?? aendern.error ?? beenden.error}
        className="mt-3"
      />
    </section>
  )
}

function Karte({ absprache: a, seite, onBestaetigen, onAendern, onBeenden, laeuft }: {
  absprache: Absprache
  seite: Seite
  onBestaetigen: () => void
  onAendern: (text: string) => Promise<unknown>
  onBeenden: () => void
  laeuft: boolean
}) {
  const [bearbeitet, setBearbeitet] = useState(false)
  const [text, setText] = useState(a.text)

  // „Wartet auf dich" und „wartet auf die andere Seite" sind zwei voellig verschiedene
  // Auskuenfte: Bei der einen kann man etwas tun, bei der anderen nicht. Sie gleich
  // aussehen zu lassen waere die haeufigste Art, eine Liste unlesbar zu machen.
  const ichFehle = a.wartet_auf.includes(seite)

  return (
    <article className={`rounded-brand border px-4 py-3 ${
      a.gilt ? 'border-emerald-300 bg-emerald-50/40'
        : ichFehle ? 'border-accent/50 bg-accent/[0.04]'
          : 'border-brand-border'
    }`}>
      {bearbeitet ? (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX_ZEICHEN))}
            rows={3}
            autoFocus
            className="input resize-y text-[0.95rem] leading-relaxed"
          />
          <p className="mt-1 text-[0.74rem] leading-relaxed text-brand-muted">
            Sobald du speicherst, muss {ANDERE[seite]} erneut zustimmen — auch wenn sie
            es vorher schon getan hat.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!text.trim() || text.trim() === a.text}
              onClick={async () => { await onAendern(text); setBearbeitet(false) }}
              className="btn-primary !px-4 !py-1.5 !text-sm disabled:opacity-40"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => { setBearbeitet(false); setText(a.text) }}
              className="text-[0.82rem] text-brand-muted hover:text-navy"
            >
              Abbrechen
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[0.98rem] leading-relaxed text-navy">{a.text}</p>

          <p className="mt-1.5 text-[0.76rem] text-brand-muted">
            {a.gilt ? (
              <span className="font-semibold text-emerald-800">Gilt — beide haben zugestimmt.</span>
            ) : ichFehle ? (
              <span className="font-semibold text-accent">Wartet auf dich.</span>
            ) : (
              <>Wartet auf {ANDERE[seite]}.</>
            )}
            {' · '}
            Vorgeschlagen von {a.vorgeschlagen_von === seite ? 'dir' : ANDERE[seite]}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {ichFehle && (
              <button
                type="button" disabled={laeuft} onClick={onBestaetigen}
                className="text-[0.82rem] font-semibold text-accent transition-colors hover:text-accent-hover disabled:opacity-50"
              >
                Dem stimme ich zu
              </button>
            )}
            <button
              type="button"
              onClick={() => setBearbeitet(true)}
              className="text-[0.82rem] text-brand-muted transition-colors hover:text-navy"
            >
              Ändern
            </button>
            <button
              type="button" disabled={laeuft} onClick={onBeenden}
              className="ml-auto text-[0.82rem] text-brand-muted transition-colors hover:text-navy disabled:opacity-50"
            >
              Beenden
            </button>
          </div>
        </>
      )}
    </article>
  )
}
