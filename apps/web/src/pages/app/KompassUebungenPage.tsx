/**
 * /app/kompass/uebungen — Geführte Übungen
 *
 * **Echos vierte Aufgabe, und die einzige mit einem Anfang und einem Ende.** Die anderen
 * drei begleiten ein Gespräch; diese hier ist eine Sache, die man tut und abschließt. Der
 * Bauplan sagt warum: „die Übung ist benannt und endet mit einem Ergebnis, nicht mit einem
 * offenen Chat."
 *
 * **Für den Moment, in dem man vor einem leeren Feld sitzt.** „Schreib einen Satz über
 * dich" ist keine Aufgabe, sondern eine Zumutung, wenn man nicht weiß, wo anfangen. Vier
 * Fragen sind eine.
 *
 * **Die Seite zeigt, was herauskommt, bevor man anfängt.** Ein Satz oder ein Vorhaben —
 * und wie lange es ungefähr dauert. Wer zehn Minuten investiert, soll vorher wissen, was
 * er dafür bekommt.
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import UebungsLauf from '@/components/app/kompass/UebungsLauf'
import { kompassApi } from '@/api/kompass'

export default function KompassUebungenPage() {
  const qc = useQueryClient()
  // Aus den Sätzen und den Vorhaben wird direkt auf eine bestimmte Übung verwiesen —
  // dorthin kommt man in dem Moment, in dem man sie braucht.
  const [params, setParams] = useSearchParams()
  const [offen, setOffen] = useState<string | null>(params.get('u'))

  const { data: uebungen, isLoading, error } = useQuery({
    queryKey: ['kompass-uebungen'],
    queryFn: kompassApi.uebungen,
    staleTime: Infinity,
  })

  const abschliessen = useMutation({
    mutationFn: ({ key, antworten }: { key: string; antworten: string[] }) =>
      kompassApi.uebungAbschliessen(key, antworten),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kompass-saetze'] })
      qc.invalidateQueries({ queryKey: ['kompass-vorhaben'] })
      qc.invalidateQueries({ queryKey: ['kompass'] })
    },
  })

  const schliessen = () => {
    setOffen(null)
    if (params.has('u')) { params.delete('u'); setParams(params, { replace: true }) }
  }

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[720px] px-6 py-8">
          <h1 className="page-title">Übungen</h1>
          <Fehlermeldung error={error} className="mt-3" />
        </div>
      </AppShell>
    )
  }

  if (isLoading || !uebungen) {
    return <AppShell><PageSkeleton cards={3} label="Übungen werden geladen" /></AppShell>
  }

  const laufende = uebungen.find(u => u.key === offen)

  return (
    <AppShell>
      <div className="mx-auto max-w-[720px] px-6 py-8">
        <Link
          to="/app/kompass"
          className="text-[0.8rem] text-brand-muted no-underline transition-colors hover:text-navy"
        >
          ← Mein Kompass
        </Link>

        {laufende ? (
          <section className="card card-hero card-static mt-4">
            <UebungsLauf
              uebung={laufende}
              onZurueck={schliessen}
              onAbschliessen={antworten =>
                abschliessen.mutateAsync({ key: laufende.key, antworten })}
            />
          </section>
        ) : (
          <>
            <header className="mb-6 mt-3">
              <h1 className="page-title">Übungen</h1>
              <p className="mt-1 max-w-[62ch] text-sm text-brand-muted">
                Ein paar Fragen, und am Ende steht etwas da. Für die Momente, in denen du
                weißt, dass etwas nicht stimmt — aber nicht, wie du es nennen sollst.
              </p>
            </header>

            <div className="space-y-3">
              {uebungen.map(u => (
                <button
                  key={u.key}
                  type="button"
                  onClick={() => setOffen(u.key)}
                  className="group block w-full rounded-brand border border-brand-border bg-brand-card p-4 text-left shadow-brand-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-brand motion-reduce:hover:translate-y-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="card-title-lg transition-colors group-hover:text-accent">
                      {u.label}
                    </span>
                    <span className="text-[0.74rem] text-brand-muted">
                      {/* „2 Fragen" waere bei einer Paar-Uebung zwar wahr und trotzdem
                          irrefuehrend: Dahinter stehen acht Paare und ein freiwilliges
                          Feld. Was hier zaehlt, ist das, weswegen jemand ueberhaupt
                          anfaengt — dass er nichts schreiben muss. */}
                      {u.schritte.some(s => s.form === 'paare')
                        ? <>Antippen statt tippen · {u.dauer}</>
                        : <>{u.schritte.length} Fragen · {u.dauer}</>}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.86rem] leading-relaxed text-brand-muted">
                    {u.hinweis}
                  </p>
                  {/* Was herauskommt, VOR dem Anfangen. Wer zehn Minuten investiert,
                      soll vorher wissen, wofür. */}
                  <p className="mt-2 text-[0.76rem] font-medium text-accent">
                    Ergibt {u.ergibt === 'satz'
                      ? 'einen Satz über dich'
                      : 'ein Vorhaben mit Schritten'}
                  </p>
                </button>
              ))}
            </div>

            <p className="mt-6 max-w-[62ch] text-[0.82rem] leading-relaxed text-brand-muted">
              Echo kommt erst am Ende und formuliert aus deinen Antworten ein Ergebnis —
              als Entwurf. Es gilt, wenn du ihm zustimmst, und sonst nicht.
            </p>
          </>
        )}
      </div>
    </AppShell>
  )
}
