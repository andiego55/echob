/**
 * Zeichnungen für die drei leersten Momente im Paarraum.
 *
 * **Warum überhaupt.** Ein Leerzustand aus reinem Text ist kalt, und gerade an diesen drei
 * Stellen steht jemand zum ersten Mal davor. Ein Bild nimmt einer leeren Seite etwas, das
 * kein Satz ihr nehmen kann.
 *
 * **Warum abstrakt.** Gezeichnete Menschen wären hier falsch: Sie hätten ein Alter, ein
 * Geschlecht, eine Laune — und jede dieser Festlegungen schließt jemanden aus, der sich
 * gerade wiederfinden soll. Deshalb dieselbe Sprache wie im Barometer: zwei Punkte, Wellen,
 * kühles Navy und warmes Terrakotta. Keine Gesichter, keine Niedlichkeit.
 *
 * Jedes Bild zeigt dasselbe Prinzip — es ist etwas da, und etwas fehlt noch sichtbar.
 * Gestrichelt ist immer das, was noch aussteht.
 */

const NAVY = '#1e3a55'
const ACCENT = '#e07b54'
const LINIE = '#c9d3dd'
const FLAECHE = '#eaf0f6'

type Props = { className?: string }

const rahmen = (className?: string) =>
  `mx-auto block w-full max-w-[260px] ${className ?? ''}`

/** Kein Paarraum: Eine ist da und ruft, der zweite Platz ist noch frei. */
export function ArtEinladung({ className }: Props) {
  return (
    <svg viewBox="0 0 260 120" className={rahmen(className)} role="img"
      aria-label="Eine Person ist da, der Platz der zweiten ist noch frei">
      <circle cx="42" cy="60" r="8" fill={ACCENT} />
      <g fill="none" stroke={ACCENT} strokeLinecap="round">
        <path d="M 58.7 41.2 A 26 26 0 0 1 58.7 78.8" strokeWidth={3.4} />
        <path d="M 71.5 26.8 A 46 46 0 0 1 71.5 93.2" strokeWidth={2.9} opacity={0.55} />
        {/* Die äußerste Welle ist noch unterwegs. */}
        <path d="M 84.4 12.4 A 66 66 0 0 1 84.4 107.6" strokeWidth={2.4} opacity={0.3}
          strokeDasharray="7 9" />
      </g>
      <circle cx="196" cy="60" r="20" fill="none" stroke={LINIE} strokeWidth={2.2}
        strokeDasharray="5 6" />
    </svg>
  )
}

/** Kein Gespräch: Zwei sitzen einander gegenüber, Echo darüber, die Mitte ist leer. */
export function ArtTisch({ className }: Props) {
  return (
    <svg viewBox="0 0 260 120" className={rahmen(className)} role="img"
      aria-label="Zwei sitzen einander an einem Tisch gegenüber, Echo darüber">
      {/* Echo: zentriert und abgesetzt — man sieht die Moderationsrolle. */}
      <circle cx="130" cy="26" r="5" fill={ACCENT} />
      <circle cx="130" cy="26" r="14" fill="none" stroke={ACCENT} strokeWidth={2} opacity={0.38} />
      {/* Das Gespräch, das noch nicht stattgefunden hat. */}
      <path d="M 78 66 H 182" stroke={LINIE} strokeWidth={2} strokeLinecap="round"
        strokeDasharray="2 8" fill="none" />
      <path d="M 34 90 H 226" stroke={LINIE} strokeWidth={3} strokeLinecap="round" fill="none" />
      <path d="M 62 90 V 110 M 198 90 V 110" stroke={LINIE} strokeWidth={2.4}
        strokeLinecap="round" fill="none" />
      <circle cx="62" cy="66" r="8.5" fill={NAVY} />
      <circle cx="198" cy="66" r="8.5" fill={NAVY} />
    </svg>
  )
}

/** Kein Thema: Zwei Ufer, ein Bogen steht schon, der Rest ist offen. */
export function ArtBruecke({ className }: Props) {
  return (
    <svg viewBox="0 0 260 120" className={rahmen(className)} role="img"
      aria-label="Zwei Ufer, ein Brückenbogen steht, der Rest ist noch offen">
      <path d="M 10 84 H 84 V 112 H 10 Z" fill={FLAECHE} />
      <path d="M 10 84 H 84" stroke={LINIE} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      <path d="M 176 66 H 250 V 112 H 176 Z" fill={FLAECHE} />
      <path d="M 176 66 H 250" stroke={LINIE} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      {/* Der erste Bogen steht — flach genug, dass er nach Spannweite aussieht, nicht nach Sprung. */}
      <path d="M 84 84 C 102 60, 118 52, 132 50" stroke={ACCENT} strokeWidth={3.2}
        strokeLinecap="round" fill="none" />
      <path d="M 132 50 C 148 48, 161 54, 176 66" stroke={LINIE} strokeWidth={2.6}
        strokeLinecap="round" strokeDasharray="5 8" fill="none" />
      <circle cx="42" cy="74" r="7.5" fill={NAVY} />
      <circle cx="218" cy="56" r="7.5" fill={NAVY} />
    </svg>
  )
}
