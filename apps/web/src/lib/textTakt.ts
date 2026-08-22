/**
 * Text in Lesegeschwindigkeit erscheinen lassen.
 *
 * **Das Problem.** Das Modell liefert seine Stücke in Schüben — mal fünf Wörter auf
 * einmal, dann eine Pause, dann ein ganzer Absatz. Ungebremst angezeigt springt der Text,
 * statt zu entstehen, und ist schneller da, als man ihn lesen kann. Das fühlt sich nicht
 * nach „Echo schreibt" an, sondern nach einem Ruck.
 *
 * **Die Trennung.** Der Empfang bleibt so schnell wie er ist; nur die ANZEIGE wird
 * getaktet. Was schon angekommen ist, wartet in einem Puffer.
 *
 * **Das Tempo.** Menschen lesen etwa 17–21 Zeichen pro Sekunde. Genau so schnell zu
 * schreiben fühlt sich zäh an — man wartet. Etwas darüber fühlt sich richtig an: Man kommt
 * mit und wird trotzdem gezogen. Deshalb rund 45 Zeichen pro Sekunde als Grundtempo.
 *
 * **Und warum es sich beschleunigt.** Bei einem festen Tempo läge die Anzeige nach einer
 * langen Antwort weit zurück: Das Modell wäre fertig, und man sähe noch die Hälfte. Also
 * steigt das Tempo mit dem Rückstand — je mehr wartet, desto zügiger wird es aufgeholt.
 * Ist der Empfang beendet, wird der Rest in unter einer Sekunde nachgezogen.
 *
 * **Wer keine Bewegung will, bekommt keine.** Bei `prefers-reduced-motion: reduce` steht
 * der Text sofort vollständig da. Ein Schreibmaschineneffekt ist für manche Menschen nicht
 * hübsch, sondern anstrengend — und für Screenreader ohnehin nur Lärm.
 */
import { useEffect, useRef, useState } from 'react'

/**
 * Grundtempo in Zeichen pro Sekunde.
 *
 * Etwa das Doppelte der Lesegeschwindigkeit (~19 Zeichen/s). Wer das Tempo nachjustieren
 * will, ändert diese eine Zahl: kleiner = ruhiger, größer = drängender.
 */
const GRUNDTEMPO = 38

/**
 * Wie stark ein Rückstand das Tempo anhebt — bewusst SCHWACH.
 *
 * Der erste Anlauf hatte hier 0.5, und das war der Denkfehler: Bei starkem Aufholen
 * pendelt sich die Anzeige auf die Liefergeschwindigkeit des Modells ein. Liefert es 80
 * Zeichen pro Sekunde, zeigt sie am Ende 80 an — also wieder zu schnell, nur mit
 * Umschweifen.
 *
 * Mit einem schwachen Faktor bleibt die Anzeige ruhig und fällt zurück. Genau das ist
 * gewollt: Der Rückstand ist kein Problem, sondern der Puffer, aus dem in Lesegeschwindig-
 * keit geschöpft wird. Aufgeholt wird am Schluss, wenn niemand mehr wartet.
 */
const AUFHOLFAKTOR = 0.06

/** Notbremse für eine ungewöhnlich lange Antwort – sonst dauerte sie Minuten. */
const HOECHSTTEMPO = 200

/** Nach dem Ende des Empfangs: der Rest soll in dieser Zeit durch sein. */
const AUSLAUF_S = 1.0

function bewegungUnerwuenscht(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * Wie schnell gerade nachgezogen wird, in Zeichen pro Sekunde.
 *
 * Steht als eigene Funktion da, weil hier die einzige echte Entscheidung dieser Datei
 * fällt — und eine, die man nur am Gefühl merkt, nicht an einem Fehler.
 *
 * @param rueckstand  wie viele Zeichen empfangen, aber noch nicht angezeigt sind
 * @param laeuft      kommt noch etwas nach?
 */
export function tempoFuer(rueckstand: number, laeuft: boolean): number {
  if (laeuft) return Math.min(GRUNDTEMPO + rueckstand * AUFHOLFAKTOR, HOECHSTTEMPO)
  // Empfang beendet: Was noch aussteht, soll in AUSLAUF_S durch sein – aber nie
  // langsamer als das Grundtempo, sonst stockt ein kurzer Rest unnötig.
  return Math.max(GRUNDTEMPO, rueckstand / AUSLAUF_S)
}

export interface Takt {
  /** Was gerade angezeigt werden soll. */
  sichtbar: string
  /** Ist die Anzeige beim Empfangenen angekommen? */
  aufgeholt: boolean
}

/**
 * Gibt `voll` nach und nach frei.
 *
 * @param voll    der bisher vollständig empfangene Text (wächst)
 * @param laeuft  kommt noch etwas? Danach wird der Rest zügig nachgezogen.
 */
export function useGetakteterText(voll: string, laeuft: boolean): Takt {
  const [anzahl, setAnzahl] = useState(0)
  const genau = useRef(0)          // Nachkommastellen mitführen, sonst ruckelt es
  const sofort = useRef(bewegungUnerwuenscht())

  // Ein neuer Text (oder ein geleerter) beginnt von vorn.
  useEffect(() => {
    if (voll.length < genau.current) {
      genau.current = 0
      setAnzahl(0)
    }
  }, [voll])

  useEffect(() => {
    if (sofort.current) {
      genau.current = voll.length
      setAnzahl(voll.length)
      return
    }
    if (genau.current >= voll.length) return

    let laufend = true
    let zuletzt = performance.now()

    const schritt = (jetzt: number) => {
      if (!laufend) return
      const sekunden = Math.min((jetzt - zuletzt) / 1000, 0.1)   // Tab-Wechsel abfangen
      zuletzt = jetzt

      const tempo = tempoFuer(voll.length - genau.current, laeuft)

      genau.current = Math.min(genau.current + tempo * sekunden, voll.length)
      setAnzahl(Math.floor(genau.current))

      if (genau.current < voll.length) requestAnimationFrame(schritt)
    }

    const id = requestAnimationFrame(schritt)
    return () => { laufend = false; cancelAnimationFrame(id) }
  }, [voll, laeuft])

  return { sichtbar: voll.slice(0, anzahl), aufgeholt: anzahl >= voll.length }
}
