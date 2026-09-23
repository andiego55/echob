/**
 * /app/kompass/agenda — „Das möchte ich besprechen"
 *
 * **Die Frage, die sonst offen bliebe.** Zwischen „ich habe etwas über mich
 * herausgefunden" und „ich spreche es an" liegt ein Termin — und drei Wochen, in denen
 * man es vergisst. Der Bauplan: *Was mache ich jetzt mit dieser Erkenntnis?*
 *
 * **Eine Liste zum Mitnehmen, keine Freigabe.** Der Bauplan nennt sie „die sanfteste Form
 * der Freigabe", und so geht es nicht: Auf ihr dürfen Momente stehen, und die rohen Pulse
 * sind ausdrücklich nie freigebbar. Sie als Ganzes zu übergeben nähme genau das mit. Also
 * ist sie das, was sie im Termin ohnehin ist: etwas, das man mitbringt und vorliest.
 * Einzelne Sätze lassen sich weiterhin einzeln freigeben.
 *
 * **Groß und ruhig gesetzt.** Diese Seite wird nicht durchgeblättert, sie wird
 * vorgelesen — vielleicht vom Telefon, vielleicht mit zitternden Händen. Also große
 * Schrift, viel Luft, keine Knöpfe, die man versehentlich trifft.
 *
 * **Kein Abhaken.** Ein Punkt, der besprochen ist, kommt herunter. Ein Häkchen daneben
 * machte aus einer Tagesordnung eine Aufgabenliste — und aus einem Termin eine Prüfung,
 * in der man alles geschafft haben muss.
 */
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { kompassApi, type AgendaPunkt } from '@/api/kompass'
import { altersWort } from '@/lib/kompass'

const WOHER: Record<AgendaPunkt['art'], string> = {
  satz: 'Ein Satz über mich',
  puls: 'Ein Moment',
  portrait: 'Mein Selbstporträt',
}

export default function KompassAgendaPage() {
  const qc = useQueryClient()

  const { data: punkte, isLoading, error } = useQuery({
    queryKey: ['kompass-agenda'],
    queryFn: kompassApi.agenda,
  })

  const weg = useMutation({
    mutationFn: (id: string) => kompassApi.agendaWeg(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kompass-agenda'] })
      qc.invalidateQueries({ queryKey: ['kompass-agenda-markierungen'] })
      qc.invalidateQueries({ queryKey: ['kompass'] })
    },
  })

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[660px] px-6 py-8">
          <h1 className="page-title">Das möchte ich besprechen</h1>
          <Fehlermeldung error={error} className="mt-3" />
        </div>
      </AppShell>
    )
  }

  if (isLoading || !punkte) {
    return <AppShell><PageSkeleton cards={2} label="Deine Liste wird geladen" /></AppShell>
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[660px] px-6 py-8">
        <Link
          to="/app/kompass"
          className="text-[0.8rem] text-brand-muted no-underline transition-colors hover:text-navy"
        >
          ← Mein Kompass
        </Link>

        <header className="mb-6 mt-3">
          <h1 className="page-title">Das möchte ich besprechen</h1>
          <p className="mt-1 max-w-[56ch] text-sm text-brand-muted">
            Was du dir für den nächsten Termin vorgemerkt hast. Die Liste bleibt bei dir
            — du nimmst sie mit, sie wird nicht weitergegeben.
          </p>
        </header>

        {punkte.length === 0 ? (
          <section className="card card-static">
            <h2 className="card-title-lg">Noch nichts vorgemerkt</h2>
            <p className="mt-2 max-w-[52ch] text-[0.9rem] leading-relaxed text-brand-muted">
              An jedem bestätigten Satz, jedem Moment und jedem Porträt steht ein kleiner
              Knopf „Besprechen". Was du damit markierst, sammelt sich hier — und dann
              musst du dir vor dem Termin nichts mehr merken.
            </p>
            <Link to="/app/kompass/saetze" className="btn-quiet mt-4 !px-4 !py-2 !text-sm">
              Zu meinen Sätzen
            </Link>
          </section>
        ) : (
          <>
            <ol className="space-y-3">
              {punkte.map((p, i) => (
                <li key={p.id}>
                  <article className="rounded-brand border border-brand-border bg-brand-card p-5 shadow-brand-sm">
                    <div className="flex items-start gap-4">
                      <span
                        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 text-[0.78rem] font-bold text-accent"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-[1.05rem] leading-relaxed text-navy">
                          {p.art === 'satz' ? `„${p.titel}"` : p.titel}
                        </p>
                        {p.unterzeile && (
                          <p className="mt-1 text-[0.88rem] leading-relaxed text-brand-text">
                            {p.unterzeile}
                          </p>
                        )}
                        {p.notiz && (
                          <p className="mt-2 border-l-2 border-accent/40 pl-3 text-[0.88rem] leading-relaxed text-brand-muted">
                            {p.notiz}
                          </p>
                        )}
                        <p className="mt-2 text-[0.74rem] text-brand-muted">
                          {WOHER[p.art]}
                          {p.wann && <> · von {altersWort(p.wann)}</>}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => weg.mutate(p.id)}
                        disabled={weg.isPending}
                        aria-label="Von der Liste nehmen"
                        title="Von der Liste nehmen"
                        className="shrink-0 rounded-brand-sm p-1.5 text-brand-muted transition-colors hover:bg-brand-bg hover:text-navy disabled:opacity-50"
                      >
                        <svg
                          viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ol>

            <p className="mt-5 max-w-[54ch] text-[0.82rem] leading-relaxed text-brand-muted">
              Nach dem Termin nimmst du herunter, was besprochen ist. Das Stück selbst
              bleibt, wo es ist — von der Liste zu nehmen heißt nicht, dass es nicht mehr
              gilt.
            </p>
          </>
        )}

        <Fehlermeldung error={weg.error} className="mt-4" />
      </div>
    </AppShell>
  )
}
