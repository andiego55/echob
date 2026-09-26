/**
 * Die Vorwahl: eine unmögliche Frage in eine Reihe leichter Fragen verwandeln.
 *
 * **Das Problem, das sie löst.** „Was wünschst du dir?" ist für die Menschen, die hierher
 * kommen, die schwerste Frage überhaupt — die meisten können sofort sagen, was ihnen fehlt,
 * und brauchen für das, was sie wollen, sehr viel länger. Genau die standen bisher vor
 * fünfundzwanzig Aspekten in sieben Familien und sollten anfangen. „Welches von diesen beiden
 * fehlt dir mehr?" kann dagegen fast jeder beantworten, auch an einem schlechten Tag.
 *
 * **Warum ein Regent und kein Turnier.** Der Gewinner bleibt liegen, der nächste tritt gegen
 * ihn an. Das hat drei Vorzüge: Jeder Kandidat kommt genau einmal dran (also n−1 Fragen,
 * nicht n²), die Frage bleibt immer ein Vergleich von zwei Dingen, und **man sieht eine
 * Geschichte** — der eigene Wunsch verteidigt sich, oder er wird abgelöst. Ein Raster aus
 * Paarungen wäre dasselbe an Information und nichts davon.
 *
 * **Warum ein Kandidat je Familie.** Das Feld wird aus dem ersten Aspekt jeder Familie
 * gebildet, nicht aus allen fünfundzwanzig. Zwei Aspekte derselben Familie gegeneinander
 * sind eine Feinheit („Gehört werden" gegen „Eigener Raum"), und Feinheiten sind genau das,
 * was jemand nicht beantworten kann, der noch gar nicht weiß, was er will. Die Vorwahl soll
 * die Richtung finden; die Feinheiten kommen danach in Schritt 1, wo alle Aspekte stehen.
 *
 * **Das Ergebnis ist ein Vorschlag, kein Urteil.** Es landet als Vorbelegung in der Skizze,
 * und die Oberfläche sagt das auch so. Wer sechs schnelle Fragen beantwortet hat, hat sich
 * nicht festgelegt — er hat angefangen.
 */

/** Wie viele Aspekte eine Vorwahl höchstens vorbelegt. */
export const MAX_VORBELEGT = 5

export type Wahl = 'regent' | 'herausforderer' | 'gleich'

export interface Stand {
  /** Die Kandidaten in fester Reihenfolge — der erste ist der erste Regent. */
  feld: string[]
  /** Wer gerade oben liegt. */
  regent: string
  /** Index des nächsten Herausforderers in `feld`. Ist er am Ende, ist die Vorwahl fertig. */
  naechster: number
  /** Siege je Aspekt. Ein Unentschieden zählt beiden einen halben. */
  siege: Record<string, number>
  /**
   * Wer nacheinander Regent war, in der Reihenfolge der Machtübernahme.
   *
   * Nicht dasselbe wie die Siegzahl: Wer zuletzt den Thron erobert hat, hat den bis dahin
   * Stärksten geschlagen. Das ist der Gleichstandsbrecher — und er ist keine Erfindung,
   * sondern eine Auskunft, die im Spielverlauf steckt.
   */
  throne: string[]
}

/** Ob noch eine Frage offen ist. */
export function fertig(stand: Stand): boolean {
  return stand.naechster >= stand.feld.length
}

/** Der aktuelle Herausforderer — oder `null`, wenn es keinen mehr gibt. */
export function herausforderer(stand: Stand): string | null {
  return fertig(stand) ? null : stand.feld[stand.naechster]
}

/** Die wievielte Frage von wie vielen. Für die Anzeige, und weil eine Zahl beruhigt. */
export function fortschritt(stand: Stand): { frage: number; von: number } {
  return { frage: Math.min(stand.naechster, stand.feld.length - 1), von: stand.feld.length - 1 }
}

/**
 * Beginnt eine Vorwahl über diesem Feld.
 *
 * Bei weniger als zwei Kandidaten gibt es nichts zu vergleichen — dann ist sie sofort fertig
 * und liefert nichts. Eine Oberfläche, die das nicht abfängt, zeigt sonst eine Frage mit
 * einer Antwortmöglichkeit.
 */
export function starten(feld: string[]): Stand {
  const sauber = [...new Set(feld.filter(Boolean))]
  return {
    feld: sauber,
    regent: sauber[0] ?? '',
    naechster: 1,
    siege: {},
    throne: sauber[0] ? [sauber[0]] : [],
  }
}

/** Eine beantwortete Frage — gibt einen neuen Stand zurück, ändert den alten nicht. */
export function zug(stand: Stand, wahl: Wahl): Stand {
  const gegner = herausforderer(stand)
  if (gegner === null) return stand

  const siege = { ...stand.siege }
  const punkt = (key: string, n: number) => { siege[key] = (siege[key] ?? 0) + n }

  let regent = stand.regent
  let throne = stand.throne

  if (wahl === 'herausforderer') {
    punkt(gegner, 1)
    regent = gegner
    throne = [...throne, gegner]
  } else if (wahl === 'regent') {
    punkt(stand.regent, 1)
  } else {
    // Unentschieden: beiden ein halber Punkt, und der Regent bleibt. Ihn abzusetzen, ohne
    // dass jemand ihn geschlagen hat, wäre eine Entscheidung, die niemand getroffen hat.
    punkt(stand.regent, 0.5)
    punkt(gegner, 0.5)
  }

  return { ...stand, regent, throne, siege, naechster: stand.naechster + 1 }
}

export interface Vorbelegung {
  aspekte: { key: string; gewicht: number }[]
  reihung: string[]
}

/**
 * Was die Vorwahl in die Skizze schreibt.
 *
 * **Nur wer etwas gewonnen hat.** Ein Aspekt, der in seinem einzigen Duell verloren hat, ist
 * keine Aussage gegen ihn — aber auch keine für ihn. Ihn trotzdem einzutragen hiesse, jemandem
 * einen Wunsch zuzuschreiben, den er nicht geäußert hat.
 *
 * **Die Gewichte sind Verhältnisse, keine Messwerte.** Wer am meisten Duelle gewonnen hat,
 * bekommt 90 — nicht 100: Die Vorwahl ist ein Anfang, und eine volle Zahl sähe aus wie ein
 * Ergebnis. Alles andere skaliert dazu und beginnt bei 45, damit auch ein einzelner Sieg als
 * Wunsch sichtbar ist und nicht als Randnotiz.
 */
export function ergebnis(stand: Stand): Vorbelegung {
  const platz = new Map(stand.feld.map((k, i) => [k, i]))
  const thron = new Map(stand.throne.map((k, i) => [k, i]))

  const gewinner = stand.feld
    .filter(k => (stand.siege[k] ?? 0) > 0)
    .sort((a, b) =>
      (stand.siege[b] ?? 0) - (stand.siege[a] ?? 0)
      // Gleichstand: Wer spaeter den Thron erobert hat, hat den bis dahin Staerksten
      // geschlagen. Danach die Ordnung des Feldes, damit nichts wackelt.
      || (thron.get(b) ?? -1) - (thron.get(a) ?? -1)
      || (platz.get(a) ?? 0) - (platz.get(b) ?? 0))
    .slice(0, MAX_VORBELEGT)

  const hoechste = gewinner.length ? (stand.siege[gewinner[0]] ?? 1) : 1

  return {
    aspekte: gewinner.map(key => ({
      key,
      gewicht: 45 + Math.round(45 * (stand.siege[key] ?? 0) / hoechste),
    })),
    reihung: gewinner,
  }
}
