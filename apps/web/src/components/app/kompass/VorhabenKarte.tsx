/**
 * Ein Vorhaben mit seinen Schritten.
 *
 * **Die Schritte sind der Unterschied zwischen Vorhaben und Vorsatz.** Ein Vorsatz ist
 * ein Satz; ein Vorhaben hat etwas, das man abhaken kann. Deshalb stehen die Schritte
 * offen auf der Karte und nicht hinter einem Aufklapper — was man nicht sieht, hakt man
 * nicht ab.
 *
 * **Der Balken zeigt Fortschritt, nicht Rückstand.** Er füllt sich von links und bleibt
 * unauffällig, wenn nichts erledigt ist. Ein roter Rest oder ein Prozentwert machte aus
 * einem Vorhaben eine Leistungsanzeige — und aus drei offenen Schritten ein Versäumnis.
 *
 * **Die Rückschau ist eine Einladung, keine Mahnung.** Sie erscheint, wenn der selbst
 * gewählte Abstand vorbei ist, und sie lässt sich mit einem Klick erledigen. Es gibt
 * keine Zählung verpasster Rückschauen und keine Farbe dafür.
 */
import Chip from '@/components/Chip'
import type { Schritt, Vorhaben, VorhabenAenderung } from '@/api/kompass'
import { altersWort, rueckschauFaellig } from '@/lib/kompass'

export default function VorhabenKarte({ vorhaben: v, onAendern, onLoeschen, laeuft }: {
  vorhaben: Vorhaben
  onAendern: (a: VorhabenAenderung) => void
  onLoeschen: () => void
  laeuft: boolean
}) {
  const laeuftNoch = v.stand === 'laufend'
  const erreicht = v.stand === 'erreicht'
  const faellig = laeuftNoch && rueckschauFaellig(v)
  const anteil = v.schritte.length > 0 ? v.schritte_erledigt / v.schritte.length : 0

  const schrittUmschalten = (s: Schritt) => {
    const neu: Schritt[] = v.schritte.map(x =>
      x.id === s.id
        ? { ...x, erledigt_at: x.erledigt_at ? null : new Date().toISOString() }
        : x,
    )
    onAendern({ schritte: neu })
  }

  return (
    <article
      className={`rounded-brand border bg-brand-card p-4 shadow-brand-sm transition-all ${
        faellig ? 'border-accent/45' : 'border-brand-border'
      } ${erreicht ? 'opacity-75' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip ton={erreicht ? 'aktiv' : laeuftNoch ? 'wartet' : 'ruht'}>
          {v.stand_label ?? v.stand}
        </Chip>
        {v.schritte.length > 0 && (
          <span className="text-[0.72rem] text-brand-muted">
            {v.schritte_erledigt} von {v.schritte.length} Schritten
          </span>
        )}
        {v.rueckschau_am && (
          <span className="text-[0.72rem] text-brand-muted">
            · zurückgeschaut {altersWort(v.rueckschau_am)}
          </span>
        )}
      </div>

      <h3 className={`mt-2 text-[1.05rem] font-semibold leading-snug ${
        erreicht ? 'text-brand-muted' : 'text-navy'
      }`}>
        {v.titel}
      </h3>

      {v.warum && (
        <p className="mt-1 text-[0.85rem] italic leading-relaxed text-brand-muted">
          {v.warum}
        </p>
      )}

      {v.schritte.length > 0 && (
        <>
          {/* Füllt sich von links, ohne Zahl. Ein Prozentwert machte aus einem Vorhaben
              eine Leistungsanzeige. */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-brand-border/60">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500 motion-reduce:transition-none"
              style={{ width: `${anteil * 100}%` }}
            />
          </div>

          <ul className="mt-3 space-y-1.5">
            {v.schritte.map(s => (
              <li key={s.id ?? s.text}>
                <label className="flex cursor-pointer items-start gap-2.5 text-[0.9rem]">
                  <input
                    type="checkbox"
                    checked={!!s.erledigt_at}
                    disabled={laeuft}
                    onChange={() => schrittUmschalten(s)}
                    className="mt-[3px] accent-accent"
                  />
                  <span className={s.erledigt_at
                    ? 'text-brand-muted line-through decoration-brand-muted/50'
                    : 'text-brand-text'}>
                    {s.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {faellig && (
        <div className="beitrag-neu mt-3 rounded-brand-sm bg-accent/[0.07] px-3 py-2">
          <p className="text-[0.84rem] leading-relaxed text-navy">
            Du wolltest hier {v.rhythmus_tage === 7 ? 'wöchentlich'
              : v.rhythmus_tage === 14 ? 'alle zwei Wochen' : 'monatlich'} zurückschauen.
            Stimmt das Vorhaben noch?
          </p>
          <button
            type="button"
            disabled={laeuft}
            onClick={() => onAendern({ zurueckgeschaut: true })}
            className="mt-1.5 text-[0.82rem] font-semibold text-accent transition-colors hover:text-accent-hover disabled:opacity-50"
          >
            Zurückgeschaut
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {laeuftNoch && (
          <>
            <button
              type="button" disabled={laeuft}
              onClick={() => onAendern({ stand: 'erreicht' })}
              className="text-[0.8rem] font-semibold text-accent transition-colors hover:text-accent-hover disabled:opacity-50"
            >
              Erreicht
            </button>
            <button
              type="button" disabled={laeuft}
              onClick={() => onAendern({ stand: 'ruht' })}
              className="text-[0.8rem] text-brand-muted transition-colors hover:text-navy disabled:opacity-50"
            >
              Ruhen lassen
            </button>
          </>
        )}

        {!laeuftNoch && (
          <button
            type="button" disabled={laeuft}
            onClick={() => onAendern({ stand: 'laufend' })}
            className="text-[0.8rem] text-brand-muted transition-colors hover:text-navy disabled:opacity-50"
          >
            {erreicht ? 'Doch noch offen' : 'Wieder aufnehmen'}
          </button>
        )}

        <button
          type="button"
          onClick={onLoeschen}
          className="ml-auto text-[0.8rem] text-brand-muted transition-colors hover:text-red-600"
        >
          Löschen
        </button>
      </div>
    </article>
  )
}
