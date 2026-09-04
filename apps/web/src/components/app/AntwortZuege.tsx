/**
 * Züge unter Echos letzter Antwort.
 *
 * **Warum es das gibt.** Das Fenster sah bis hierher aus wie jedes andere Chatfenster —
 * ein Eingabefeld, sonst nichts. Alles, was Echo besser macht, lag unsichtbar dahinter.
 * Diese vier Knöpfe sind das Gegenteil: Sie sagen in einer Sekunde, was für ein Werkzeug
 * das ist. Wer unter der allerersten Antwort „Widersprich mir" stehen sieht, hat
 * verstanden, dass hier keine Bestätigungsmaschine sitzt.
 *
 * **Warum nur unter der LETZTEN Antwort.** Unter jeder zu stehen wäre Lärm — und ein Klick
 * an einer alten Stelle schickte eine Nachfrage, die sich auf etwas bezieht, das drei
 * Beiträge zurückliegt. Der Zug gehört an das Ende des Gesprächs, nicht in seine Mitte.
 *
 * Welche Züge es gibt und wann einer wegfällt, steht in `antwortZuegeDaten.ts`.
 */
import { zuegeFuer } from './antwortZuegeDaten'
import type { Einstufung } from '@/lib/sseLeser'

interface Props {
  onZug: (text: string) => void
  /** Während eine Antwort entsteht, wird nichts angeboten. */
  aus?: boolean
  /** Einstufung der Nachricht, unter der die Züge stehen. */
  safety?: Einstufung
}

export default function AntwortZuege({ onZug, aus, safety }: Props) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Weiter mit Echo">
      {zuegeFuer(safety).map(z => (
        <button
          key={z.id}
          type="button"
          onClick={() => onZug(z.text)}
          disabled={aus}
          title={z.titel}
          className="rounded-full border border-brand-border px-2.5 py-1 text-[0.7rem] text-brand-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {z.label}
        </button>
      ))}
    </div>
  )
}
