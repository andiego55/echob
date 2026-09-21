/**
 * Ein Vorschlag von Echo — und warum er anders aussieht als ein eigener Satz.
 *
 * **Hier spricht nicht die Person, hier fragt Echo.** Ein eigener Entwurf ist etwas, das
 * jemand über sich aufgeschrieben hat; ein Vorschlag ist eine Frage an ihn. Sähen beide
 * gleich aus, verschwömme genau der Unterschied, auf dem dieser Raum aufgebaut ist —
 * und in einem halben Jahr stünde in „Das gilt" etwas, das ein Modell formuliert hat und
 * niemand geprüft.
 *
 * **Der Grund steht ÜBER dem Satz, nicht darunter.** Er ist die Begründung, und eine
 * Begründung liest man vor der Behauptung. So entsteht die Reihenfolge, die das Konzept
 * meint: „In drei Szenen hast du beschrieben, dass du still wirst — soll ich das
 * festhalten?" Ohne den Grund wäre Zustimmen ein Raten.
 *
 * **Zwei Knöpfe, gleich groß.** „Nein" darf nicht kleiner sein als „Ja". Ein Vorschlag,
 * den man nur mühsam ablehnen kann, ist keine Frage, sondern eine Setzung.
 */
import Chip from '@/components/Chip'
import type { Satz } from '@/api/kompass'

export default function VorschlagsKarte({ satz: s, onEntscheiden, laeuft }: {
  satz: Satz
  onEntscheiden: (annehmen: boolean) => void
  laeuft: boolean
}) {
  return (
    <article className="beitrag-neu overflow-hidden rounded-brand border border-navy/15 bg-brand-card shadow-brand-sm">
      {/* Der Streifen macht die Karte auf einen Blick zu Echos Zug — dieselbe Farbe,
          in der Echo im Rest der App spricht. */}
      <div className="border-l-[3px] border-navy p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip ton="wartet">{s.art_label ?? s.art}</Chip>
          {/* Nicht noch einmal „Echo fragt" — das steht schon über dem Stapel. Eine
              Karte, die ihre Überschrift wiederholt, liest sich wie ein Formular. */}
          <span className="text-[0.72rem] font-medium text-brand-muted">
            Vorschlag
          </span>
        </div>

        {s.grund && (
          <p className="mt-2.5 text-[0.85rem] leading-relaxed text-brand-muted">
            {s.grund}
          </p>
        )}

        <p className="mt-2 text-[1.05rem] font-medium leading-relaxed text-navy">
          „{s.text}“
        </p>

        <p className="mt-1.5 text-[0.8rem] text-brand-muted">
          Soll das als {s.art_label ?? 'Satz'} über dich stehen?
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={laeuft}
            onClick={() => onEntscheiden(true)}
            className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
          >
            Ja, das stimmt
          </button>
          <button
            type="button"
            disabled={laeuft}
            onClick={() => onEntscheiden(false)}
            className="btn-quiet !px-5 !py-2 !text-sm disabled:opacity-50"
          >
            Nein
          </button>
        </div>

        {/* Was „Nein" bedeutet, steht dabei. Sonst zögert man aus Sorge, etwas
            Endgültiges zu tun — und der Vorschlag bleibt ewig liegen. */}
        <p className="mt-2 text-[0.74rem] text-brand-muted">
          „Nein" heißt: Dieser Vorschlag kommt nicht wieder.
        </p>
      </div>
    </article>
  )
}
