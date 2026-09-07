/**
 * Der Wortlaut der Freigabe-Einwilligung — eine Quelle für Anzeige und Nachweis.
 *
 * **Warum das nicht im Formular stehen darf.** Art. 7 Abs. 1 DSGVO verlangt, dass sich
 * die Einwilligung nachweisen lässt. Gespeichert wurden bisher nur Fassungskennung und
 * Zeitpunkt — der Text stand allein im JSX. Wer in zwei Jahren belegen muss, *wozu*
 * jemand eingewilligt hat, müsste den damaligen Quellcode-Stand rekonstruieren und darauf
 * vertrauen, dass die Kennung damals mit hochgezählt wurde. Das ist kein Nachweis, das
 * ist eine Hoffnung.
 *
 * Jetzt erzeugt eine Funktion den Text, das Formular zeigt genau ihn an, und genau er
 * wird mitgeschickt und gespeichert. Anzeige und Nachweis können nicht auseinanderlaufen,
 * weil es nur einen Text gibt.
 *
 * **Zwei Erklärungen, nicht eine.** Die juristische Durchsicht hat angemerkt, dass hier
 * zwei rechtlich verschiedene Dinge in einer Bestätigung stecken: die Einwilligung in die
 * Verarbeitung besonderer Kategorien (Art. 9 Abs. 2 lit. a DSGVO) und — bei
 * Berufsgeheimnisträger:innen — die Entbindung von der Schweigepflicht. Sie sind deshalb
 * hier bereits als zwei Absätze geführt und benannt. Die Trennung in zwei getrennt zu
 * bestätigende Erklärungen steht als Maßnahme M2 aus und wartet auf den anwaltlichen
 * Wortlaut; sie ist keine Umbaumaßnahme mehr, sondern eine Textentscheidung.
 */

/**
 * Fassung des Einwilligungstexts.
 *
 * Bei jeder inhaltlichen Änderung hochzählen. Sie wird an der Freigabe protokolliert —
 * seit Migration 102 zusammen mit dem Wortlaut selbst, sodass die Kennung nicht mehr die
 * einzige Spur ist.
 */
export const EINWILLIGUNG_FASSUNG = 'share-2026-09'

/**
 * Der Text, den die Person liest und dem sie zustimmt.
 *
 * @param fachperson Name der Fachperson, wie er im Formular steht. Er gehört in den
 *   Nachweis: Eine Einwilligung „an eine Fachperson" wäre nicht bestimmt genug.
 */
export function einwilligungsText(fachperson: string): string {
  const wen = fachperson.trim() || 'die ausgewählte Fachperson'
  return [
    `Ich willige ausdrücklich ein, dass die von mir ausgewählten Inhalte an ${wen} `
    + 'freigegeben werden. Mir ist bewusst, dass es sich dabei um besondere Kategorien '
    + 'personenbezogener Daten handeln kann (Art. 9 DSGVO).',

    'Die Fachperson kann diese Inhalte in EchoB einsehen und – auch KI-gestützt (Echo) – '
    + 'verarbeiten. Die KI-Verarbeitung erfolgt derzeit über einen Dienstleister mit Sitz '
    + 'in den USA. Soweit die Fachperson einer gesetzlichen oder berufsrechtlichen '
    + 'Schweigepflicht unterliegt, entbinde ich sie insoweit davon, als dies für diese '
    + 'Verarbeitung erforderlich ist.',

    'Ich kann diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen; die '
    + 'Fachperson verliert dann sofort den Zugriff. Einzelheiten stehen in der '
    + 'Datenschutzerklärung.',
  ].join('\n\n')
}

/** Die Absätze einzeln — fürs Formular, das sie untereinander zeigt. */
export function einwilligungsAbsaetze(fachperson: string): string[] {
  return einwilligungsText(fachperson).split('\n\n')
}
