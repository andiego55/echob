/**
 * Vorlese-Modus — der Schritt aus der App heraus.
 *
 * **Warum das ein eigener Modus ist und kein Hinweistext.** Am Ende einer Runde Ehrliches
 * Mitteilen stand zuerst nur ein Satz: „Lest euch das beim nächsten Mal laut vor." Genau
 * darauf läuft die ganze Übung hinaus — und es war das Einzige, was die App nicht
 * unterstützte. Ein Ratschlag, den man befolgen muss, ohne dass irgendetwas hilft, wird
 * nicht befolgt.
 *
 * Hier liegt das Gerät zwischen zwei Menschen auf dem Tisch. Es zeigt eine Mitteilung,
 * groß, und sonst nichts. Wer sie geschrieben hat, liest sie laut vor. Dann tippt jemand
 * weiter.
 *
 * **Die Stille ist der Punkt.** Zwischen zwei Mitteilungen schiebt sich eine Karte, auf
 * der nichts steht außer der Aufforderung, nichts zu sagen. Im Kreis stellt sich diese
 * Pause von selbst ein, weil es unangenehm wäre hineinzureden; zu zweit überspringt man
 * sie und redet weiter. Sie hier zu erzwingen ist dieselbe Idee wie das fehlende
 * Eingabefeld beim Zuhören — die eine Sache, die Software besser kann als guter Wille.
 *
 * **Dunkel, nicht aus Dekoration.** Der Modus sieht aus wie kein anderer Teil der App,
 * damit sichtbar wird, dass die App gerade zurücktritt: kein Menü, keine Navigation, kein
 * Echo. Ein Bildschirm, ein Satz, zwei Menschen.
 */
import { useEffect, useState } from 'react'
import { schritteBauen, zuletztGelesen } from '@/lib/vorlesen'

export interface VorleseBeitrag {
  id: string
  name: string
  impulse_label: string | null
  body: string
}

export default function Vorlesen({
  beitraege, onEnde,
}: { beitraege: VorleseBeitrag[]; onEnde: () => void }) {
  const schritte = schritteBauen(beitraege.length)
  const anzahl = schritte.length
  const [nr, setNr] = useState(0)
  const schritt = schritte[nr]
  const weiter = () => setNr(n => Math.min(n + 1, anzahl - 1))

  // Tastatur für alle, die es am Rechner machen. Auf dem Tisch tippt man einfach irgendwo.
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onEnde(); return }
      if (e.key === 'ArrowLeft') { setNr(n => Math.max(n - 1, 0)); return }
      if ([' ', 'Enter', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        setNr(n => Math.min(n + 1, anzahl - 1))
      }
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [onEnde, anzahl])

  // Der Rest der Seite darf darunter nicht mitscrollen – sonst verrutscht das Gerät
  // beim Weitertippen auf dem Tisch.
  useEffect(() => {
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = vorher }
  }, [])

  const letzter = nr === schritte.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vorlesen"
      onClick={() => { if (!letzter) weiter() }}
      className="fixed inset-0 z-[150] flex cursor-pointer flex-col bg-navy text-white
                 selection:bg-white/20"
    >
      {/* Kopf: so wenig wie möglich. Nur der Ausgang und wo man ist. */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <span className="text-[0.68rem] uppercase tracking-[0.18em] text-white/35">
          {schritt.art === 'lesen'
            ? `${schritt.i + 1} von ${beitraege.length}`
            : 'Vorlesen'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onEnde() }}
          className="rounded-full px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          Beenden
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        {schritt.art === 'intro' && (
          <div className="max-w-[34ch] text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">Legt das Gerät zwischen euch.</h2>
            <p className="mt-5 text-sm leading-relaxed text-white/70">
              Gleich steht hier eine Mitteilung nach der anderen. Wer sie geschrieben hat,
              liest sie <strong className="font-semibold text-white">laut vor</strong> – in
              dem Tempo, das sich richtig anfühlt. Die andere hört zu und antwortet nicht.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Nach jeder Mitteilung bleibt es einen Moment still. Diese Stille gehört dazu.
            </p>
            <p className="mt-8 text-xs text-white/35">Tippt irgendwo, um weiterzugehen.</p>
          </div>
        )}

        {schritt.art === 'lesen' && (
          <div className="max-w-[42ch]">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-accent/90">
              {beitraege[schritt.i].name} liest vor
            </p>
            {beitraege[schritt.i].impulse_label && (
              <p className="mt-1.5 text-xs text-white/40">
                {beitraege[schritt.i].impulse_label}
              </p>
            )}
            <p className="mt-5 whitespace-pre-wrap text-xl font-light leading-relaxed sm:text-2xl">
              {beitraege[schritt.i].body}
            </p>
          </div>
        )}

        {/* Die Stille. Bewusst fast leer – jedes zusätzliche Wort wäre etwas zu lesen,
            und gelesen werden soll hier gerade nichts. */}
        {schritt.art === 'stille' && (
          <div className="max-w-[30ch] text-center">
            <span aria-hidden className="mx-auto block h-2 w-2 rounded-full bg-white/50" />
            <h2 className="mt-8 text-2xl font-light tracking-wide text-white/80">
              Nichts sagen.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Einmal durchatmen. Wenn es sich lang anfühlt, ist es genau richtig.
            </p>
          </div>
        )}

        {schritt.art === 'ende' && (
          <div className="max-w-[34ch] text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">Es steht.</h2>
            <p className="mt-5 text-sm leading-relaxed text-white/70">
              Ihr habt es euch gesagt – gerade eben ohne Bildschirm dazwischen, nur mit ihm
              als Souffleur. Genau darauf läuft die Übung hinaus.
            </p>
            <button
              onClick={e => { e.stopPropagation(); onEnde() }}
              className="mt-8 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-navy transition hover:bg-white/90"
            >
              Fertig
            </button>
          </div>
        )}
      </div>

      {/* Fortschritt: eine Marke je Mitteilung. Am Tisch soll man sehen, wie viel noch
          kommt, ohne dass eine Zahl im Blickfeld steht. */}
      {beitraege.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center gap-1.5">
          {beitraege.map((b, i) => (
            <span
              key={b.id}
              className={`h-1 rounded-full transition-all duration-300 ${
                schritt.art === 'lesen' && schritt.i === i
                  ? 'w-6 bg-accent'
                  : (schritt.art === 'ende'
                     || (schritt.art === 'lesen' && i < schritt.i)
                     || (schritt.art === 'stille' && i <= zuletztGelesen(schritte, nr)))
                    ? 'w-2.5 bg-white/45'
                    : 'w-2.5 bg-white/15'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
