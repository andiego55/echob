/**
 * Echos Wartefigur – dieselben Wellen wie im Barometer, nur in Bewegung.
 *
 * Vorher stand überall nur „Echo denkt nach …" als Text. Eine App, die an sechs Stellen
 * mehrere Sekunden rechnet, braucht ein eigenes Zeichen dafür statt eines geliehenen
 * Kringels – und wenn es ohnehin eines gibt, dann das der Marke.
 *
 * Der Text daneben ist Absicht: Bei Mediation und Rückblick dauert es lang genug, dass
 * „Ich lese beide Sichten …" ehrlicher ist als ein anonymer Ladebalken.
 *
 * Die Farbe wird geerbt (`currentColor`), damit die Figur sowohl auf hellem Grund als auch
 * in einem gefuellten Knopf funktioniert.
 */

export default function EchoThinking({
  text, size = 44, className,
}: { text?: string; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`} role="status">
      <svg
        width={size}
        height={(size * 64) / 96}
        viewBox="0 0 96 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <path className="echo-welle" d="M 25.0 21.9 A 9.5 9.5 0 0 1 25.0 42.1" strokeWidth={3.2} />
          <path className="echo-welle" d="M 33.6 15.0 A 19.0 19.0 0 0 1 33.6 49.0" strokeWidth={2.7} />
          <path className="echo-welle" d="M 42.2 8.1 A 28.5 28.5 0 0 1 42.2 55.9" strokeWidth={2.2} />
        </g>
        <circle cx="18" cy="32" r="4.5" fill="currentColor" />
      </svg>
      {text && <span className="text-sm">{text}</span>}
      <span className="sr-only">{text || 'Echo arbeitet'}</span>
    </span>
  )
}
