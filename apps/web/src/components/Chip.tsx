/**
 * Ein Zustand als Chip.
 *
 * **Warum als eigener Baustein.** Der Paarraum hatte ein festes Format dafür und benutzte es
 * an sechs Stellen. Der Nutzerbereich hatte gar keines — dort stand der Zustand als
 * Fließtext, teils in Klammern und rot: `(widerrufen)`. Das liest sich wie ein Fehler,
 * obwohl „widerrufen" ein völlig normaler Zustand ist.
 *
 * Ein Chip wird erkannt, bevor er gelesen wird. Das ist der eigentliche Punkt: In einer
 * Liste aus zwölf Freigaben findet man den einen widerrufenen an der Farbe, nicht am Text.
 *
 * **Die vier Töne sind eine Bedeutung, keine Palette.** Wer einen fünften Ton braucht,
 * braucht meistens eine andere Einteilung.
 */
export type ChipTon = 'aktiv' | 'wartet' | 'ruht' | 'achtung'

const TOENE: Record<ChipTon, string> = {
  /** Gilt, läuft, ist bestätigt. */
  aktiv:   'bg-green-50 text-green-700',
  /** Liegt bei jemandem — es fehlt noch ein Zug. */
  wartet:  'bg-accent/10 text-accent',
  /** Vorbei, beendet, zurückgezogen. Kein Fehler, nur nicht mehr aktuell. */
  ruht:    'bg-brand-bg text-brand-muted',
  /** Etwas stimmt nicht. Sparsam — sonst gewöhnt sich das Auge daran. */
  achtung: 'bg-red-50 text-red-700',
}

export default function Chip({
  ton = 'ruht', children, className = '',
}: {
  ton?: ChipTon
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${TOENE[ton]} ${className}`}
    >
      {children}
    </span>
  )
}
