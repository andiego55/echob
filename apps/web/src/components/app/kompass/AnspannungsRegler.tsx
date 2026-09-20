/**
 * Die Anspannung — ein Regler von null bis zehn, der auch ungesetzt bleiben darf.
 *
 * **Warum ein echter `input type="range"`.** Ein nachgebauter Regler aus `div`s sieht
 * überall gleich aus und lässt sich nirgends bedienen: keine Pfeiltasten, kein
 * Vorlesewerkzeug, keine Rückmeldung beim Ziehen mit dem Finger. Das Browserelement kann
 * all das seit Jahren; es fehlt ihm nur das Aussehen, und das ist in zwanzig Zeilen CSS
 * nachgeholt (`.kompass-regler` in index.css).
 *
 * **Warum „noch nicht gesetzt" ein eigener Zustand ist.** Ein Regler hat immer eine
 * Stellung — er kann nicht leer sein. Wer ihn nicht anfasst, hätte damit trotzdem eine
 * Fünf abgegeben, und die stünde später in der Kurve wie eine Angabe. Deshalb merkt sich
 * die Komponente, ob jemand ihn berührt hat, und gibt bis dahin `null` weiter. Sichtbar
 * ist das am blassen Griff in der Mitte — dieselbe Sprache wie der ungesetzte Punkt im
 * Gefühlsfeld.
 */
import type { KompassAnspannung } from '@/api/kompass'

export default function AnspannungsRegler({
  katalog, wert, onWahl,
}: {
  katalog: KompassAnspannung
  /** `null` heißt: nicht beantwortet. Nicht „null von zehn". */
  wert: number | null
  onWahl: (wert: number | null) => void
}) {
  const gesetzt = wert !== null
  const mitte = Math.round((katalog.min + katalog.max) / 2)
  const gezeigt = wert ?? mitte
  const anteil = (gezeigt - katalog.min) / Math.max(1, katalog.max - katalog.min)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="kompass-anspannung" className="text-[0.86rem] font-semibold text-navy">
          {katalog.label}
        </label>
        <span
          className={`text-[0.8rem] tabular-nums transition-colors ${
            gesetzt ? 'font-bold text-accent' : 'text-brand-muted'
          }`}
          aria-hidden="true"
        >
          {gesetzt ? `${wert} von ${katalog.max}` : 'ohne Angabe'}
        </span>
      </div>

      <input
        id="kompass-anspannung"
        type="range"
        min={katalog.min}
        max={katalog.max}
        step={1}
        value={gezeigt}
        onChange={e => onWahl(Number(e.target.value))}
        aria-valuetext={gesetzt ? `${wert} von ${katalog.max}` : 'noch nicht gesetzt'}
        className={`kompass-regler mt-3 w-full ${gesetzt ? '' : 'kompass-regler--offen'}`}
        style={{ '--fuellung': `${anteil * 100}%` } as React.CSSProperties}
      />

      <div className="mt-1 flex justify-between text-[0.72rem] text-brand-muted">
        <span>{katalog.links}</span>
        <span>{katalog.rechts}</span>
      </div>

      {/* Erst nach dem Setzen — vorher wäre es ein Knopf für einen Zustand, in dem man
          ohnehin schon ist. */}
      {gesetzt && (
        <button
          type="button"
          onClick={() => onWahl(null)}
          className="mt-2 text-[0.75rem] text-brand-muted underline decoration-brand-border underline-offset-2 transition-colors hover:text-navy"
        >
          Doch nicht angeben
        </button>
      )}
    </div>
  )
}
