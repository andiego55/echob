/**
 * Echos Antwort im Fall-Bereich lesen, während sie entsteht — als ein Baustein.
 *
 * **Warum es das gibt.** Der freie Fall-Dialog und der Paarraum konnten das längst: Die
 * Antwort erscheint Wort für Wort, statt nach zehn Sekunden Punkten als Block. Die
 * geführten Dialoge — Hypothesen, Themen, Selbsttests — konnten es nicht, obwohl das
 * Backend sie streamt. Es fehlte nur die Verdrahtung, und die stand in `EchoPage` und
 * `couple/EchoChat` zweimal fast gleich da. Ein drittes und viertes Mal wäre eine Fassung
 * zu viel gewesen.
 *
 * **Was hier zusammenkommt.** Drei Dinge, die nur gemeinsam funktionieren:
 *
 *   1. Der Strom selbst (`echoStreamen`) — mit dem Rückfall auf `/chat`, wenn diese
 *      Gesprächsform nicht streamt oder ein Proxy dazwischen keine Ströme durchreicht.
 *   2. Der Takt (`useGetakteterText`) — empfangen wird so schnell es geht, ANGEZEIGT
 *      wird in Lesegeschwindigkeit.
 *   3. Die Übergabe — der Wechsel von der entstehenden zur gespeicherten Antwort in
 *      EINEM Bild, damit sie nie doppelt und nie gar nicht dasteht.
 *
 * **Was der Aufrufer noch tut.** Nur zweierlei: in `onFertig` sagen, wohin die fertige
 * Antwort gehört — die eine Seite schreibt sie in den Zwischenspeicher, die andere lädt
 * den Verlauf neu —, und in `onFehler` aufräumen. Letzteres bekommt die gescheiterte
 * Anfrage mit, damit der geschriebene Text zurück ins Feld kann statt verloren zu gehen.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { echoApi } from '@/api/echo'
import { echoStreamen, StreamNichtMoeglich } from '@/api/echoStream'
import { useGetakteterText, type Takt } from '@/lib/textTakt'
import type { Einstufung } from '@/lib/sseLeser'
import type { EchoChatRequest, EchoChatResponse } from '@/types'

export interface EchoStrom {
  /** Eine Nachricht abschicken. */
  senden: (anfrage: EchoChatRequest) => void
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

export interface EchoStromOptionen {
  /** Wird aufgerufen, wenn die Anzeige die fertige Antwort eingeholt hat. */
  onFertig: (data: EchoChatResponse) => void
  /** Bekommt die gescheiterte Anfrage — damit Geschriebenes zurück ins Feld kann. */
  onFehler?: (anfrage: EchoChatRequest) => void
}

/**
 * @param caseId  der Fall, in dem gesprochen wird
 */
export function useEchoStrom(caseId: string, optionen: EchoStromOptionen): EchoStrom {
  const [stromText, setStromText] = useState('')
  const [stromSafety, setStromSafety] = useState<Einstufung>(null)
  const [uebergabe, setUebergabe] = useState<EchoChatResponse | null>(null)
  const abbruch = useRef<AbortController | null>(null)

  // Ohne Ref stünde `onFertig` in den Abhängigkeiten des Effekts weiter unten — und weil
  // Aufrufer die Funktion meist inline schreiben, liefe er bei jedem Rendern erneut.
  const optRef = useRef(optionen)
  useEffect(() => { optRef.current = optionen })

  // Wer die Seite verlässt, ließe sonst einen Strom weiterlaufen.
  useEffect(() => () => abbruch.current?.abort(), [])

  const mutation = useMutation({
    mutationFn: async (anfrage: EchoChatRequest) => {
      setStromText('')
      setStromSafety(null)
      abbruch.current?.abort()
      abbruch.current = new AbortController()
      try {
        return await echoStreamen(
          caseId, anfrage,
          teil => setStromText(t => t + teil),
          setStromSafety,
          abbruch.current.signal,
        )
      } catch (e) {
        // Der geführte Szenendialog, ein Proxy ohne Stream-Unterstützung: Der gewöhnliche
        // Weg kann dasselbe, nur am Stück. Der Rückfall ist Teil des Entwurfs.
        if (e instanceof StreamNichtMoeglich) return echoApi.chat(caseId, anfrage)
        throw e
      }
    },
    // Hier passiert bewusst NICHTS außer Merken. Würde der Verlauf jetzt neu geladen,
    // stünde die gespeicherte Antwort neben der noch aufholenden Anzeige — dieselbe
    // Antwort zweimal. Den Wechsel macht der Effekt weiter unten, in einem Zug.
    onSuccess: setUebergabe,
    onError: (_fehler, anfrage) => {
      setStromText('')
      setStromSafety(null)
      optRef.current.onFehler?.(anfrage)
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
