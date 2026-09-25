/**
 * /app/kompass/traumbeziehung — Meine Traumbeziehung
 *
 * **Der Raum, nicht die Skizze.** Hier steht nur, worum es gehen kann: sechs
 * Beziehungsarten, und zu jeder entweder eine angefangene Skizze oder eine Einladung. Die
 * Arbeit passiert eine Ebene tiefer.
 *
 * **Warum nach Beziehungsart getrennt und nicht eine Skizze für alles.** Was man sich von
 * einer Partnerschaft wünscht, ist etwas anderes als das, was man sich von der eigenen
 * Familie wünscht — und „Zärtlichkeit" hat in einem Arbeitsverhältnis nichts zu suchen. Eine
 * Skizze für alles wäre entweder so allgemein, dass sie nichts sagt, oder sie behauptete,
 * für alle Beziehungen gälte dasselbe.
 *
 * **Und es ist die Bedingung für den Vergleich.** Ein Ideal lässt sich später nur an einen
 * Fall DERSELBEN Art halten. Das geht nur, wenn es die Art überhaupt kennt.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import { idealApi, type Ideal, type IdealArt } from '@/api/kompassIdeal'
import { altersWort } from '@/lib/kompass'

export default function TraumbeziehungPage() {
  const katalog = useQuery({
    queryKey: ['ideal-katalog'],
    queryFn: () => idealApi.katalog(),
    staleTime: Infinity,
  })
  const skizzen = useQuery({ queryKey: ['ideale'], queryFn: idealApi.liste })

  const nach_art = new Map((skizzen.data ?? []).map(i => [i.art, i]))

  return (
    <AppShell>
      <div className="mx-auto max-w-[780px] px-6 py-8">
        <Link to="/app/kompass" className="text-xs text-brand-muted hover:text-navy">
          ← Mein Kompass
        </Link>

        <span className="label mt-3 block">Meine Traumbeziehung</span>
        <h1 className="page-title mt-1">Wie hättest du es gern?</h1>
        <p className="mt-3 max-w-[60ch] text-[0.94rem] leading-relaxed text-brand-muted">
          Nicht, wie es ist — wie du es dir wünschst. Das ist schwerer, als es klingt: Die
          meisten können sofort sagen, was ihnen fehlt, und brauchen länger für das, was sie
          eigentlich wollen. Du musst nichts auf einmal ausfüllen, und nichts davon ist
          verbindlich.
        </p>

        <Fehlermeldung error={katalog.error ?? skizzen.error} className="mt-4" />

        {katalog.isLoading || skizzen.isLoading ? (
          <div className="mt-8"><PageSkeleton /></div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {(katalog.data?.arten ?? []).map(art => (
              <ArtKarte key={art.key} art={art} skizze={nach_art.get(art.key)} />
            ))}
          </div>
        )}

        {/* Steht unten und nicht oben: Wer hier ankommt, will anfangen, nicht lesen. */}
        <p className="mt-8 max-w-[60ch] text-[0.78rem] leading-relaxed text-brand-muted/80">
          Eine fertige Skizze lässt sich später neben einen deiner Fälle legen — aber nur
          neben einen derselben Art. Ein Wunschbild einer Partnerschaft sagt über das
          Verhältnis zu deinen Eltern nichts, und ein Vergleich, der das täte, wäre keine
          Erkenntnis, sondern ein Rechenfehler.
        </p>
      </div>
    </AppShell>
  )
}

function ArtKarte({ art, skizze }: { art: IdealArt; skizze?: Ideal }) {
  const angefangen = !!skizze
  const anzahl = skizze?.aspekte.length ?? 0

  return (
    <Link
      to={`/app/kompass/traumbeziehung/${art.key}`}
      className={`card block transition hover:border-accent/40 hover:shadow-sm ${
        angefangen ? 'border-accent/30' : ''
      }`}
    >
      <p className="card-title">{art.label}</p>
      <p className="mt-1.5 text-[0.8rem] leading-snug text-brand-muted">{art.frage}</p>

      <p className="mt-3 text-xs font-medium text-accent">
        {angefangen
          ? `${anzahl} ${anzahl === 1 ? 'Aspekt' : 'Aspekte'} · ${altersWort(skizze.updated_at)}`
          : 'Noch nichts — anfangen →'}
      </p>
    </Link>
  )
}
