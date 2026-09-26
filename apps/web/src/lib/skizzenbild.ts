/**
 * Aus einer Skizze wird ein Bild und ein Text — beides ohne Modell.
 *
 * **Warum das wichtig ist.** Bis hierhin war die Traumbeziehung ein Formular, das einen
 * Bericht erzeugt: Man tippt vier Schritte durch und bekommt dafür nichts. Sichtbar wurde die
 * Skizze erst im Vergleich — der kostet ein Kontingent, braucht einen passenden Fall und eine
 * Minute Wartezeit. Was fehlte, ist der Spiegel: dass die Skizze einem beim Bauen schon etwas
 * über einen zeigt.
 *
 * **Und ausdrücklich kein Modell.** Nicht aus Sparsamkeit. Ein erzeugter Text wäre eine
 * Deutung, und eine Deutung darf man bezweifeln; dieser Text ist nur eine andere Anordnung
 * dessen, was jemand selbst angetippt hat. Deshalb steht neben ihm, dass nichts hinzugekommen
 * ist — und deshalb erscheint er ohne Wartezeit, mitten in der Arbeit, wo er etwas nützt.
 *
 * **Die Arbeitsteilung zwischen Bild und Text.** Das Bild zeigt *was* und *wie viel*, in
 * welcher Reihenfolge — eine Gestalt, die man wiedererkennt. Der Text sagt, was man dafür
 * hergegeben hat (die Abwägungen) und was man selbst geschrieben hat. Beides in ein Medium zu
 * pressen hieße, entweder Prosa in Balken zu malen oder eine Form vorzulesen.
 *
 * Reine Funktionen, kein React: Was hier entschieden wird, ist prüfbar, und die Bauart der
 * Darstellung darf sich ändern, ohne dass eine Aussage kippt.
 */
import type { IdealAbwaegung, IdealAspektFamilie } from '@/api/kompassIdeal'

/** Der Zustand, aus dem beides entsteht — die Skizze im Browser. */
export interface Entwurf {
  aspekte: { key: string; gewicht: number }[]
  reihung: string[]
  abwaegungen: Record<string, number>
  eigenes: string
}

/** Was der Katalog dazu beisteuert. Nur das Nötige, damit die Funktionen prüfbar bleiben. */
export interface Vokabular {
  aspekt_familien: IdealAspektFamilie[]
  abwaegungen: IdealAbwaegung[]
}

// ── Das Bild ─────────────────────────────────────────────────────────────────

/**
 * Ein Band des Bildes.
 *
 * **Es trägt das Gewicht und nicht die Breite.** Die Umrechnung steht in
 * `components/app/kompass/SkizzenBaender` — dort, wo gezeichnet wird, und nur dort. Sie
 * hier ein zweites Mal zu haben hiesse: zwei Zahlen für dieselbe Sache, und irgendwann
 * sieht dieselbe Skizze an zwei Orten verschieden aus.
 */
export interface Band {
  key: string
  label: string
  /** 0–100 — wie viel davon. */
  gewicht: number
  /** Steht der Aspekt in der Reihenfolge? Dann trägt er das Bild, sonst gehört er dazu. */
  geordnet: boolean
  /** 0 = ganz oben. Nur für die Abstufung der Farbe, nicht für eine Rangzahl im Bild. */
  rang: number
}

/**
 * Die Bänder des Bildes, von oben nach unten.
 *
 * **Die Reihenfolge ist die Aussage, dann das Gewicht.** Was jemand ausdrücklich geordnet hat,
 * steht oben — in genau seiner Ordnung. Alles Weitere sortiert sich nach Gewicht, und bei
 * gleichem Gewicht nach der Ordnung des Katalogs: Ein Bild, das bei jedem Neuzeichnen
 * umspringt, ist kein Bild von einem selbst.
 */
export function gestalt(entwurf: Entwurf, vokabular: Vokabular): Band[] {
  const alle = vokabular.aspekt_familien.flatMap(f => f.aspekte)
  const platz = new Map(alle.map((a, i) => [a.key, i]))
  const label = (key: string) => alle.find(a => a.key === key)?.label

  const gewaehlt = entwurf.aspekte.filter(a => label(a.key))
  const geordnet = entwurf.reihung.filter(k => gewaehlt.some(a => a.key === k))

  const rest = gewaehlt
    .filter(a => !geordnet.includes(a.key))
    .sort((a, b) =>
      b.gewicht - a.gewicht || (platz.get(a.key) ?? 0) - (platz.get(b.key) ?? 0))

  const folge = [
    ...geordnet.map(k => ({ eintrag: gewaehlt.find(a => a.key === k)!, geordnet: true })),
    ...rest.map(eintrag => ({ eintrag, geordnet: false })),
  ]

  return folge.map(({ eintrag, geordnet: fest }, i) => ({
    key: eintrag.key,
    label: label(eintrag.key)!,
    gewicht: clamp(eintrag.gewicht),
    geordnet: fest,
    rang: i,
  }))
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 50))
}

/**
 * Eine Reihenfolge, wie sie sich aus den Gewichten ergibt — als Vorschlag.
 *
 * **Warum es den gibt.** Schritt 2 fragt nach Gewichten, Schritt 4 nach der Reihenfolge:
 * zwei Instrumente für dieselbe Auskunft. Wer „Sicherheit 90" und „Zärtlichkeit 40" gesetzt
 * hat, hat die Reihenfolge schon gesagt — ihn danach noch einmal von vorn ordnen zu lassen
 * ist keine Gründlichkeit, sondern doppelte Arbeit.
 *
 * **Und warum trotzdem nur ein Vorschlag.** Ein Gewicht sagt, wie viel man von etwas will.
 * Die Reihenfolge sagt, was im Zweifel vorgeht — und das ist nicht dasselbe: Man kann von
 * einer Sache wenig wollen und trotzdem darauf bestehen. Deshalb wird hier nichts
 * gespeichert und nichts behauptet; es steht nur schon einmal da, und korrigieren ist
 * leichter als ordnen.
 */
export function reihungsVorschlag(entwurf: Entwurf, vokabular: Vokabular, max: number): string[] {
  return gestalt(entwurf, vokabular).slice(0, Math.max(0, max)).map(b => b.key)
}

// ── Der Text ─────────────────────────────────────────────────────────────────

/**
 * Ein Stück Text — entweder Bindeglied oder **Marke**.
 *
 * **Warum Teile und kein Satz.** Die Etiketten des Katalogs sind ganze Aussagen („Ich muss
 * nicht aufpassen", „Schuld bleibt, wo sie hingehört") und keine Satzglieder. In einen
 * Trägersatz gespleißt ergeben sie Kauderwelsch: *„Du willst vor allem Ich muss nicht
 * aufpassen."* Als abgesetzte Marke gelesen stimmt jede Form — die Typografie trägt, was die
 * Grammatik nicht kann. Und ein Test kann die Zusammensetzung prüfen, statt an einer
 * Zeichenkette zu raten.
 */
export type SatzTeil =
  | { art: 'text'; wert: string }
  | { art: 'marke'; wert: string }

const t = (wert: string): SatzTeil => ({ art: 'text', wert })
const m = (wert: string): SatzTeil => ({ art: 'marke', wert })

/** Höchstlänge des Zitats aus den eigenen Worten. Ein Absatz ist kein Zitat mehr. */
const ZITAT_MAX = 110

/**
 * Was bisher dasteht — in Absätzen, jeder aus Teilen.
 *
 * Bis zu vier Absätze, und jeder erscheint nur, wenn es ihn zu sagen gibt: der Vorrang, der
 * Rest, eine Abwägung, die eigenen Worte. **Es wird nichts ergänzt und nichts geglättet.**
 */
export function satzTeile(entwurf: Entwurf, vokabular: Vokabular): SatzTeil[][] {
  // Die Etiketten kommen aus `gestalt` mit — dort werden sie schon aufgelöst, und zweimal
  // dasselbe nachzuschlagen heißt, zwei Stellen zu haben, an denen es auseinandergehen kann.
  const bild = gestalt(entwurf, vokabular)
  const absaetze: SatzTeil[][] = []

  // ── Der Vorrang ────────────────────────────────────────────────────────────
  if (bild.length > 0) {
    const [erst, zweit] = bild
    // „Ganz oben" nur, wenn jemand wirklich geordnet hat. Sonst wäre eine Sortierung nach
    // Gewicht als ausdrückliche Entscheidung ausgegeben — und die hat niemand getroffen.
    const auftakt = erst.geordnet ? 'Ganz oben steht ' : 'Am meisten Gewicht hat '
    const erster: SatzTeil[] = [t(auftakt), m(erst.label)]
    if (zweit && (erst.geordnet ? zweit.geordnet : true)) {
      erster.push(t(erst.geordnet ? ', gleich danach ' : ', dann '), m(zweit.label))
    }
    erster.push(t('.'))
    absaetze.push(erster)
  }

  // ── Was noch dazugehört ────────────────────────────────────────────────────
  const genannt = bild.slice(0, bild[1] ? 2 : 1).length
  const weitere = bild.length - genannt
  if (weitere > 0) {
    absaetze.push([t(weitere === 1
      ? 'Eine weitere Sache gehört dazu.'
      : `${weitere} weitere Dinge gehören dazu.`)])
  }

  // ── Eine Abwägung ──────────────────────────────────────────────────────────
  // Nur EINE, und die erste des Katalogs, die beantwortet ist. Alle aufzuzählen machte aus
  // einem Spiegel eine Bilanz — und sechs Zeilen liest niemand mitten in der Arbeit.
  const paar = vokabular.abwaegungen.find(p => entwurf.abwaegungen[p.key] !== undefined)
  if (paar) {
    const wert = entwurf.abwaegungen[paar.key]
    if (wert > 35 && wert < 65) {
      absaetze.push([
        t('Zwischen '), m(paar.links), t(' und '), m(paar.rechts),
        t(' willst du beides gleich.'),
      ])
    } else {
      const [vor, zurueck] = wert <= 35 ? [paar.links, paar.rechts] : [paar.rechts, paar.links]
      absaetze.push([
        t('Wenn es nicht beides geben kann, wiegt '), m(vor),
        t(' schwerer als '), m(zurueck), t('.'),
      ])
    }
  }

  // ── Die eigenen Worte ──────────────────────────────────────────────────────
  const eigen = zitat(entwurf.eigenes)
  if (eigen) absaetze.push([t('In deinen Worten: '), m(eigen)])

  return absaetze
}

/**
 * Der erste Satz der eigenen Worte, gekürzt.
 *
 * Gekürzt und nicht ganz: Der Spiegel steht mitten in der Arbeit und darf nicht zum Aufsatz
 * werden — der ganze Text steht zwei Abschnitte weiter unten, wo man ihn geschrieben hat. Am
 * Wortende getrennt, nicht mitten im Wort.
 */
export function zitat(eigenes: string): string | null {
  const roh = (eigenes || '').trim().replace(/\s+/g, ' ')
  if (!roh) return null
  const satzende = roh.search(/[.!?](\s|$)/)
  const erster = satzende > 0 ? roh.slice(0, satzende + 1) : roh
  if (erster.length <= ZITAT_MAX) return erster
  const gekuerzt = erster.slice(0, ZITAT_MAX)
  const luecke = gekuerzt.lastIndexOf(' ')
  return (luecke > 40 ? gekuerzt.slice(0, luecke) : gekuerzt).trimEnd() + ' …'
}
