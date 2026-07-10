import type { ReactNode } from 'react'

/**
 * Rendert **fett** sicher als <strong> — OHNE dangerouslySetInnerHTML.
 * React escapt jedes Textsegment, daher kein XSS-Risiko, selbst wenn der Text
 * nutzer- oder KI-generiert ist und HTML/Script enthalten könnte.
 */
export function renderBold(text: string): ReactNode[] {
  return text.split(/\*\*(.*?)\*\*/g).map((seg, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-navy">{seg}</strong>
      : seg,
  )
}
