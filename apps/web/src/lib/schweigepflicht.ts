/**
 * Der Hinweis zur Schweigepflicht, den eine Fachperson einmal bestätigt, bevor sie die
 * KI-Funktionen mit einem Fall nutzt.
 *
 * **Warum es ihn gibt.** Jede Frage an Echo und jeder Bericht schickt zwei verschiedene
 * Dinge an denselben Dienstleister: die freigegebenen Inhalte der Klient:in — und die
 * eigenen Aufzeichnungen der Fachperson. Für das Erste hat die Klient:in ausdrücklich von
 * der Schweigepflicht entbunden (siehe `einwilligung.ts`). Für das Zweite hat das niemand.
 * Diese Grenze verläuft mitten durch die Werkzeuge, und man sieht sie ihnen nicht an.
 *
 * **Warum der Text hier steht.** Wie beim AVV und bei der Einwilligung: Der Wortlaut lebt
 * im Frontend, der Nachweis in der Datenbank, und die Fassung verbindet beide.
 * `test_ki_hinweis_version.py` hält fest, dass angezeigte und protokollierte Fassung
 * dieselbe ist — sonst bezeugt der Nachweis die Kenntnisnahme eines Textes, den niemand
 * gesehen hat.
 *
 * **Drei Lagen, nicht zwei.** `unterliegt_203` kann `true`, `false` oder `null` sein.
 * „Nicht geklärt" ist kein „nein": Heilpraktiker:innen für Psychotherapie und alle ohne
 * Angabe bekommen die strengere Fassung, weil man bei ihr nichts verliert.
 *
 * **Was hier bewusst NICHT steht:** ein Versprechen, die eigenen Notizen ließen sich vom
 * Kontext ausnehmen. Es gibt diesen Schalter nicht — die Aufzeichnungen gehen mit, sobald
 * sie im Fall stehen. Genau deshalb ist die praktische Regel unten so formuliert, wie sie
 * ist: Sie betrifft das Schreiben, nicht das Senden.
 */
import { KI_DIENSTLEISTER } from '@/lib/betreiber'

/**
 * Fassung des Hinweistextes.
 *
 * Bei jeder inhaltlichen Änderung hochzählen — dann sehen alle Fachpersonen ihn erneut.
 * Muss mit `CURRENT_SCHWEIGEPFLICHT_VERSION` im Backend übereinstimmen.
 */
export const SCHWEIGEPFLICHT_FASSUNG = 'schweigepflicht-2026-09'

export interface HinweisAbschnitt {
  ueberschrift: string
  text: string
}

export interface Hinweis {
  /** `pflicht` = § 203 StGB gilt, `ungeklaert` = nicht entschieden, `frei` = gilt nicht. */
  lage: 'pflicht' | 'ungeklaert' | 'frei'
  titel: string
  einstieg: string
  /** Steht nur, wenn die Berufsgruppe fehlt oder strittig ist. */
  zurGruppe?: string
  abschnitte: HinweisAbschnitt[]
  regeln: string[]
  schluss: string
  bestaetigung: string
}

const WAS_MITGEHT: HinweisAbschnitt = {
  ueberschrift: 'Was dabei übermittelt wird',
  text:
    `Jede Frage an Echo und jeder erzeugte Bericht schickt den freigegebenen Fall an `
    + `unseren KI-Dienstleister ${KI_DIENSTLEISTER} — und dazu alles, was Sie selbst zu `
    + 'diesem Fall angelegt haben: Arbeitsmappe, Sitzungsnotizen, festgehaltene '
    + 'Erkenntnisse, Zuweisungen und Termine. Dabei kann eine Verarbeitung in den USA '
    + 'stattfinden. Zum Training von KI-Modellen wird nichts davon verwendet.',
}

const ENTBINDUNG: HinweisAbschnitt = {
  ueberschrift: 'Wofür eine Entbindung Ihrer Klient:in vorliegt',
  text:
    'Beim Freigeben gibt Ihre Klient:in zwei getrennte Erklärungen ab: die Einwilligung in '
    + 'die Verarbeitung (Art. 9 DSGVO) und die Entbindung von der Schweigepflicht, '
    + 'ausdrücklich für die Verarbeitung durch EchoB und den benannten KI-Dienstleister. '
    + 'Sie gilt für die Inhalte, die sie ausgewählt hat — und nur für diesen Zweck. '
    + 'Den Wortlaut können Sie im Fall unter „Freigabe" nachlesen.',
}

const EIGENE_AUFZEICHNUNGEN: HinweisAbschnitt = {
  ueberschrift: 'Wofür keine vorliegt',
  text:
    'Ihre eigenen Aufzeichnungen stammen nicht aus dieser Freigabe. Was Ihnen in der '
    + 'Sitzung anvertraut wurde, was Sie daraus dokumentieren und was Sie selbst ins '
    + 'Eingabefeld schreiben, deckt die Entbindung nicht ab. Beides geht trotzdem '
    + 'gemeinsam an das Modell, sobald Sie eine KI-Funktion nutzen.',
}

const GEMEINSAME_REGELN = [
  'Fragen Sie Echo zum freigegebenen Fall. Dafür liegt die Entbindung vor, und dafür ist '
  + 'das Werkzeug gebaut.',
  'Führen Sie Ihre Aufzeichnungen in EchoB so, dass Sie sie auch einer KI zeigen würden — '
  + 'denn genau das geschieht, sobald Sie Echo oder einen Bericht nutzen. Rollen statt '
  + 'Namen Dritter, Beobachtung statt wörtlichem Zitat aus der Sitzung.',
  'Was darüber hinaus zu Ihrer Dokumentation gehört, gehört nicht in dieses Feld, sondern '
  + 'in Ihre eigene Akte.',
]

const SCHLUSS =
  'Im Beispielfall ist niemand echt — dort können Sie alles gefahrlos ausprobieren. '
  + 'Dieser Hinweis ist unsere Einschätzung nach bestem Wissen und keine Rechtsberatung. '
  + 'Ändert sich sein Inhalt, sehen Sie ihn erneut.'

const BESTAETIGUNG =
  'Ich habe gelesen, was mit dem freigegebenen Fall und mit meinen eigenen Aufzeichnungen '
  + 'geschieht, wenn ich die KI-Funktionen nutze.'

/** Der Hinweis in der Fassung, die zur Berufsgruppe passt. */
export function schweigepflichtHinweis(unterliegt203: boolean | null | undefined): Hinweis {
  if (unterliegt203 === false) {
    return {
      lage: 'frei',
      titel: 'Bevor Sie die KI-Funktionen mit einem Fall nutzen',
      einstieg:
        'Nach unserer Einordnung unterliegt Ihre Berufsgruppe nicht der Schweigepflicht '
        + 'nach § 203 StGB. Ihre vertragliche und berufsethische Verschwiegenheit bleibt '
        + 'davon unberührt — und was übermittelt wird, wird trotzdem übermittelt. Deshalb '
        + 'einmal in Ruhe, was dabei geschieht.',
      abschnitte: [
        WAS_MITGEHT,
        ENTBINDUNG,
        {
          ueberschrift: 'Was bei Ihnen bleibt',
          text:
            'Ihre eigenen Aufzeichnungen sind von der Freigabe nicht gedeckt. Strafrechtlich '
            + 'ist das für Sie nach unserer Einordnung ohne Folge; für das Vertrauen Ihrer '
            + 'Klient:innen ist es das nicht. Die praktische Regel unten gilt deshalb auch '
            + 'für Sie.',
        },
      ],
      regeln: GEMEINSAME_REGELN,
      schluss: SCHLUSS,
      bestaetigung: BESTAETIGUNG,
    }
  }

  const ungeklaert = unterliegt203 !== true
  return {
    lage: ungeklaert ? 'ungeklaert' : 'pflicht',
    titel: 'Bevor Sie die KI-Funktionen mit einem Fall nutzen',
    einstieg:
      'Sie unterliegen der Schweigepflicht nach § 203 StGB. Die KI-Funktionen von EchoB '
      + 'sind dafür gebaut, und sie bleiben Ihnen offen — aber Sie sollten einmal genau '
      + 'gesehen haben, was dabei an wen geht und wofür eine Entbindung vorliegt.',
    zurGruppe: ungeklaert
      ? 'Für Ihre Berufsgruppe ist die Frage nicht abschließend geklärt oder noch nicht '
        + 'angegeben. Wir zeigen Ihnen deshalb die strengere Fassung: Bei ihr verlieren Sie '
        + 'nichts, wenn die Frage später anders beantwortet wird. Die Berufsgruppe können '
        + 'Sie in den Einstellungen ändern.'
      : undefined,
    abschnitte: [
      WAS_MITGEHT,
      ENTBINDUNG,
      EIGENE_AUFZEICHNUNGEN,
      {
        ueberschrift: 'Wer dafür einsteht',
        text:
          '§ 203 StGB richtet sich an Sie, nicht an uns. Wir sperren deshalb nichts und '
          + 'entscheiden nichts für Sie: Sie bleiben Herr:in Ihrer Eingaben, und genau '
          + 'darum sollen Sie wissen, wo die Entbindung endet.',
      },
    ],
    regeln: GEMEINSAME_REGELN,
    schluss: SCHLUSS,
    bestaetigung: BESTAETIGUNG,
  }
}
