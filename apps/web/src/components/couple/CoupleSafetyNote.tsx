/**
 * Diskreter Sicherheitshinweis im Paarraum.
 *
 * Ein gemeinsames Gespräch setzt Augenhöhe voraus. Wo Gewalt, Drohungen oder Kontrolle im
 * Spiel sind, kann ein Paarsetting schaden, weil es Druck erhöht statt ihn zu nehmen. Der
 * Hinweis steht deshalb dauerhaft da – zugeklappt, aber jederzeit erreichbar.
 */
export default function CoupleSafetyNote() {
  return (
    <details className="rounded-brand border border-brand-border bg-white px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-navy">
        Wenn du dich nicht sicher fühlst
      </summary>
      <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-brand-muted">
        <p>
          Ein gemeinsames Gespräch braucht Augenhöhe. Wo Drohungen, Zwang, Kontrolle oder
          Gewalt im Spiel sind, ist ein Paarsetting der falsche Ort – es kann den Druck
          erhöhen, statt ihn zu nehmen. Das ist kein Scheitern, sondern eine Frage der
          Sicherheit.
        </p>
        <ul className="space-y-1">
          <li>Bei akuter Gefahr: <span className="font-semibold text-navy">Notruf 110 / 112</span></li>
          <li>Hilfetelefon Gewalt gegen Frauen: <span className="font-semibold text-navy">116 016</span></li>
          <li>Gewalt an Männern: <span className="font-semibold text-navy">0800 123 9900</span></li>
          <li>Telefonseelsorge: <span className="font-semibold text-navy">0800 111 0 111</span></li>
        </ul>
        <p>Alle vertraulich, kostenlos und rund um die Uhr erreichbar.</p>
      </div>
    </details>
  )
}
