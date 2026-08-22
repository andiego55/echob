/**
 * Server-Sent Events lesen — die Mechanik, die sich beide Ströme teilen.
 *
 * **Warum nicht über den normalen Client.** Axios liefert erst, wenn alles da ist — genau
 * das soll hier ja nicht passieren. Also `fetch` mit einem `ReadableStream`, den wir Stück
 * für Stück auslesen.
 *
 * **Warum das eine eigene Datei ist.** Es gibt zwei Ströme: das Fall-Echo und den
 * Paar-Begleiter. Beide sprechen dasselbe Protokoll — `beginn`, `delta`, `fertig`,
 * `fehler` —, und das Zusammensetzen unvollständiger Blöcke ist die eine knifflige Stelle
 * darin: Ein Netzwerkpaket endet mitten in einem Ereignis, und wer den Rest nicht
 * aufhebt, verliert Text. Diesen Fehler will man an EINER Stelle richtig haben.
 *
 * **Was hier bewusst NICHT steht:** was ein Strom bedeutet. Die Adresse, die Nutzlast und
 * der Ergebnistyp gehören zum jeweiligen Bereich; dieses Modul kennt nur das Protokoll.
 * So hängt der Paarbereich nicht am Fall-Bereich, sondern beide an derselben Leitung.
 */
import { supabase } from '@/lib/supabase'

/** Ein Ereignis vom Server. */
type Ereignis =
  /** Kommt VOR dem ersten Text: wie die Antwort einzuordnen ist. */
  | { typ: 'beginn'; safety: Einstufung }
  | { typ: 'delta'; text: string }
  | { typ: 'fertig'; [feld: string]: unknown }
  | { typ: 'fehler'; detail: string }

export type Einstufung = 'acute' | 'elevated' | null

/**
 * Dieser Weg geht nicht — nimm den gewöhnlichen.
 *
 * **Der Rückfall ist Teil des Entwurfs, nicht ein Notnagel.** Der Server lehnt mit 409 ab,
 * wenn eine Gesprächsform nicht gestreamt werden kann (Steuerbefehle, Szenen). Dasselbe
 * bei einem Proxy, der Ströme nicht durchreicht. Der Nutzer merkt davon nur, dass die
 * Antwort am Stück kommt.
 */
export class StreamNichtMoeglich extends Error {}

/**
 * Schickt die Anfrage los und gibt die noch offene Antwort zurück.
 *
 * @param pfad  ab `/api/v1`, z. B. `/couple/links/…/echo/stream`
 */
export async function stromAnfordern(
  pfad: string,
  nutzlast: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  // Dieselbe Basis wie der Axios-Client: leer in der Entwicklung (Vite leitet /api weiter),
  // im Produktionsbau die echte Adresse.
  const basis = (import.meta.env.VITE_API_URL ?? '') + '/api/v1'

  const antwort = await fetch(basis + pfad, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(nutzlast),
    signal,
  })

  // 409 = diese Gesprächsform läuft ohne Streaming. Kein Fehler, ein anderer Weg.
  // Alles andere führt ebenfalls zurück auf den gewöhnlichen Weg – der meldet den Fehler
  // dann mit seiner eigenen, geprüften Übersetzung.
  if (!antwort.ok || !antwort.body) throw new StreamNichtMoeglich()
  return antwort
}

/**
 * Liest den Strom aus und gibt zurück, was das `fertig`-Ereignis trägt.
 *
 * @param onStueck      für jedes Textstück, sofort
 * @param onEinstufung  einmal, bevor Text kommt – damit die Blase richtig aussieht
 */
export async function stromLesen<T>(
  antwort: Response,
  onStueck: (text: string) => void,
  onEinstufung?: (safety: Einstufung) => void,
): Promise<T> {
  const leser = antwort.body!.getReader()
  const dekoder = new TextDecoder()
  let rest = ''
  let ergebnis: T | null = null

  for (;;) {
    const { done, value } = await leser.read()
    if (done) break
    rest += dekoder.decode(value, { stream: true })

    // Ereignisse sind durch eine Leerzeile getrennt; das letzte Stück kann unvollständig
    // sein und bleibt für die nächste Runde liegen. Genau hier ginge sonst Text verloren.
    const bloecke = rest.split('\n\n')
    rest = bloecke.pop() ?? ''

    for (const block of bloecke) {
      const zeile = block.split('\n').find(z => z.startsWith('data: '))
      if (!zeile) continue
      let e: Ereignis
      try { e = JSON.parse(zeile.slice(6)) } catch { continue }

      if (e.typ === 'beginn') onEinstufung?.(e.safety)
      else if (e.typ === 'delta') onStueck(e.text)
      else if (e.typ === 'fertig') ergebnis = e as unknown as T
      else if (e.typ === 'fehler') throw new Error(e.detail)
    }
  }

  if (ergebnis === null) {
    // Verbindung abgerissen, bevor gespeichert wurde. Der Text auf dem Schirm ist echt,
    // aber nicht abgelegt — das muss die Oberfläche wissen.
    throw new Error('Die Verbindung ist abgebrochen, bevor die Antwort gespeichert war.')
  }
  return ergebnis
}
