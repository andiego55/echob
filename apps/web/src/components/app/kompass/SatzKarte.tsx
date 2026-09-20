/**
 * Ein Satz über mich, als Karte.
 *
 * **Was diese Karte leisten muss: den Satz als Einschätzung lesbar machen, nicht als
 * Eigenschaft.** Dafür sorgen drei Dinge. Die Art steht als Etikett davor, damit klar
 * ist, welche Frage der Satz beantwortet. Das ALTER der Zustimmung steht daneben —
 * „bestätigt vor sieben Monaten" ist etwas anderes als ein Satz ohne Zeit. Und ein
 * überholter Satz wird durchgestrichen und blasser, statt zu verschwinden: Dass etwas
 * nicht mehr stimmt, ist selbst eine Auskunft.
 *
 * **Warum „Löschen" rechts aussen steht.** Es ist der einzige Knopf ohne Rückweg. Zwischen
 * ihm und den anderen liegt deshalb Platz, nicht nur eine andere Farbe.
 */
import Chip from '@/components/Chip'
import type { Satz, SatzAenderung } from '@/api/kompass'
import { altersWort } from '@/lib/kompass'

export default function SatzKarte({ satz: s, onAendern, onLoeschen, laeuft }: {
  satz: Satz
  onAendern: (a: SatzAenderung) => void
  onLoeschen: () => void
  laeuft: boolean
}) {
  const entwurf = s.stand === 'entwurf'
  const ueberholt = s.stand === 'ueberholt'

  return (
    <article
      className={`rounded-brand border bg-brand-card p-4 shadow-brand-sm transition-all ${
        s.angeheftet ? 'border-accent/45' : 'border-brand-border'
      } ${ueberholt ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip ton={entwurf ? 'wartet' : ueberholt ? 'ruht' : 'aktiv'}>
          {s.art_label ?? s.art}
        </Chip>
        {s.angeheftet && <Chip ton="wartet">angeheftet</Chip>}
        {/* Das Alter der Zustimmung, sichtbar. Ohne das liest sich der Satz wie eine
            Eigenschaft statt wie eine Einschätzung von einem bestimmten Tag. */}
        {s.bestaetigt_at && (
          <span className="text-[0.72rem] text-brand-muted">
            bestätigt {altersWort(s.bestaetigt_at)}
          </span>
        )}
        {s.szene_id && (
          <span className="text-[0.72rem] text-brand-muted">· aus einer Szene</span>
        )}
      </div>

      <p
        className={`mt-2 text-[1.02rem] leading-relaxed ${
          // Die Durchstreichung muss man SEHEN. In `decoration-brand-border` war sie
          // auf hellem Grund praktisch unsichtbar, und der Satz las sich wie ein
          // gueltiger, nur etwas blasser.
          ueberholt ? 'text-brand-muted line-through decoration-brand-muted/60' : 'text-navy'
        }`}
      >
        {s.text}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {entwurf && (
          <button
            type="button"
            disabled={laeuft}
            onClick={() => onAendern({ stand: 'bestaetigt' })}
            className="text-[0.8rem] font-semibold text-accent transition-colors hover:text-accent-hover disabled:opacity-50"
          >
            Stimmt — bestätigen
          </button>
        )}

        {s.stand === 'bestaetigt' && (
          <>
            <button
              type="button"
              disabled={laeuft}
              onClick={() => onAendern({ angeheftet: !s.angeheftet })}
              className="text-[0.8rem] text-brand-muted transition-colors hover:text-navy disabled:opacity-50"
            >
              {s.angeheftet ? 'Nicht mehr anheften' : 'Anheften'}
            </button>
            <button
              type="button"
              disabled={laeuft}
              onClick={() => onAendern({ stand: 'ueberholt' })}
              className="text-[0.8rem] text-brand-muted transition-colors hover:text-navy disabled:opacity-50"
            >
              Stimmt nicht mehr
            </button>
          </>
        )}

        {ueberholt && (
          <button
            type="button"
            disabled={laeuft}
            onClick={() => onAendern({ stand: 'bestaetigt' })}
            className="text-[0.8rem] text-brand-muted transition-colors hover:text-navy disabled:opacity-50"
          >
            Gilt doch wieder
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
