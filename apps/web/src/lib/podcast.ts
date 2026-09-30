/**
 * Die reine Logik des Podcast-Studios — ohne React, ohne Netz.
 *
 * **Warum das eine eigene Datei ist.** Drei Entscheidungen des Moduls sind keine Darstellung,
 * sondern Regeln: wie eine Dauer geschrieben wird, was im Regal an einer Folge steht, und was
 * mit den Reglern passiert, wenn man das Format wechselt. Alle drei steckten in Komponenten
 * und waren damit unprüfbar: Der Testaufbau dieses Projekts ist bewusst `environment: 'node'`
 * — keine gerenderten Bäume, nur reine Funktionen.
 *
 * Die mittlere ist der Grund für diese Datei. Ein Nutzer hat gefragt, wie man den Podcast
 * abspielt, weil im Regal eine Zustandsbeschreibung stand („Skript steht — noch nicht
 * gesprochen") statt einer Aufforderung. Das ist behoben, und ohne Test wäre es eine
 * Formulierung, die beim nächsten Umbau still zurückfällt.
 */
import type { Podcast, PodcastStatus } from '@/api/podcast'

/**
 * Sekunden als `4:07`.
 *
 * Immer mit zwei Stellen hinter dem Doppelpunkt: `4:7` liest sich als sieben Minuten.
 * Fehlendes und Unsinniges ergeben `0:00` statt `NaN:NaN` — eine Dauer, die noch niemand
 * gemessen hat, ist kein Fehler, sondern der Normalfall vor dem Sprechen.
 */
export function zeit(sekunden: number | null | undefined): string {
  if (typeof sekunden !== 'number' || !Number.isFinite(sekunden) || sekunden < 0) return '0:00'
  const m = Math.floor(sekunden / 60)
  const s = Math.floor(sekunden % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Was an einer Folge im Regal steht, und ob es nach einer Aufforderung aussehen soll. */
export interface Stand {
  text: string
  /** Hier ist etwas zu tun — die Zeile wird in der Akzentfarbe hervorgehoben. */
  offen: boolean
}

/**
 * Der Stand einer Folge, **als Aufforderung und nicht als Zustandsbeschreibung.**
 *
 * „Skript steht — noch nicht gesprochen" beschreibt richtig und hilft nicht: Wer es liest,
 * weiß nicht, dass er hineingehen und einen Knopf drücken muss. Genau daran ist ein Nutzer
 * hängengeblieben.
 *
 * Der Pfeil am Ende ist Teil der Aussage, nicht Zierde — er sagt, dass es weitergeht.
 */
export function stand(folge: Pick<Podcast, 'status' | 'sekunden'>): Stand {
  const s: PodcastStatus = folge.status
  if (s === 'fertig') return { text: zeit(folge.sekunden), offen: false }
  if (s === 'skript') return { text: 'Text steht · noch sprechen lassen →', offen: true }
  if (s === 'spricht') return { text: 'wird gerade gesprochen …', offen: false }
  if (s === 'fehler') return { text: 'abgebrochen · weitermachen →', offen: true }
  // 'entwurf' gibt es seit dem Umbau nicht mehr neu — es entsteht keine Folge ohne Text.
  // Ältere Zeilen aus der ersten Fassung haben ihn aber, und die sollen nicht als
  // unauffälliger Grauwert dastehen: Dort ist wirklich etwas zu tun, nämlich löschen.
  return { text: 'ohne Text · öffnen →', offen: true }
}

/**
 * Die Regler nach einem Formatwechsel.
 *
 * **Zwei Regeln, und beide sind Entscheidungen.** Was das neue Format nicht verträgt, fällt
 * weg — sonst schickt die Oberfläche eine Gewichtung für ein Element, das der Server für
 * dieses Format abweist. Und was beide Formate haben, behält seine Stufe: Wer die Szenen auf
 * „im Mittelpunkt" gestellt hat und dann das Format wechselt, meint das immer noch.
 *
 * Neue Elemente starten auf `normal` und nie auf `aus`. Ein Element, das nach einem Wechsel
 * still abgewählt wäre, fehlte später im Podcast, und niemand könnte sich das erklären.
 */
export function reglerFuerFormat(
  erlaubteElemente: readonly string[],
  vorher: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(erlaubteElemente.map(e => [e, vorher[e] ?? 'normal']))
}

/**
 * Die Ansprache nach einem Formatwechsel.
 *
 * Passt die bisherige nicht zum neuen Format, wird die erste genommen — und nicht die alte
 * behalten. Behielte man sie, wiese der Server die Bestellung mit 422 ab, und an der
 * Oberfläche sähe man nicht, woran es lag.
 */
export function anspracheFuerFormat(
  erlaubt: readonly string[],
  vorher: string | null,
): string | null {
  if (vorher && erlaubt.includes(vorher)) return vorher
  return erlaubt[0] ?? null
}
