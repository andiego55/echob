/**
 * /app/cases/:caseId/einstieg — fünf Szenen, bevor der Fall leer dasteht.
 *
 * **Das Problem, das diese Seite löst.** Wer sich anmeldet und einen Fall anlegt, landete
 * bisher direkt auf der leeren Szenenliste — also vor der Aufforderung, ein belastendes
 * Ereignis aus dem eigenen Leben aufzuschreiben. Das ist für viele der schwerste denkbare
 * erste Schritt, und wer ihn nicht schafft, kommt nicht wieder.
 *
 * Fünf erfundene Szenen wiederzuerkennen kostet zwei Minuten und einen Fingertipp je Szene.
 * Danach steht im Fall etwas — und Echo hat einen Anknüpfungspunkt, ohne dass jemand eine
 * Zeile über sich geschrieben hat.
 *
 * **Warum fünf und nicht zehn.** Zehn sind zehn Entscheidungen an dem Tag, an dem jemand
 * ohnehin gerade ein Konto angelegt hat. Fünf sind eine Geste, zehn sind eine Aufgabe.
 *
 * **Warum die fünf gestreut sind.** Die Auswahl trifft der Server, mit einer Szene je
 * Wirkung (siehe `/szenen/einstieg`). Fünf aus demselben Cluster sagten fast nichts; eine
 * je Wirkung ergibt nach zwei Minuten eine erste Richtung.
 *
 * **Warum es das nur einmal gibt.** Erreicht wird die Seite ausschließlich aus dem Anlegen
 * des ersten Falls. Sie taucht nie von selbst wieder auf — ein Ding, das man wegdrücken
 * muss, wird zu etwas, das man wegdrückt, und irgendwann drückt man auch das weg, was
 * wichtig ist. Wer mehr will, findet den Weg unter *Wiedererkanntes*.
 *
 * **Abbrechen geht überall und kostet nichts.** Auch nach der zweiten Szene. Was bis dahin
 * getippt wurde, bleibt.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import ReaktionsMarke from '@/components/content/ReaktionsMarke'
import { ListSkeleton } from '@/components/Skeleton'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import { REAKTIONS_INFOS, istWiedererkannt, type Reaktion } from '@/lib/resonanz'
import { oeffentlicheResonanzApi, resonanzApi } from '@/api/resonanz'

const SZENEN = new Map(
  CONTENT_MANIFEST.filter(m => m.type === 'scene').map(m => [m.slug, m]),
)

export default function CaseEinstiegPage() {
  const { caseId = '' } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [schritt, setSchritt] = useState(0)
  const [gesetzt, setGesetzt] = useState<Record<string, Reaktion>>({})

  const { data: slugs, isLoading } = useQuery({
    queryKey: ['szenen-einstieg'],
    queryFn: () => oeffentlicheResonanzApi.einstieg(),
    // Einmal holen und behalten: Ein Neuladen mitten im Durchgang soll nicht plötzlich
    // andere Szenen zeigen.
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const reagieren = useMutation({
    mutationFn: ({ slug, reaction }: { slug: string; reaction: Reaktion }) =>
      resonanzApi.setzen(slug, { reaction, case_id: caseId }),
  })

  const liste = useMemo(
    () => (slugs ?? []).map(s => SZENEN.get(s)).filter(Boolean),
    [slugs],
  ) as { slug: string; title: string; description: string; perspective?: string; pull_quote?: string }[]

  const fertig = liste.length > 0 && schritt >= liste.length
  const erkannt = Object.values(gesetzt).filter(istWiedererkannt).length

  function antworten(slug: string, reaction: Reaktion) {
    setGesetzt(g => ({ ...g, [slug]: reaction }))
    // Fehler hier dürfen den Durchgang nicht anhalten: Die Geste ist wichtiger als die
    // Zeile in der Datenbank, und beim nächsten Mal geht es wieder.
    reagieren.mutate({ slug, reaction })
    setSchritt(s => s + 1)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[680px] px-6 py-10">
        {isLoading && <ListSkeleton rows={3} label="Wird geladen" />}

        {/* ── Der Durchgang ────────────────────────────────────────────── */}
        {!fertig && liste[schritt] && (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-accent">
                {schritt + 1} von {liste.length}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/app/cases/${caseId}/scenes`)}
                className="text-[0.82rem] text-brand-muted hover:text-navy hover:underline"
              >
                Überspringen
              </button>
            </div>

            {schritt === 0 && (
              <div className="mt-5">
                <h1 className="text-[1.6rem] font-bold leading-tight text-navy">
                  Fünf erfundene Szenen. Kommt dir etwas davon bekannt vor?
                </h1>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-brand-muted">
                  Ein Tipp je Szene, zwei Minuten. Du musst nichts erklären und nichts
                  aufschreiben — und du kannst jederzeit aufhören.
                </p>
              </div>
            )}

            <article className="mt-6 rounded-brand-lg border border-brand-border bg-white px-6 py-7">
              {liste[schritt].perspective && (
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-accent">
                  {liste[schritt].perspective}
                </p>
              )}
              <h2 className="mt-1.5 text-[1.35rem] font-bold leading-snug text-navy">
                {liste[schritt].title}
              </h2>
              {liste[schritt].pull_quote && (
                <p className="mt-4 font-serif text-[1.1rem] italic leading-[1.6] text-brand-text">
                  „{liste[schritt].pull_quote}“
                </p>
              )}
              <p className="mt-4 text-[0.92rem] leading-relaxed text-brand-muted">
                {liste[schritt].description}
              </p>
              <Link
                to={`/szenen/${liste[schritt].slug}`}
                target="_blank"
                className="mt-3 inline-block text-[0.84rem] font-medium text-accent hover:underline"
              >
                Ganze Szene lesen (neuer Reiter) →
              </Link>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {REAKTIONS_INFOS.map(info => (
                  <button
                    key={info.key}
                    type="button"
                    onClick={() => antworten(liste[schritt].slug, info.key)}
                    className="flex items-start gap-3 rounded-brand border border-brand-border bg-white px-4 py-3 text-left transition-all hover:-translate-y-px hover:border-accent/50 hover:shadow-brand"
                  >
                    <span className="mt-0.5 text-brand-muted">
                      <ReaktionsMarke art={info.key} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.92rem] font-semibold text-brand-text">
                        {info.label}
                      </span>
                      <span className="mt-0.5 block text-[0.76rem] leading-snug text-brand-muted">
                        {info.hinweis}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </article>
          </>
        )}

        {/* ── Der Abschluss: wozu Szenen in EchoB da sind ──────────────── */}
        {fertig && (
          <>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-accent">
              Das war's
            </p>
            <h1 className="mt-3 text-[1.7rem] font-bold leading-tight text-navy">
              {erkannt === 0
                ? 'Nichts dabei — auch das ist eine Auskunft.'
                : erkannt === 1
                  ? 'Eine hast du wiedererkannt.'
                  : `${erkannt} davon kamen dir bekannt vor.`}
            </h1>

            <div className="mt-5 space-y-4 text-[0.97rem] leading-relaxed text-brand-text">
              <p>
                Die fünf Geschichten waren erfunden. Was du markiert hast, liegt jetzt in
                deinem Fall unter <strong className="text-navy">Wiedererkanntes</strong> —
                und Echo kann sich darauf beziehen, ohne dass du eine Zeile über dich
                geschrieben hast.
              </p>
              <p>
                Weiter kommt dein Fall aber mit etwas anderem:{' '}
                <strong className="text-navy">deinen eigenen Beobachtungen.</strong> Eine
                Szene in EchoB ist ein Ereignis, das wirklich stattgefunden hat — was gesagt
                wurde, was du gemacht hast, wann es war. Aus solchen Szenen entstehen die
                Muster, die Berichte und alles, was du später einer Fachperson zeigen
                kannst. Aus wiedererkannten Geschichten entsteht das nicht; sie sind der
                Anfang, nicht das Material.
              </p>
              <p className="text-brand-muted">
                Es müssen nicht viele sein und nicht die schlimmsten. Eine kleine Szene, die
                dir heute noch im Kopf ist, reicht für den Anfang.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                to={`/app/cases/${caseId}/scenes/new`}
                className="btn-primary !px-6 !py-3"
              >
                Erste eigene Szene schreiben
              </Link>
              <Link
                to={`/app/cases/${caseId}/scenes`}
                className="text-[0.9rem] font-medium text-brand-muted hover:text-navy hover:underline"
              >
                Später — erst umsehen
              </Link>
            </div>

            {erkannt > 0 && (
              <p className="mt-6 border-t border-brand-border pt-5 text-[0.86rem] text-brand-muted">
                Was du wiedererkannt hast, findest du unter{' '}
                <Link
                  to={`/app/cases/${caseId}/resonanz`}
                  className="font-medium text-accent hover:underline"
                >
                  Wiedererkanntes
                </Link>
                {' '}— dort kannst du auch weitere Szenen lesen, wenn du magst.
              </p>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
