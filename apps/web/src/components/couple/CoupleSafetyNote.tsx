/**
 * Der Sicherheitshinweis – erreichbar, ohne eine Spalte zu belegen.
 *
 * **Vorher eine Karte in der Seitenspalte.** Sie war statisch, hat aber im Chat eine ganze
 * Spalte mitgetragen und das Dialogfenster schmal gemacht. Der Hinweis ist wichtig, aber
 * er ist eben Information und kein Inhalt.
 *
 * Jetzt zwei Bausteine: der Text (für das Fragezeichen) und eine schlanke Fußzeile, die
 * ihn öffnet. Die Nummern bleiben damit von jeder Seite aus einen Klick entfernt – sie
 * verschwinden nicht, sie drängeln nur nicht mehr.
 */
import InfoPopover from './InfoPopover'

/** Der Text selbst – wird im Fragezeichen und in der Fußzeile verwendet. */
export function SafetyText() {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-brand-muted">
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
  )
}

/** Eine Zeile am Seitenende statt einer Karte in der Spalte. */
export default function CoupleSafetyNote() {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-brand-muted">
      <InfoPopover label="Wenn du dich nicht sicher fühlst"
        title="Wenn du dich nicht sicher fühlst" align="left">
        <SafetyText />
      </InfoPopover>
      <span>Wenn du dich nicht sicher fühlst</span>
    </div>
  )
}
