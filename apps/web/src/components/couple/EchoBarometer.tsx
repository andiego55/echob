/**
 * Das Zeichen des Stimmungsbarometers – zwei Echos, die einander entgegenschwingen.
 *
 * **Warum genau dieses Bild.** Der erste Entwurf war ein Punkt links mit Wellen nach rechts.
 * Das las sich als WLAN-Signalstärke: technisch, und schlimmer – „ich sende, du empfängst",
 * also eine Messung der anderen Person. Ein Beziehungsbarometer braucht ein wechselseitiges
 * Bild.
 *
 * Deshalb **zwei** Quellen. Bei niedrigen Werten hallt jede für sich, mit viel Leere
 * dazwischen. Je höher der Wert, desto weiter tragen die Wellen – bei 10 berühren sich die
 * Fronten in der Mitte. Resonanz, und damit buchstäblich EchoB.
 *
 * Bewusst **kein** Ampelverlauf: Rot-zu-Grün wäre eine Note; gefragt ist ein Zustand.
 * Deshalb kühles Navy → warmes Terrakotta.
 */

const KALT = [30, 58, 85] as const     // #1e3a55 – navy.mid
const WARM = [224, 123, 84] as const   // #e07b54 – accent
const GRAU = '#c9d3dd'

/** Die drei Wellenfronten je Seite (vor der Skalierung). */
const BASIS = [9, 18, 27]
const CY = 32

/** Farbe zum Wert: 1 = zurückgezogen und kühl, 10 = offen und warm. */
export function barometerColor(value: number): string {
  const t = Math.min(1, Math.max(0, (value - 1) / 9))
  const mix = KALT.map((k, i) => Math.round(k + (WARM[i] - k) * t))
  return `rgb(${mix.join(', ')})`
}

export default function EchoBarometer({
  value, size = 128, className,
}: { value: number | null; size?: number; className?: string }) {
  const gesetzt = value !== null
  const wert = value ?? 1
  const farbe = gesetzt ? barometerColor(wert) : GRAU

  // Öffnung, Reichweite und Abstand wachsen gemeinsam mit dem Wert. Bei 10 endet die
  // äußerste Front beider Seiten fast genau in der Mitte – sie berühren sich.
  const halbwinkel = ((30 + (wert - 1) * 3.6) * Math.PI) / 180
  const skala = 0.72 + ((wert - 1) / 9) * 0.26
  const lx = 18 + (wert - 1) * 0.4
  const rx = 78 - (wert - 1) * 0.4
  const anzahl = gesetzt ? Math.min(3, Math.max(1, Math.round(wert / 3))) : 0

  const seiten: [number, 1 | -1][] = [[lx, 1], [rx, -1]]

  return (
    <svg
      viewBox="0 0 96 64"
      width={size}
      height={(size * 64) / 96}
      className={className}
      role="img"
      aria-label={gesetzt ? `Barometer: ${wert} von 10` : 'Barometer noch nicht gestellt'}
    >
      {seiten.map(([cx, richtung]) => (
        <g key={richtung}>
          {BASIS.slice(0, anzahl).map((basis, i) => {
            const r = basis * skala
            const sx = cx + richtung * r * Math.cos(-halbwinkel)
            const sy = CY + r * Math.sin(-halbwinkel)
            const ex = cx + richtung * r * Math.cos(halbwinkel)
            const ey = CY + r * Math.sin(halbwinkel)
            const sweep = richtung === 1 ? 1 : 0
            return (
              <path
                key={basis}
                d={`M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 ${sweep} ${ex.toFixed(2)} ${ey.toFixed(2)}`}
                fill="none"
                stroke={farbe}
                strokeWidth={3.2 - i * 0.5}
                strokeOpacity={1 - i * 0.2}
                strokeLinecap="round"
                style={{ transition: 'stroke 300ms ease' }}
              />
            )
          })}
          <circle
            cx={cx}
            cy={CY}
            r={gesetzt ? 4.5 : 3.5}
            fill={gesetzt ? farbe : 'none'}
            stroke={gesetzt ? 'none' : GRAU}
            strokeWidth={1.6}
            style={{ transition: 'fill 300ms ease' }}
          />
        </g>
      ))}
    </svg>
  )
}

/** Der eigene Verlauf als schmale Linie – zeigt Bewegung, nicht Einzelwerte. */
export function BarometerSparkline({
  points, width = 180, height = 32,
}: { points: { value: number }[]; width?: number; height?: number }) {
  if (points.length < 2) return null

  const schritt = width / (points.length - 1)
  const y = (v: number) => height - 3 - ((v - 1) / 9) * (height - 6)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * schritt).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ')
  const letzter = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}
      preserveAspectRatio="none" role="img" aria-label="Dein Verlauf">
      <path d={d} fill="none" stroke={barometerColor(letzter.value)} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={width} cy={y(letzter.value)} r={2.5} fill={barometerColor(letzter.value)} />
    </svg>
  )
}
