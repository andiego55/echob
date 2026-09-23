/**
 * „Stimmt das noch?" — ein alter Satz, der sich noch einmal zeigt.
 *
 * **Der Grund zurückzukommen liegt im Raum selbst.** Wir haben Benachrichtigungen
 * ausgeschlossen; dann muss hier etwas sein, das auf einen wartet. Eine Frage, die
 * dasteht, ist so etwas — eine Erinnerung, die einem nachläuft, wäre das Gegenteil.
 *
 * **Drei Knöpfe, und alle drei sind eine vollständige Antwort.** Keiner davon ist die
 * richtige, keiner ist das Wegklicken. Deshalb sehen sie auch gleich wichtig aus: Stünde
 * „stimmt" als voller Knopf und der Rest als Kleingedrucktes, wäre die Frage rhetorisch.
 *
 * **„Hat sich verändert" öffnet ein Feld und macht nichts vorher.** Der alte Satz wird
 * erst überholt, wenn der neue dasteht — sonst bleibt jemand, der es sich anders
 * überlegt, mit einem überholten Satz und ohne Ersatz zurück.
 *
 * **Danach stehen beide da.** Das Nebeneinander ist der eigentliche Zweck, und deshalb
 * zeigt die Karte es nach dem Antworten auch: der alte durchgestrichen, der neue
 * darunter. Ein Satz, der still verschwindet, wäre eine Änderung ohne Geschichte.
 */
import { useState } from 'react'
import Fehlermeldung from '@/components/Fehlermeldung'
import Chip from '@/components/Chip'
import type { Satz } from '@/api/kompass'
import { altersWort } from '@/lib/kompass'

export interface PruefungsErgebnis {
  alt: Satz
  neu: Satz | null
}

export default function StimmtDasNoch({ satz, onAntworten, maxZeichen }: {
  satz: Satz
  onAntworten: (antwort: string, neuerText?: string) => Promise<PruefungsErgebnis>
  maxZeichen: number
}) {
  const [schreibt, setSchreibt] = useState(false)
  const [text, setText] = useState(satz.text)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<unknown>(null)
  const [fertig, setFertig] = useState<PruefungsErgebnis | null>(null)

  async function antworten(antwort: string, neuerText?: string) {
    if (laeuft) return
    setLaeuft(true)
    setFehler(null)
    try {
      setFertig(await onAntworten(antwort, neuerText))
    } catch (e) {
      setFehler(e)
    } finally {
      setLaeuft(false)
    }
  }

  // ── Danach ────────────────────────────────────────────────────────────────
  if (fertig) {
    return (
      <section className="beitrag-neu card card-static border-accent/40">
        {fertig.neu ? (
          <>
            <p className="section-label">Daraus ist geworden</p>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-brand-muted line-through decoration-brand-muted/50">
              „{fertig.alt.text}"
            </p>
            <p className="mt-1.5 text-[1.02rem] leading-relaxed text-navy">
              „{fertig.neu.text}"
            </p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-brand-muted">
              Beide bleiben stehen. Nebeneinander gelesen zeigen sie, was sich bewegt hat
              — der alte war einmal richtig.
            </p>
          </>
        ) : fertig.alt.stand === 'ueberholt' ? (
          <p className="text-[0.92rem] leading-relaxed text-brand-text">
            Der Satz steht jetzt bei den überholten. Er verschwindet nicht — er war
            einmal richtig, und das gehört dazu.
          </p>
        ) : (
          <p className="text-[0.92rem] leading-relaxed text-brand-text">
            Gut. Er bleibt, wie er ist — mit dem Datum von damals.
          </p>
        )}
      </section>
    )
  }

  // ── Die Frage ─────────────────────────────────────────────────────────────
  return (
    <section className="card card-static border-accent/40 bg-accent/[0.04]">
      <p className="section-label">Stimmt das noch?</p>
      <p className="mt-2 text-[0.84rem] text-brand-muted">
        {satz.bestaetigt_at && <>Das hast du {altersWort(satz.bestaetigt_at)} gesagt:</>}
      </p>
      <blockquote className="mt-1.5 border-l-2 border-accent/50 pl-3 text-[1.05rem] leading-relaxed text-navy">
        „{satz.text}"
      </blockquote>
      <div className="mt-2">
        <Chip ton="wartet">{satz.art_label ?? satz.art}</Chip>
      </div>

      {schreibt ? (
        <div className="beitrag-neu mt-4">
          <label
            htmlFor="pruefung-neu"
            className="block text-[0.84rem] font-semibold text-navy"
          >
            Wie würdest du es heute sagen?
          </label>
          <textarea
            id="pruefung-neu"
            value={text}
            onChange={e => setText(e.target.value.slice(0, maxZeichen))}
            rows={3}
            autoFocus
            className="input mt-2 resize-y text-[0.98rem] leading-relaxed"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!text.trim() || text.trim() === satz.text || laeuft}
              onClick={() => antworten('veraendert', text)}
              className="btn-primary !px-4 !py-1.5 !text-sm disabled:opacity-50"
            >
              {laeuft ? 'Wird gespeichert …' : 'So stimmt es'}
            </button>
            <button
              type="button"
              onClick={() => { setSchreibt(false); setText(satz.text) }}
              className="text-[0.82rem] text-brand-muted transition-colors hover:text-navy"
            >
              Zurück
            </button>
          </div>
          {text.trim() === satz.text && (
            <p className="mt-1.5 text-[0.78rem] text-brand-muted">
              Noch unverändert — ändere etwas, oder geh zurück und sag „stimmt".
            </p>
          )}
        </div>
      ) : (
        // Drei gleich starke Knoepfe. Waere "stimmt" hervorgehoben, waere die Frage
        // rhetorisch - und die ehrlichste Antwort die unbequemste.
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button" disabled={laeuft}
            onClick={() => antworten('stimmt')}
            className="btn-quiet !px-4 !py-1.5 !text-sm disabled:opacity-50"
          >
            Stimmt
          </button>
          <button
            type="button" disabled={laeuft}
            onClick={() => setSchreibt(true)}
            className="btn-quiet !px-4 !py-1.5 !text-sm disabled:opacity-50"
          >
            Hat sich verändert
          </button>
          <button
            type="button" disabled={laeuft}
            onClick={() => antworten('stimmt_nicht_mehr')}
            className="btn-quiet !px-4 !py-1.5 !text-sm disabled:opacity-50"
          >
            Stimmt nicht mehr
          </button>
        </div>
      )}

      <Fehlermeldung error={fehler} className="mt-3" />
    </section>
  )
}
