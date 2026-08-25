/**
 * Der Anreißer für Ehrliches Mitteilen auf der Übersicht.
 *
 * **Warum es ihn braucht.** Die Übersichtszeile für diesen Bereich spricht erst, wenn eine
 * Runde läuft — wer noch nie eine begonnen hat, sah also nie etwas. Das Feature wartete auf
 * Menschen, die es schon kennen. Das sind die wenigsten.
 *
 * **Warum eine Frage und keine Kachel.** Dieselbe Begründung wie beim Impuls-Anreißer
 * nebenan: „Ehrliches Mitteilen ausprobieren" bewegt niemanden, eine konkrete Frage schon.
 * Man beantwortet sie im Kopf, noch bevor man geklickt hat — und dann ist der Klick nur
 * noch die Formsache. Die Frage kommt aus dem Impuls-Katalog des Servers und wandert mit
 * der Zahl der Runden.
 *
 * **Was rechts steht, ist die eigentliche Einladung.** Überall sonst im Paarraum arbeitet
 * Echo mit. Dass es hier draußen bleibt, ist der Unterschied — und der Grund, überhaupt
 * hineinzuschauen.
 *
 * Zeigt nichts, solange eine Runde offen ist: Dann steht der Hinweis schon weiter oben,
 * und zwei Aufforderungen zur selben Sache wären eine zu viel. Diese Entscheidung fällt
 * serverseitig (`teaser` liefert dann `null`).
 */
import { Link } from 'react-router-dom'
import type { CoupleHonestTeaser } from '@/api/couple'

export default function HonestTeaser({ teaser }: { teaser: CoupleHonestTeaser | null }) {
  if (!teaser) return null

  return (
    <Link
      to={teaser.target}
      className="block rounded-brand-lg border border-brand-border bg-white px-4 py-3.5 no-underline shadow-brand-sm transition hover:border-accent/50"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-navy">Ehrlich mitteilen</p>
        <p className="text-[0.7rem] text-brand-muted">Echo bleibt draußen</p>
      </div>

      <p className="mt-1.5 text-sm leading-snug text-brand-text">„{teaser.question}“</p>
      <p className="mt-1 text-[0.72rem] leading-relaxed text-brand-muted">{teaser.hint}</p>

      <p className="mt-1.5 text-[0.72rem] text-accent">
        {teaser.first
          ? 'Eine Runde, in der niemand antwortet – und niemand mitliest →'
          : 'Nächste Runde beginnen →'}
      </p>
    </Link>
  )
}
