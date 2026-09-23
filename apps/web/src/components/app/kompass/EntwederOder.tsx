/**
 * Die Eingabeform „Entweder oder" — zwei Gegensätze, einer wiegt heute schwerer.
 *
 * **Der Grund steht im Gefühlsbild-Katalog und gilt für den ganzen Raum: Wer belastet
 * ist, hat die Worte oft nicht.** Ein leeres Feld, das nach Werten fragt, läuft bei genau
 * diesen Menschen leer — und das sind die, um die es geht. Hier genügt Antippen.
 *
 * **Beide Seiten sind gut.** Das ist keine Höflichkeit, sondern die Bedingung dafür, dass
 * die Wahl etwas aussagt. Stünde auf einer Seite etwas offensichtlich Schlechtes, wäre es
 * keine Wahl, sondern eine Prüfung mit einer richtigen Antwort — und alle kreuzten
 * dasselbe an.
 *
 * **Auslassen ist eine Antwort.** Kein Zähler, kein „noch 3 offen", keine Sperre am Ende.
 * Wer sich bei einem Paar nicht entscheiden kann, sagt damit etwas über das Paar.
 *
 * **Umentscheiden geht durch Antippen des schon Gewählten.** Ohne diesen Weg wäre der
 * erste Klick endgültig, und man klickte vorsichtig — bei acht Paaren ist das der
 * Unterschied zwischen drei Minuten und gar nicht.
 *
 * **Warum die Antwort Schlüssel sind und keine Sätze.** Die Sprache der Übung steht im
 * Katalog auf dem Server. Bildete diese Komponente den Satz, stünde sie im Browser — und
 * der Prompt bekäme, was ein Client schickt.
 */
import type { Gegensatzpaar } from '@/api/kompass'

export default function EntwederOder({ paare, gewaehlt, onWahl }: {
  paare: Gegensatzpaar[]
  /** Die Schlüssel der angetippten Pole. */
  gewaehlt: string[]
  onWahl: (schluessel: string[]) => void
}) {
  const umschalten = (polKey: string, anderer: string) => {
    // Der andere Pol desselben Paares faellt immer weg: Zwei Antworten auf ein Paar
    // waeren "A schwerer als B und B schwerer als A".
    const ohne = gewaehlt.filter(k => k !== polKey && k !== anderer)
    onWahl(gewaehlt.includes(polKey) ? ohne : [...ohne, polKey])
  }

  return (
    <ul className="mt-4 space-y-2.5">
      {paare.map(p => {
        const links = gewaehlt.includes(p.links.key)
        const rechts = gewaehlt.includes(p.rechts.key)
        return (
          <li
            key={p.key}
            className={`grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 rounded-brand border p-1.5 transition-colors ${
              links || rechts ? 'border-accent/40 bg-accent/[0.04]' : 'border-brand-border'
            }`}
          >
            <Pol
              label={p.links.label}
              gewaehlt={links}
              blass={rechts}
              onKlick={() => umschalten(p.links.key, p.rechts.key)}
            />
            <span
              className="grid place-items-center px-1 text-[0.68rem] font-medium uppercase tracking-wider text-brand-muted"
              aria-hidden="true"
            >
              oder
            </span>
            <Pol
              label={p.rechts.label}
              gewaehlt={rechts}
              blass={links}
              onKlick={() => umschalten(p.rechts.key, p.links.key)}
            />
          </li>
        )
      })}
    </ul>
  )
}

// ── Eine Seite ───────────────────────────────────────────────────────────────
// Die nicht gewaehlte Seite wird blasser, nicht durchgestrichen: Sie ist nicht falsch
// und nicht weg — sie wiegt heute nur weniger. Genau das ist die Aussage.

function Pol({ label, gewaehlt, blass, onKlick }: {
  label: string
  gewaehlt: boolean
  blass: boolean
  onKlick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onKlick}
      aria-pressed={gewaehlt}
      className={`min-h-[3rem] rounded-brand-sm px-3 py-2 text-[0.92rem] font-medium leading-snug transition-colors ${
        gewaehlt
          ? 'bg-navy text-white'
          : blass
            ? 'text-brand-muted/70 hover:bg-brand-bg hover:text-navy'
            : 'text-brand-text hover:bg-brand-bg hover:text-navy'
      }`}
    >
      {label}
    </button>
  )
}
