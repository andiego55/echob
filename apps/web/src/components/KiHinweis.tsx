/**
 * „Hier schreibt eine KI" — direkt am Eingabefeld.
 *
 * **Warum das sein muss.** Art. 50 Abs. 1 der KI-Verordnung verlangt, dass Menschen
 * klar und eindeutig erfahren, dass sie mit einem KI-System sprechen — spätestens bei
 * der ersten Interaktion. Die Pflicht gilt seit dem 2. August 2026 und hat für Chatbots
 * in direkter Interaktion **keine Übergangsfrist**.
 *
 * **Warum nicht nur in der Datenschutzerklärung.** Die nennt OpenAI an siebzehn Stellen,
 * aber sie steht nicht dort, wo geschrieben wird. Die Verordnung meint den Moment der
 * Interaktion, nicht ein Dokument, das man vorher hätte lesen können.
 *
 * **Warum er bleibt und sich nicht wegklicken lässt.** Ein Hinweis, den man einmal
 * bestätigt, ist beim zweiten Gespräch weg — und beim zwanzigsten weiß niemand mehr, ob
 * er je da war. Eine Zeile in Grau kostet nichts und beantwortet die Frage jedes Mal.
 *
 * **Der zweite Satz ist keine Pflicht, aber ehrlich.** Wer über belastende Dinge
 * schreibt, soll wissen, dass die Antwort danebenliegen kann.
 */
export default function KiHinweis({ name = 'Echo', className = '' }: {
  /** Wie das Gegenüber im jeweiligen Bereich heißt. */
  name?: string
  className?: string
}) {
  return (
    <p className={`text-center text-[11px] leading-relaxed text-brand-muted/80 ${className}`}>
      <span className="font-medium text-brand-muted">{name} ist eine KI</span>, kein Mensch.
      Antworten können danebenliegen — und ersetzen keine Beratung oder Therapie.
    </p>
  )
}
