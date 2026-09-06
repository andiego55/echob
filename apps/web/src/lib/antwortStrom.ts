/**
 * Eine Antwort lesen, während sie entsteht — unabhängig davon, wessen Antwort es ist.
 *
 * **Warum es das gibt.** `lib/echoStrom` konnte das längst, war aber fest an den
 * Fall-Dialog der nutzenden Person gebunden: an dessen Adresse, dessen Rückfall, dessen
 * Typen. Als der Fachpersonen-Dialog dasselbe brauchte, standen zwei Möglichkeiten im
 * Raum — die vierzig Zeilen ein zweites Mal hinschreiben, oder das Gemeinsame
 * herausziehen. Das Gemeinsame ist alles außer zwei Funktionen.
 *
 * **Was hier zusammenkommt** (unverändert aus `echoStrom`, nur ohne Fallbezug):
 *
 *   1. Der Strom selbst — mit dem Rückfall auf den gewöhnlichen Weg, wenn diese
 *      Gesprächsform nicht streamt oder ein Proxy dazwischen keine Ströme durchreicht.
 *   2. Der Takt (`useGetakteterText`) — empfangen wird so schnell es geht, ANGEZEIGT
 *      wird in Lesegeschwindigkeit.
 *   3. Die Übergabe — der Wechsel von der entstehenden zur gespeicherten Antwort in
 *      EINEM Bild, damit sie nie doppelt und nie gar nicht dasteht.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { StreamNichtMoeglich } from '@/lib/sseLeser'
import { useGetakteterText, type Takt } from '@/lib/textTakt'
import type { Einstufung } from '@/lib/sseLeser'

export interface AntwortStrom<TAnfrage> {
  /** Eine Nachricht abschicken. */
  senden: (anfrage: TAnfrage) => void
  /** Was gerade angezeigt werden soll, und ob die Anzeige aufgeholt hat. */
  takt: Takt
  /** Wie die entstehende Antwort einzuordnen ist. Kommt VOR dem ersten Wort. */
  stromSafety: Einstufung
  /**
   * „Echo ist noch dabei" — bis der letzte Buchstabe steht.
   *
   * `isPending` allein reicht nicht: Es wird schon falsch, sobald die Antwort
   * vollständig empfangen ist, während die Anzeige noch aufholt. In dieser Lücke
   * könnte man erneut senden, und die erste Antwort wanderte nie in den Verlauf.
   */
  beschaeftigt: boolean
  fehler: unknown
  /** Alles wegwerfen — etwa beim Zurücksetzen eines Dialogs. */
  verwerfen: () => void
}

export interface AntwortStromOptionen<TAnfrage, TAntwort> {
  /** Der Strom. Wirft `StreamNichtMoeglich`, wenn dieser Weg nicht geht. */
  streamen: (
    anfrage: TAnfrage,
    onStueck: (text: string) => void,
    onEinstufung: (s: Einstufung) => void,
    signal: AbortSignal,
  ) => Promise<TAntwort>
  /** Der gewöhnliche Weg — dieselbe Antwort, nur am Stück. */
  rueckfall: (anfrage: TAnfrage) => Promise<TAntwort>
  /** Wird aufgerufen, wenn die Anzeige die fertige Antwort eingeholt hat. */
  onFertig: (data: TAntwort) => void
  /**
   * Bekommt die gescheiterte Anfrage — damit Geschriebenes zurück ins Feld kann —
   * und den Fehler, weil manche Aufrufer ihn auswerten (etwa 402 für ein Kontingent).
   */
  onFehler?: (anfrage: TAnfrage, fehler: unknown) => void
}

export function useAntwortStrom<TAnfrage, TAntwort>(
  optionen: AntwortStromOptionen<TAnfrage, TAntwort>,
): AntwortStrom<TAnfrage> {
  const [stromText, setStromText] = useState('')
  const [stromSafety, setStromSafety] = useState<Einstufung>(null)
  const [uebergabe, setUebergabe] = useState<TAntwort | null>(null)
  const abbruch = useRef<AbortController | null>(null)

  // Ohne Ref stünden die Rückrufe in den Abhängigkeiten des Effekts weiter unten — und
  // weil Aufrufer sie meist inline schreiben, liefe er bei jedem Rendern erneut.
  const optRef = useRef(optionen)
  useEffect(() => { optRef.current = optionen })

  // Wer die Seite verlässt, ließe sonst einen Strom weiterlaufen.
  useEffect(() => () => abbruch.current?.abort(), [])

  const mutation = useMutation({
    mutationFn: async (anfrage: TAnfrage) => {
      setStromText('')
      setStromSafety(null)
      abbruch.current?.abort()
      abbruch.current = new AbortController()
      try {
        return await optRef.current.streamen(
          anfrage,
          teil => setStromText(t => t + teil),
          setStromSafety,
          abbruch.current.signal,
        )
      } catch (e) {
        // Eine Gesprächsform ohne Strom, ein Proxy ohne Stream-Unterstützung: Der
        // gewöhnliche Weg kann dasselbe, nur am Stück. Der Rückfall ist Teil des Entwurfs.
        if (e instanceof StreamNichtMoeglich) return optRef.current.rueckfall(anfrage)
        throw e
      }
    },
    // Hier passiert bewusst NICHTS außer Merken. Würde der Verlauf jetzt neu geladen,
    // stünde die gespeicherte Antwort neben der noch aufholenden Anzeige — dieselbe
    // Antwort zweimal. Den Wechsel macht der Effekt weiter unten, in einem Zug.
    onSuccess: setUebergabe,
    onError: (fehler, anfrage) => {
      setStromText('')
      setStromSafety(null)
      optRef.current.onFehler?.(anfrage, fehler)
    },
    retry: false,
  })

  const takt = useGetakteterText(stromText, mutation.isPending)

  useEffect(() => {
    if (!uebergabe || mutation.isPending || !takt.aufgeholt) return
    optRef.current.onFertig(uebergabe)
    setStromText('')
    setStromSafety(null)
    setUebergabe(null)
  }, [uebergabe, mutation.isPending, takt.aufgeholt])

  const verwerfen = useCallback(() => {
    abbruch.current?.abort()
    setStromText('')
    setStromSafety(null)
    setUebergabe(null)
  }, [])

  return {
    senden: mutation.mutate,
    takt,
    stromSafety,
    beschaeftigt: mutation.isPending || uebergabe !== null,
    fehler: mutation.error,
    verwerfen,
  }
}
