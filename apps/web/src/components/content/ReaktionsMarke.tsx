/**
 * Die vier Marken der Resonanz-Reaktionen.
 *
 * Gezeichnet statt Emoji: Ein 🙋 neben einer Szene über Erschöpfung trifft den Ton nicht,
 * und Emoji als Abzeichen sind hier ohnehin nicht die Sprache des Hauses.
 *
 * Die Formen erzählen die Bedeutung: voller Punkt = jetzt, gestrichelter Ring mit blassem
 * Punkt = vorbei, gefüllte Hälfte = die andere Seite, leerer Ring = kenne ich nicht.
 *
 * Steht in einer eigenen Datei, seit sie an zwei Stellen gebraucht wird (Szenenseite und
 * Einstieg). Zweimal dasselbe SVG wäre die Sorte Verdopplung, die still auseinanderläuft:
 * Wer eine Form ändert, ändert sie an einer Stelle, und dann bedeutet derselbe Knopf an
 * zwei Orten etwas anderes.
 */
import type { Reaktion } from '@/lib/resonanz'

export default function ReaktionsMarke({
  art, groesse = 18,
}: { art: Reaktion; groesse?: number }) {
  const gemeinsam = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }
  return (
    <svg
      viewBox="0 0 20 20"
      width={groesse}
      height={groesse}
      className="flex-shrink-0"
      aria-hidden="true"
    >
      {art === 'kenne_ich' && (
        <>
          <circle cx="10" cy="10" r="7.4" {...gemeinsam} />
          <circle cx="10" cy="10" r="3.4" fill="currentColor" />
        </>
      )}
      {art === 'kannte_ich' && (
        <>
          <circle cx="10" cy="10" r="7.4" {...gemeinsam} strokeDasharray="2.2 2" />
          <circle cx="10" cy="10" r="3.4" fill="currentColor" opacity="0.45" />
        </>
      )}
      {art === 'andere_seite' && (
        <>
          <circle cx="10" cy="10" r="7.4" {...gemeinsam} />
          <path d="M10 2.6 A7.4 7.4 0 0 1 10 17.4 Z" fill="currentColor" opacity="0.9" />
        </>
      )}
      {art === 'nicht_meins' && <circle cx="10" cy="10" r="7.4" {...gemeinsam} />}
    </svg>
  )
}
