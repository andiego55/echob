/**
 * „Gerade nicht erreichbar" — der Hinweis, der eine Seite stehen lässt.
 *
 * **Warum es diesen Baustein gibt.** Die Seiten des Paarraums fragen alle zehn bis zwanzig
 * Sekunden nach, ob etwas Neues da ist. Schlägt eine dieser Nachfragen fehl — abgelaufener
 * Token, Neustart des Servers, Funkloch im Zug —, dann war die Seite bis hierher weg: An
 * ihre Stelle trat „Paarraum nicht gefunden" oder „Thema lässt sich nicht öffnen", obwohl
 * beides existiert und einen Atemzug vorher noch dastand.
 *
 * **Das ist teurer als es klingt.** Wer mitten in einem schweren Gespräch liest, der Raum
 * sei beendet, glaubt es — und das Geschriebene im Eingabefeld ist mit dem Umbau der Seite
 * ohnehin fort. Ein Hinweis über dem letzten Stand ist in jeder Hinsicht die bessere
 * Auskunft: Er sagt, was los ist, und nimmt nichts weg.
 *
 * Nur wenn es gar keinen letzten Stand gibt oder der Server wirklich „weg" sagt (404/410),
 * gehört ein Leerzustand hin — dafür ist ``istEndgueltigWeg`` da.
 */
import { apiErrorMessage } from '@/api/errors'

export default function Verbindungshinweis({
  error, className = 'mb-4',
}: {
  /** Der Fehler der Abfrage. `null`/`undefined` rendert nichts. */
  error: unknown
  className?: string
}) {
  if (!error) return null
  return (
    <div
      role="status"
      className={`rounded-brand border border-amber-300/70 bg-amber-50/50 px-4 py-2.5 ${className}`}
    >
      <p className="text-xs leading-relaxed text-brand-text">
        <span className="font-semibold">Gerade nicht erreichbar.</span>{' '}
        Was hier steht, ist der letzte Stand — es wird weiter versucht.
      </p>
      <p className="mt-0.5 text-[0.7rem] text-brand-muted">{apiErrorMessage(error)}</p>
    </div>
  )
}
