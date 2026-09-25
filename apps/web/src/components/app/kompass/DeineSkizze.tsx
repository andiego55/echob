/**
 * Der Spiegel: das Bild der Skizze und der Text daneben.
 *
 * **Er steht mitten in der Arbeit, nicht am Ende.** Ein Ergebnis, das erst nach dem letzten
 * Schritt erscheint, belohnt Ausdauer. Dieser hier wächst beim Antippen mit — und genau das
 * ist der Nutzen: Man sieht die eigene Gewichtung, während man sie noch ändern kann.
 *
 * **Bänder aus HTML und nicht aus SVG.** Ungewohnt, und überlegt: Die Breite ist eine Zahl in
 * Prozent, also animiert CSS sie von selbst; der Text darin bricht und kürzt sich von selbst;
 * und am Telefon rechnet niemand ein viewBox um. Ein SVG wäre dreimal so viel Code für ein
 * Bild, das aus Rechtecken besteht.
 *
 * **Warum das Bild keine Rangzahlen trägt.** Eine 1 neben dem obersten Wunsch machte daraus
 * eine Bewertung. Die Reihenfolge ist im Bild zu sehen, weil sie oben ist — mehr braucht es
 * nicht, und mehr wäre eine Note.
 *
 * **Das Etikett steht ÜBER dem Band, nicht darin.** Die erste Fassung schrieb es hinein, und
 * in der Attrappe stand dann „Ich darf meiner Wahrnehmun…" — ein Aspekt mit kleinem Gewicht
 * bekommt ein schmales Band, und ausgerechnet dort wurde der Satz abgeschnitten. Wer wenig
 * von etwas will, soll es trotzdem lesen können. Jetzt ist das Band eine reine Form, und der
 * Text darüber bricht, statt zu verschwinden.
 *
 * **Und warum darunter steht, dass kein Modell beteiligt war.** Wer einen Text über sich
 * liest, fragt sich, wer ihn geschrieben hat. Bei einer Deutung darf man zweifeln; das hier
 * ist nur eine andere Anordnung der eigenen Angaben. Das muss dastehen, sonst nützt es nichts.
 */
import { useMemo } from 'react'
import { gestalt, satzTeile, type Entwurf, type Vokabular } from '@/lib/skizzenbild'

export default function DeineSkizze({ entwurf, vokabular }: {
  entwurf: Entwurf
  vokabular: Vokabular
}) {
  const baender = useMemo(() => gestalt(entwurf, vokabular), [entwurf, vokabular])
  const absaetze = useMemo(() => satzTeile(entwurf, vokabular), [entwurf, vokabular])

  // Solange nichts dasteht, steht hier nichts. Ein leerer Rahmen mit „noch nichts" wäre
  // eine Aufforderung an jemanden, der gerade erst ankommt.
  if (baender.length === 0 && absaetze.length === 0) return null

  return (
    <section className="mt-6 overflow-hidden rounded-brand-lg border border-accent/25 bg-accent/[0.03]">
      <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
        {baender.length > 0 && (
          <div>
            <span className="label">Deine Skizze</span>
            <ul className="mt-3 space-y-2.5">
              {baender.map(b => (
                <li key={b.key}>
                  <span
                    className={`block text-[0.78rem] leading-snug ${
                      b.geordnet ? 'font-semibold text-navy' : 'text-brand-text'
                    }`}
                  >
                    {b.label}
                  </span>
                  <span
                    // Die Breite ist das Gewicht. Sie ändert sich am Regler, und der Übergang
                    // macht aus dem Verschieben eine sichtbare Folge.
                    style={{ width: `${b.breite}%` }}
                    className={`skizze-band mt-1 block h-2 rounded-full ${
                      b.geordnet ? 'bg-accent' : 'bg-accent/30'
                    }`}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
            {baender.some(b => !b.geordnet) && baender.some(b => b.geordnet) && (
              // Zwei Farben brauchen einen Satz, sonst rät man.
              <p className="mt-3 text-[0.7rem] leading-snug text-brand-muted">
                Kräftig: was du in eine Reihenfolge gebracht hast. Die Länge ist das Gewicht.
              </p>
            )}
          </div>
        )}

        {absaetze.length > 0 && (
          <div className="min-w-0">
            <div className="space-y-2">
              {absaetze.map((teile, i) => (
                <p key={i} className="text-[0.92rem] leading-relaxed text-brand-text">
                  {teile.map((teil, j) =>
                    teil.art === 'marke' ? (
                      <em key={j} className="font-semibold not-italic text-navy">{teil.wert}</em>
                    ) : (
                      <span key={j}>{teil.wert}</span>
                    ),
                  )}
                </p>
              ))}
            </div>
            <p className="mt-3 text-[0.7rem] leading-snug text-brand-muted/90">
              Zusammengesetzt aus dem, was du angetippt hast — Echo hat daran nichts
              geschrieben und nichts hinzugefügt.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
