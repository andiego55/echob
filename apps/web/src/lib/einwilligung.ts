/**
 * Die beiden Erklärungen bei der Freigabe — und ihr Wortlaut als Nachweis.
 *
 * **Drei Ebenen, nicht eine.** Beim Freigeben treffen drei verschiedene Dinge zusammen:
 * die *Information* darüber, was geschieht (Art. 13 DSGVO — schuldet EchoB ohnehin), und
 * zwei *Erklärungen*, die die Klient:in abgibt. Nur die beiden Erklärungen werden
 * angehakt; die Information steht darüber und wird nicht bestätigt, weil man Information
 * nicht bestätigt.
 *
 * **Zwei Erklärungen, nicht eine.** Denn hier stecken zwei rechtlich verschiedene Dinge:
 *
 * 1. Die **Einwilligung** nach Art. 9 Abs. 2 lit. a DSGVO — sie erlaubt die Verarbeitung
 *    besonderer Kategorien personenbezogener Daten.
 * 2. Die **Entbindung von der Schweigepflicht** — sie macht die Offenbarung gegenüber
 *    EchoB und dem KI-Dienstleister nicht „unbefugt" im Sinne des § 203 StGB.
 *
 * Die zweite ist keine Unterform der ersten: Eine wirksame Einwilligung nach der DSGVO
 * sagt nichts über das Strafrecht, und eine Entbindung nichts über die Zulässigkeit der
 * Verarbeitung. Bis September 2026 standen beide in einer einzigen Bestätigung. Wer nur
 * einer von beiden zustimmen wollte, konnte das nicht — und wer zustimmte, konnte nicht
 * erkennen, dass er zwei Dinge erklärt.
 *
 * **Warum die Namen darin stehen.** Eine Entbindung muss bestimmt sein. „Ich entbinde die
 * Fachperson gegenüber einem Dienstleister" ist keine Erklärung, der man ansieht, was sie
 * gestattet. Deshalb: die Fachperson beim Namen, der Betreiber mit Anschrift, der
 * KI-Dienstleister benannt, die Unterauftragnehmer über den Vertrag einbezogen.
 *
 * **Und deshalb ohne Fürwörter.** „…von ihr verarbeitet" und „entbinde ich sie" standen
 * hier zuerst — bei einem männlichen Namen ist das schlicht falsch, und bei jeder
 * Fachperson, deren Geschlecht wir nicht kennen, eine Unterstellung. Der Name wird
 * wiederholt, auch wo es sperrig klingt: In einer Erklärung, die bestimmt sein muss, ist
 * eine Wiederholung besser als ein Bezug, der danebenliegen kann.
 *
 * **Warum der Wortlaut gespeichert wird.** Art. 7 Abs. 1 DSGVO verlangt den Nachweis der
 * Einwilligung, und der ist eine Aussage über den Text — nicht über eine Kennung. Diese
 * Datei erzeugt ihn, das Formular zeigt genau ihn, genau er wird gespeichert.
 *
 * **Was hier bewusst NICHT steht:** ein Hinweis, dass EchoB auch ohne KI-Verarbeitung
 * nutzbar sei. Das wäre derzeit unzutreffend — es gibt keinen Schalter, der die
 * KI-Funktionen für eine Freigabe abschaltet. Solange es ihn nicht gibt, ist die
 * Freiwilligkeit der Einwilligung eine offene Frage (Art. 7 Abs. 4 DSGVO), und ein
 * Versprechen an dieser Stelle würde sie verdecken statt lösen.
 */
import { BETREIBER_KURZ, BETREIBER_VOLL, KI_DIENSTLEISTER } from '@/lib/betreiber'

/**
 * Fassung der Erklärungen.
 *
 * Der Buchstabe kennzeichnet eine zweite inhaltliche Fassung innerhalb desselben Monats:
 * `share-2026-09` war die zusammengefasste Erklärung, `share-2026-09b` trennt sie in zwei
 * und benennt die Beteiligten. Seit Migration 102 wird zusätzlich der Wortlaut selbst
 * gespeichert — die Kennung ordnet ein, der Text beweist.
 */
export const EINWILLIGUNG_FASSUNG = 'share-2026-09b'

/**
 * Was geschieht — die Information, bevor gefragt wird.
 *
 * **Warum das über den Haken steht und nicht darin.** Information (Art. 13 DSGVO) und
 * Erklärung (Art. 9, Schweigepflicht) sind verschiedene Dinge: Die eine schuldet EchoB
 * ohnehin, die andere gibt die Klient:in ab. Standen sie im selben Text, tat er beides
 * halb — er wurde lang, weil er informieren musste, und blieb doch eine Erklärung, die man
 * abnickt. Jetzt wird erst gesagt, was passiert, und dann gefragt.
 *
 * Die Erklärungen selbst bleiben trotzdem vollständig: Eine Einwilligung muss aus sich
 * heraus bestimmt sein und darf sich nicht darauf verlassen, dass jemand den Absatz
 * darüber gelesen hat. Die Wiederholung ist gewollt.
 */
export const DATENSCHUTZHINWEISE: { was: string; text: string }[] = [
  {
    was: 'Wer etwas bekommt',
    text: 'Nur die Fachperson, die du oben ausgewählt hast — und nur die Inhalte, die du '
      + 'angehakt hast. Andere Fachpersonen sehen nichts davon.',
  },
  {
    was: 'Wozu',
    text: 'Damit die Fachperson mit dir fachlich daran arbeiten kann. EchoB verarbeitet '
      + 'die Inhalte dabei in ihrem Auftrag, nicht für eigene Zwecke.',
  },
  {
    was: 'Worum es sich handelt',
    text: 'Es können besondere Kategorien personenbezogener Daten dabei sein — etwa '
      + 'Angaben zu deiner Gesundheit. Deshalb wird ausdrücklich gefragt.',
  },
  {
    was: 'Wer sie verarbeitet',
    text: `Die Fachperson, ${BETREIBER_KURZ} in ihrem Auftrag und für die KI-Funktionen `
      + `${KI_DIENSTLEISTER} samt der im Auftragsverarbeitungsvertrag offengelegten `
      + 'Unterauftragnehmer. Dabei kann eine Verarbeitung in den USA stattfinden.',
  },
  {
    was: 'Wie lange',
    text: 'Bis du die Freigabe widerrufst. Danach verliert die Fachperson sofort den '
      + 'Zugriff — auf die Inhalte und auf die daraus in EchoB erstellten Berichte und '
      + 'Notizen.',
  },
]

export interface Erklaerung {
  id: 'einwilligung' | 'entbindung'
  titel: string
  text: string
}

/** Die beiden Erklärungen, getrennt zu bestätigen. */
export function erklaerungen(fachperson: string): Erklaerung[] {
  const wen = fachperson.trim() || 'die ausgewählte Fachperson'
  return [
    {
      id: 'einwilligung',
      titel: 'Einwilligung in die Verarbeitung (Art. 9 DSGVO)',
      text:
        `Ich willige ausdrücklich ein, dass die von mir ausgewählten Inhalte an ${wen} `
        + `freigegeben werden und dass ${wen} sowie ${BETREIBER_VOLL} — letzterer im `
        + `Auftrag von ${wen} — diese Inhalte verarbeiten. Mir ist bewusst, dass dabei `
        + `besondere Kategorien `
        + 'personenbezogener Daten verarbeitet werden können (Art. 9 DSGVO), etwa Angaben '
        + 'zu meiner Gesundheit. Für die KI-gestützte Verarbeitung werden die Inhalte an '
        + `${KI_DIENSTLEISTER} und die im Auftragsverarbeitungsvertrag offengelegten `
        + 'Unterauftragnehmer übermittelt; dabei kann eine Verarbeitung in den USA '
        + 'stattfinden.',
    },
    {
      id: 'entbindung',
      titel: 'Entbindung von der Schweigepflicht',
      text:
        `Soweit ${wen} einer gesetzlichen oder berufsrechtlichen Schweigepflicht unterliegt `
        + `(insbesondere § 203 StGB und Berufsordnung), entbinde ich ${wen} insoweit davon, `
        + 'als dies erforderlich ist, um die von mir ausgewählten Inhalte durch '
        + `${BETREIBER_VOLL} und dessen KI-Dienstleister ${KI_DIENSTLEISTER} einschließlich `
        + 'der im Auftragsverarbeitungsvertrag offengelegten Unterauftragnehmer verarbeiten '
        + 'zu lassen. Die Entbindung gilt nur für diesen Zweck und nur für die von mir '
        + 'ausgewählten Inhalte.',
    },
  ]
}

/**
 * Der gemeinsame Hinweis unter beiden Erklärungen.
 *
 * Kein Teil der Erklärungen selbst, sondern die Information, ohne die sie nicht informiert
 * wären: Widerruf und dessen Folgen. Die Folgen stimmen mit dem Verhalten überein —
 * Berichte und Notizen hängen ebenso an der aktiven Freigabe wie die Inhalte selbst.
 */
export const WIDERRUFSHINWEIS =
  'Beide Erklärungen kann ich jederzeit mit Wirkung für die Zukunft widerrufen. Die '
  + 'Fachperson verliert dann sofort den Zugriff auf die freigegebenen Inhalte und auf die '
  + 'daraus in EchoB erstellten Berichte und Notizen. Einzelheiten stehen in der '
  + 'Datenschutzerklärung.'

/**
 * Was als Nachweis gespeichert wird: beide Erklärungen mit Überschrift, dazu der Hinweis.
 *
 * Genau dieser Text stand der Person auf dem Schirm. Er wird an der Freigabe abgelegt,
 * damit später nicht der Quellcode-Stand rekonstruiert werden muss.
 */
export function einwilligungsProtokoll(fachperson: string): string {
  const teile = erklaerungen(fachperson).map(e => `${e.titel}\n${e.text}`)
  return [...teile, WIDERRUFSHINWEIS].join('\n\n')
}

/**
 * Sind beide Erklärungen bestätigt?
 *
 * Steht getrennt, weil hier die eigentliche Sperre liegt: Ein `||` statt `&&` — oder ein
 * Haken, dessen Kennung sich geändert hat — würde die Freigabe schon nach einer der
 * beiden Erklärungen zulassen. Das fiele niemandem auf, denn der Knopf sähe genauso aus.
 */
export function alleErklaerungenBestaetigt(
  zustimmung: Record<string, boolean>,
  fachperson: string,
): boolean {
  return erklaerungen(fachperson).every(e => zustimmung[e.id] === true)
}
