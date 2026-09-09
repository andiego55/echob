/**
 * Resonanz — was jemand an einer erfundenen Szene wiedererkennt.
 *
 * Hier steht die Logik ohne Bildschirm: die vier Reaktionen, die beiden Skalen, das
 * Gedächtnis für Menschen ohne Konto und die Sätze, mit denen aus Zahlen etwas wird, das
 * man lesen mag.
 *
 * **Warum die Zahlensätze hier stehen und nicht im JSX.** „147 Menschen kennen das" ist
 * bei diesem Material kein Zähler, sondern der Widerspruch zu dem Satz, der solche
 * Beziehungen zusammenhält: *Ich bilde mir das ein.* Ein Text, der bei 1 Person „1
 * Menschen kennen das" sagt, macht aus diesem Widerspruch eine Panne. Die Fälle gehören
 * deshalb an eine Stelle, an der man sie prüfen kann.
 */

export const REAKTIONEN = ['kenne_ich', 'kannte_ich', 'andere_seite', 'nicht_meins'] as const
export type Reaktion = (typeof REAKTIONEN)[number]

export interface ReaktionsInfo {
  key: Reaktion
  label: string
  /** Steht unter dem Knopf. „Kenne ich" und „Kannte ich mal" sehen sonst gleich aus. */
  hinweis: string
  /** Für den Zählersatz: „147 Menschen **kennen das**". */
  zaehler: string
}

export const REAKTIONS_INFOS: ReaktionsInfo[] = [
  {
    key: 'kenne_ich',
    label: 'Kenne ich',
    hinweis: 'So ist es bei mir — jetzt.',
    zaehler: 'kennen das',
  },
  {
    key: 'kannte_ich',
    label: 'Kannte ich mal',
    hinweis: 'War so. Ist vorbei oder seltener geworden.',
    zaehler: 'kannten das',
  },
  {
    key: 'andere_seite',
    label: 'Von der anderen Seite',
    hinweis: 'Ich erkenne mich eher in der Person wieder, die das tut.',
    zaehler: 'kennen die andere Seite',
  },
  {
    key: 'nicht_meins',
    label: 'Nicht mein Thema',
    hinweis: 'Kenne ich so nicht.',
    zaehler: 'kennen das nicht',
  },
]

export const REAKTION_LABEL: Record<Reaktion, string> = Object.fromEntries(
  REAKTIONS_INFOS.map(r => [r.key, r.label]),
) as Record<Reaktion, string>

/** Reaktionen, die ein Wiedererkennen ausdrücken — nur sie öffnen die Skalen. */
export const WIEDERERKANNT: Reaktion[] = ['kenne_ich', 'kannte_ich', 'andere_seite']

export function istWiedererkannt(r: Reaktion | null | undefined): boolean {
  return !!r && WIEDERERKANNT.includes(r)
}

// ── Die beiden Skalen ───────────────────────────────────────────────────────
// Zwei, nicht fünf. Jede weitere Frage kostet die Hälfte der Antworten, und diese beiden
// tragen am meisten: wie oft (Muster oder Einzelfall) und wie schwer (Belastung).
//
// `distress` liegt absichtlich im selben Bereich 1–5 wie `distress_score` einer echten
// Szene. Eine wiedererkannte und eine selbst geschriebene Szene sind dadurch vergleichbar.
export interface Skala {
  key: 'frequency' | 'distress'
  frage: string
  /** Ein Wort je Punkt. Eine nackte Skala von 1 bis 5 bedeutet für jeden etwas anderes. */
  punkte: [string, string, string, string, string]
}

export const SKALEN: Skala[] = [
  {
    key: 'frequency',
    frage: 'Wie oft ist das bei dir?',
    punkte: ['Einmal', 'Selten', 'Manchmal', 'Oft', 'Ständig'],
  },
  {
    key: 'distress',
    frage: 'Wie sehr belastet dich das?',
    punkte: ['Kaum', 'Etwas', 'Deutlich', 'Stark', 'Sehr stark'],
  },
]

/**
 * Das Feld auf der Leseseite — und was es ausdrücklich NICHT ist.
 *
 * Es hieß einmal „Was ist bei dir anders?", und aus seinem Inhalt wurde mit einem Klick
 * eine Fall-Szene. Das war der Fehler dieses Features: Ein Text, der im unmittelbaren
 * Eindruck einer erfundenen Geschichte entsteht, übernimmt ihre Einzelheiten — und eine
 * geliehene Szene lässt sich hinterher nicht mehr von einer erlebten unterscheiden.
 *
 * Jetzt heißt es, was es ist: ein erster Gedanke. In der Ausarbeitung im Fall wird er der
 * Person vorgelegt — als etwas zu Prüfendes, nicht als Inhalt.
 */
export const NOTIZ_FRAGE = 'Was ging dir dabei durch den Kopf?'
export const NOTIZ_HINWEIS =
  'Ein erster Gedanke, mehr muss es hier nicht sein. Eine Szene wird daraus nicht — '
  + 'die schreibst du später in Ruhe in deinem Fall, mit ein paar Fragen, die helfen, '
  + 'dein Erlebnis von dieser Geschichte zu trennen.'
export const MAX_NOTIZ = 2000

// ── Zahlen in Sätze ─────────────────────────────────────────────────────────
export type Zaehler = Partial<Record<Reaktion, number>>

/**
 * Wie viele Reaktionen es insgesamt gibt — der Nenner.
 *
 * Ohne ihn ist „147 kennen das" nicht einzuordnen: 147 von 150 ist etwas anderes als
 * 147 von 3000.
 */
export function gesamt(z: Zaehler): number {
  return REAKTIONEN.reduce((summe, r) => summe + (z[r] ?? 0), 0)
}

/**
 * Der Satz unter den Knöpfen.
 *
 * `eigene` ist die Reaktion der lesenden Person — nur nötig für den Sonderfall, dass sie
 * die einzige ist. „1 Menschen kennen das" wäre an dieser Stelle die falscheste aller
 * möglichen Antworten; wer gerade zum ersten Mal zugegeben hat, dass er das kennt, soll
 * keine kaputte Zahl sehen.
 */
export function zaehlerSatz(z: Zaehler, eigene?: Reaktion | null): string {
  const teile: string[] = []
  for (const info of REAKTIONS_INFOS) {
    // „Nicht mein Thema" wird gezählt (es ist der Nenner), aber nicht ausgestellt:
    // Eine Szene, unter der steht, wie viele sie NICHT kennen, lädt niemanden ein.
    if (info.key === 'nicht_meins') continue
    const n = z[info.key] ?? 0
    if (n <= 0) continue
    if (n === 1) {
      teile.push(
        eigene === info.key
          ? `Bisher hast nur du das markiert`
          : `Eine Person ${info.zaehler.replace(/^kennen/, 'kennt').replace(/^kannten/, 'kannte')}`,
      )
    } else {
      teile.push(`${n.toLocaleString('de-DE')} Menschen ${info.zaehler}`)
    }
  }
  return teile.join(' · ')
}

/**
 * Wie viele ANDERE diese Szene wiedererkannt haben — die eigene Stimme abgezogen.
 *
 * **Wozu diese Funktion existiert.** Ohne sie stand unter der ersten Reaktion einer Szene
 * der Satz „Du bist damit nicht allein." — obwohl gerade niemand sonst sie markiert hatte.
 * Bei diesem Material ist das nicht bloß ungenau: Wer eben zugegeben hat, dass er eine
 * Szene über Erschöpfung kennt, bekommt einen Trost gereicht, den die Zahlen nicht decken.
 * Das ist dieselbe Sorte Fehler wie eine Namensentfernung, die es nicht gibt — es klingt
 * gut und stimmt nicht.
 */
export function andereWiedererkennen(z: Zaehler, eigene?: Reaktion | null): number {
  const summe = WIEDERERKANNT.reduce((s, r) => s + (z[r] ?? 0), 0)
  return Math.max(0, summe - (istWiedererkannt(eigene) ? 1 : 0))
}

/**
 * Der Nenner als Satzteil — oder nichts.
 *
 * Erst ab einer Handvoll: „von 1 Rückmeldungen" ist falsch geschrieben UND nichtssagend,
 * und „von 2" sagt weniger als gar nichts.
 */
export function nennerSatz(z: Zaehler): string {
  const n = gesamt(z)
  return n >= 5 ? `von ${n.toLocaleString('de-DE')} Rückmeldungen` : ''
}

// ── Gedächtnis ohne Konto ───────────────────────────────────────────────────
// Wer ohne Anmeldung tippt, soll den Knopf gedrückt vorfinden, wenn er zurückkommt — und
// bei der Registrierung gefragt werden, ob das mitkommen soll.
//
// Ausschliesslich hier, nie im Rendern: Die Szenenseiten werden vorgerendert, und in Node
// gibt es kein localStorage. Jeder Zugriff steht deshalb in try/catch und wird aus einem
// Effekt gerufen.
const SPEICHER = 'echob.resonanz.anonym'

export type AnonymeReaktionen = Record<string, Reaktion>

export function anonymLesen(): AnonymeReaktionen {
  if (typeof window === 'undefined') return {}
  try {
    const roh = window.localStorage.getItem(SPEICHER)
    if (!roh) return {}
    const daten = JSON.parse(roh)
    if (!daten || typeof daten !== 'object') return {}
    // Fremde Werte verwerfen, statt sie später ans Backend zu reichen: Ein manipulierter
    // Eintrag im Speicher würde sonst bei der Übernahme zu einer Anfrage, die 422 gibt.
    const sauber: AnonymeReaktionen = {}
    for (const [slug, wert] of Object.entries(daten)) {
      if (typeof wert === 'string' && (REAKTIONEN as readonly string[]).includes(wert)) {
        sauber[slug] = wert as Reaktion
      }
    }
    return sauber
  } catch {
    return {}
  }
}

export function anonymMerken(slug: string, reaktion: Reaktion): void {
  if (typeof window === 'undefined') return
  try {
    const alle = anonymLesen()
    alle[slug] = reaktion
    window.localStorage.setItem(SPEICHER, JSON.stringify(alle))
  } catch {
    // Privates Fenster, blockierte Speicherung: Der Knopf bleibt dann eben nicht gedrückt.
    // Das ist ein Schönheitsfehler, kein Grund, die Reaktion nicht zu senden.
  }
}

export function anonymVergessen(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SPEICHER)
  } catch { /* siehe oben */ }
}

/** Wie viele Szenen jemand ohne Konto markiert hat — für die Frage nach der Anmeldung. */
export function anonymAnzahl(): number {
  return Object.keys(anonymLesen()).length
}
