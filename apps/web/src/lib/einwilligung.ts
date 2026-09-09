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
export const EINWILLIGUNG_FASSUNG = 'share-2026-09e'

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
    was: 'Andere Menschen in deinen Texten',
    text: 'Was du schreibst, geht im Wortlaut mit — auch Namen von Partner:innen, Kindern '
      + 'oder Kolleg:innen. Diese Menschen haben nicht eingewilligt. Du hilfst ihnen, wenn '
      + 'du Rollen statt voller Namen verwendest („mein Partner", „meine Chefin"). Für dich '
      + 'ändert das nichts, für sie viel.',
  },
  {
    was: 'Wie lange',
    text: 'Bis du die Freigabe widerrufst. Danach verliert die Fachperson sofort den '
      + 'Zugriff auf die Inhalte, und was EchoB daraus erstellt hat, wird gelöscht.',
  },
  {
    was: 'Was nicht passiert',
    text: 'Deine Inhalte werden nicht zum Training von KI-Modellen verwendet — weder von '
      + `${BETREIBER_KURZ} noch von ${KI_DIENSTLEISTER}. Eine kurzzeitige Speicherung dort `
      + 'zur Missbrauchserkennung ist derzeit nicht ausgeschlossen; daran arbeiten wir.',
  },
  {
    was: 'Was sie behält',
    text: 'Ihre eigenen Sitzungsnotizen. Die sind ihre Behandlungsdokumentation, und sie '
      + 'ist gesetzlich verpflichtet, sie zehn Jahre aufzubewahren — das kann auch ein '
      + 'Widerruf nicht aufheben. Auskunft darüber bekommst du bei ihr.',
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
        + 'stattfinden. Eine Verwendung meiner Inhalte zum Training oder zur Verbesserung '
        + 'von KI-Modellen findet nicht statt. Die Inhalte bleiben gespeichert, bis ich die '
        + 'Freigabe widerrufe oder mein Konto lösche; danach werden sie und die daraus '
        + 'erzeugten Auswertungen entfernt.',
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
 * Das Fall-FAQ — die eine zusätzliche Entscheidung, die getroffen werden kann.
 *
 * **Warum das kein dritter Haken neben den beiden Erklärungen ist.** Die beiden
 * Erklärungen sind Pflicht: Ohne sie gibt es keine Freigabe. Das Fragenpaket ist eine
 * *Wahl* — man kann freigeben und es nicht wollen. Stünde es in derselben Reihe, sähe es
 * aus wie eine dritte Bedingung, und wer zügig klickt, hakte es mit ab. Genau das soll es
 * nicht sein.
 *
 * **Warum es trotzdem hier steht und nicht bloß im Formular.** Wer es anhakt, löst eine
 * Übermittlung aus, die ohne den Haken nicht stattfände. Was dabei geschieht und wer die
 * Antworten sieht, gehört deshalb in den Wortlaut, der als Nachweis gespeichert wird —
 * nicht in eine Bildunterschrift, die morgen anders lautet.
 *
 * **Der Satz, auf den es ankommt,** ist der vorletzte: dass die Antworten bei der
 * Fachperson landen und nicht bei der Person, die sie auslöst. Das ist ungewöhnlich genug,
 * dass man es nicht erraten kann, und es ist der einzige Grund, aus dem jemand das
 * Häkchen vielleicht doch nicht setzen will.
 */
export const FALL_FAQ_ERKLAERUNG = {
  titel: 'Fragenpaket für die Fachperson',
  kurz: 'EchoB beantwortet einmalig 40 fachliche Fragen zu deinem Fall.',
  text:
    'Zusätzlich kann EchoB einmalig 40 fachlich vorbereitete Fragen zu den freigegebenen '
    + 'Inhalten beantworten, damit die Fachperson sich vor dem ersten Gespräch einlesen '
    + 'kann. Die Fragen stehen fest und sind für alle gleich; die Fachperson kann sie weder '
    + 'ändern noch eigene stellen. Verarbeitet wird dabei nur, was ich oben ausgewählt habe '
    + '— nichts darüber hinaus. Die Antworten sieht die Fachperson, nicht ich; auf Verlangen '
    + 'erhalte ich sie jederzeit (Art. 15 DSGVO). Widerrufe ich die Freigabe, verliert die '
    + 'Fachperson auch auf diese Antworten den Zugriff.',
}

/**
 * Der gemeinsame Hinweis unter beiden Erklärungen.
 *
 * Kein Teil der Erklärungen selbst, sondern die Information, ohne die sie nicht informiert
 * wären: Widerruf und dessen Folgen. Die Folgen stimmen mit dem Verhalten überein — und
 * seit September 2026 stimmen sie genauer, weil das Verhalten sich geändert hat.
 *
 * Vorher stand hier, die Fachperson verliere den Zugriff „auf die freigegebenen Inhalte
 * und auf die daraus in EchoB erstellten Berichte und Notizen". Das war in beide
 * Richtungen ungenau. Berichte, Arbeitsmappe und KI-Gespräche wurden nicht gelöscht,
 * sondern nur unsichtbar — sie standen weiter in den Tabellen, obwohl sie ganz aus dem
 * Material der Klient:in stammten. Und die Sitzungsnotizen der Fachperson wurden ihr
 * entzogen, obwohl sie diese nach § 630f BGB zehn Jahre aufbewahren MUSS.
 *
 * Jetzt gilt beides wörtlich: Was aus ihrem Material erzeugt wurde, wird gelöscht. Was
 * die Fachperson selbst geschrieben hat, bleibt bei ihr. Wer den Satz ändert, muss vorher
 * das Verhalten ändern — nicht umgekehrt.
 */
export const WIDERRUFSHINWEIS =
  'Beide Erklärungen kann ich jederzeit mit Wirkung für die Zukunft widerrufen. Die '
  + 'Fachperson verliert dann sofort den Zugriff auf die freigegebenen Inhalte, und was '
  + 'EchoB daraus erstellt hat — Berichte, Arbeitsmappe, KI-Gespräche zum Fall und das '
  + 'Fragenpaket — wird gelöscht. Was die Fachperson selbst aufgeschrieben hat, behält '
  + 'sie: Ihre Sitzungsnotizen sind ihre Behandlungsdokumentation, und sie ist gesetzlich '
  + 'verpflichtet, diese aufzubewahren (§ 630f BGB). Einzelheiten stehen in der '
  + 'Datenschutzerklärung.'

/**
 * Was als Nachweis gespeichert wird: beide Erklärungen mit Überschrift, dazu der Hinweis.
 *
 * Genau dieser Text stand der Person auf dem Schirm. Er wird an der Freigabe abgelegt,
 * damit später nicht der Quellcode-Stand rekonstruiert werden muss.
 */
export function einwilligungsProtokoll(fachperson: string, fallFaq = false): string {
  const teile = erklaerungen(fachperson).map(e => `${e.titel}\n${e.text}`)
  // Nur wenn wirklich angehakt: Der Nachweis soll belegen, was die Person erklaert hat,
  // nicht was ihr angeboten wurde. Stuende der Absatz immer drin, belegte er bei jeder
  // Freigabe eine Uebermittlung, die meistens nicht stattgefunden hat.
  if (fallFaq) teile.push(`${FALL_FAQ_ERKLAERUNG.titel}\n${FALL_FAQ_ERKLAERUNG.text}`)
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
