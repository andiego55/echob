/**
 * HypothesisIcon – gebrandetes Themen-Icon fuer die Hypothesen (statt Emoji).
 * Rendert den SVG-Pfad (HypothesisDef.icon) in einer akzent-getoenten Kachel im
 * EchoB-Stil. Inline-flex, damit es in <p> wie in <div> passt.
 */
export default function HypothesisIcon(
  { path, size = 'md', className = '' }: { path: string; size?: 'sm' | 'md'; className?: string },
) {
  const tile = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const glyph = size === 'sm' ? 'h-[14px] w-[14px]' : 'h-[18px] w-[18px]'
  return (
    <span
      aria-hidden
      className={`inline-flex ${tile} shrink-0 items-center justify-center rounded-brand bg-accent/10 text-accent ${className}`}
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className={glyph}
      >
        <path d={path} />
      </svg>
    </span>
  )
}
