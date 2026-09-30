/**
 * /app/cases/:caseId/podcast — das Regal und das Studio.
 *
 * **Zwei Zustände auf einer Seite, und das ist Absicht.** Wer noch keine Folge hat, sieht
 * das Studio; wer welche hat, sieht sein Regal und darüber einen Knopf. Eine eigene Seite
 * fürs Bestellen wäre ein Weg mehr für etwas, das man selten tut und dann sofort.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import Studio from '@/components/app/podcast/Studio'
import { zeit } from '@/components/app/podcast/Abspieler'
import { podcastApi, type Podcast, type PodcastBestellung } from '@/api/podcast'
import { altersWort } from '@/lib/kompass'

export default function PodcastPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [studioOffen, setStudioOffen] = useState(false)

  const regal = useQuery({
    queryKey: ['podcasts', caseId],
    queryFn: () => podcastApi.liste(caseId!),
    enabled: !!caseId,
  })

  const bestellen = useMutation({
    mutationFn: (b: PodcastBestellung) => podcastApi.anlegen(caseId!, b),
    onSuccess: folge => {
      qc.invalidateQueries({ queryKey: ['podcasts', caseId] })
      // Direkt zur Folge: Dort steht das Skript, und dort entscheidet sich, ob daraus eine
      // Aufnahme wird. Auf dem Regal stehen zu bleiben hiesse, den Text zu verstecken,
      // den man gerade bestellt hat.
      navigate(`/app/cases/${caseId}/podcast/${folge.id}`)
    },
  })

  if (regal.isLoading) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[900px] px-6 py-8"><PageSkeleton /></div>
      </AppShell>
    )
  }

  const folgen = regal.data ?? []
  const zeigeStudio = studioOffen || folgen.length === 0

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <h1 className="page-title">Podcast</h1>
        <p className="mt-2 max-w-[62ch] text-[0.94rem] leading-relaxed text-brand-muted">
          Dein Fall als gesprochene Nachricht — zum Hören unterwegs, zum Mitnehmen vor
          einem Termin, oder um ihn jemandem vorzuspielen. Du bestimmst das Format, die
          Länge und woraus er entsteht.
        </p>

        {/* Nur der Fehler des REGALS steht hier oben. Der des Bestellens gehört an den
            Knopf, den man gerade gedrückt hat — sonst erscheint er außerhalb des Bildes. */}
        <Fehlermeldung error={regal.error} className="mt-4" />

        {zeigeStudio ? (
          <div className="mt-6">
            <Studio
              caseId={caseId!}
              laeuft={bestellen.isPending}
              fehler={bestellen.error}
              onBestellen={b => bestellen.mutate(b)}
              onAbbruch={() => setStudioOffen(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setStudioOffen(true)}
            className="btn-primary !py-2.5 !px-5 !text-sm mt-6"
          >
            Neue Folge
          </button>
        )}

        {folgen.length > 0 && (
          <section className="mt-10">
            <h2 className="card-title-lg">Deine Folgen</h2>
            <p className="mt-1 max-w-[62ch] text-[0.82rem] leading-relaxed text-brand-muted">
              Es geht in zwei Schritten: Erst entsteht der Text, dann lässt du ihn in der
              Folge sprechen. Zu hören ist erst danach etwas.
            </p>
            <ul className="mt-3 space-y-2">
              {folgen.map(f => <Zeile key={f.id} folge={f} caseId={caseId!} />)}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  )
}

/**
 * Eine Zeile im Regal.
 *
 * **Der Stand sagt, was zu TUN ist, nicht nur wie es steht.** „Skript steht — noch nicht
 * gesprochen" ist eine Zustandsbeschreibung; wer sie liest, weiss noch nicht, dass er
 * hineingehen und einen Knopf druecken muss. Ein Nutzer hat genau das gefragt: wie er den
 * Podcast abspielen kann. Die Antwort gehoert in die Zeile, in der er sucht.
 */
function Zeile({ folge, caseId }: { folge: Podcast; caseId: string }) {
  const zuTun = folge.status === 'skript' || folge.status === 'fehler'
  const stand =
    folge.status === 'fertig' ? zeit(folge.sekunden)
    : folge.status === 'skript' ? 'Text steht · noch sprechen lassen →'
    : folge.status === 'spricht' ? 'wird gerade gesprochen …'
    : folge.status === 'fehler' ? 'abgebrochen · weitermachen →'
    : 'ohne Text · öffnen →'

  return (
    <li>
      <Link
        to={`/app/cases/${caseId}/podcast/${folge.id}`}
        className="group flex flex-wrap items-center gap-3 rounded-brand border border-brand-border bg-white px-5 py-4 no-underline transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-brand-sm motion-reduce:hover:translate-y-0"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.95rem] font-semibold leading-snug text-navy transition-colors group-hover:text-accent">
            {folge.titel || folge.format_label}
          </span>
          <span className="mt-0.5 block text-[0.78rem] text-brand-muted">
            {folge.format_label} · {folge.stimme_label} · {altersWort(folge.created_at)}
          </span>
        </span>
        <span className={`shrink-0 text-[0.76rem] font-medium ${
          folge.status === 'fehler' ? 'text-red-500'
          : zuTun || folge.status === 'fertig' ? 'text-accent' : 'text-brand-muted'
        }`}>
          {stand}
        </span>
      </Link>
    </li>
  )
}
