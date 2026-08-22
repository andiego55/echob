/**
 * Echos Antwort lesen, während sie entsteht.
 *
 * **Warum nicht über den normalen Client.** Axios liefert erst, wenn alles da ist — genau
 * das soll hier ja nicht passieren. Also `fetch` mit einem `ReadableStream`, den wir Stück
 * für Stück auslesen.
 *
 * **Der Rückfall ist Teil des Entwurfs, nicht ein Notnagel.** Der Server lehnt mit 409 ab,
 * wenn eine Gesprächsform nicht gestreamt werden kann (Steuerbefehle, geführte Dialoge,
 * Szenen) — dann nimmt die Oberfläche den gewöhnlichen Weg. Dasselbe bei einem Proxy, der
 * Streams nicht durchreicht. Der Nutzer merkt davon nur, dass die Antwort am Stück kommt.
 */
import { supabase } from '@/lib/supabase'
import type { EchoChatRequest, EchoChatResponse } from '@/types'

/** Ein Ereignis vom Server. */
type Ereignis =
  /** Kommt VOR dem ersten Text: Wie die Antwort einzuordnen ist. */
  | { typ: 'beginn'; safety: 'acute' | 'elevated' | null }
  | { typ: 'delta'; text: string }
  | { typ: 'fertig'; user_message: unknown; assistant_message: unknown; chat_session_id: string | null }
  | { typ: 'fehler'; detail: string }

export class StreamNichtMoeglich extends Error {}

/**
 * Schickt eine Nachricht und ruft `onStueck` für jedes Textstück.
 *
 * Wirft `StreamNichtMoeglich`, wenn dieser Weg nicht geht — die Aufrufstelle nimmt dann
 * `echoApi.chat`. Alle anderen Fehler werden weitergereicht.
 */
export async function echoStreamen(
  caseId: string,
  daten: EchoChatRequest,
  onStueck: (text: string) => void,
  /** Wird einmal gerufen, bevor Text kommt – damit die Blase richtig aussieht. */
  onEinstufung?: (safety: 'acute' | 'elevated' | null) => void,
  signal?: AbortSignal,
): Promise<EchoChatResponse> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  // Dieselbe Basis wie der Axios-Client: leer in der Entwicklung (Vite leitet /api weiter),
  // im Produktionsbau die echte Adresse.
  const basis = (import.meta.env.VITE_API_URL ?? '') + '/api/v1'

  const antwort = await fetch(`${basis}/cases/${caseId}/echo/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(daten),
    signal,
  })

  // 409 = diese Gesprächsform läuft ohne Streaming. Kein Fehler, ein anderer Weg.
  if (antwort.status === 409) throw new StreamNichtMoeglich()
  if (!antwort.ok || !antwort.body) {
    // Auch alles andere führt zurück auf den gewöhnlichen Weg – der meldet den Fehler
    // dann mit seiner eigenen, geprüften Übersetzung.
    throw new StreamNichtMoeglich()
  }

  const leser = antwort.body.getReader()
  const dekoder = new TextDecoder()
  let rest = ''
  let ergebnis: EchoChatResponse | null = null

  for (;;) {
    const { done, value } = await leser.read()
    if (done) break
    rest += dekoder.decode(value, { stream: true })

    // Ereignisse sind durch eine Leerzeile getrennt; das letzte Stück kann unvollständig
    // sein und bleibt für die nächste Runde liegen.
    const bloecke = rest.split('\n\n')
    rest = bloecke.pop() ?? ''

    for (const block of bloecke) {
      const zeile = block.split('\n').find(z => z.startsWith('data: '))
      if (!zeile) continue
      let e: Ereignis
      try { e = JSON.parse(zeile.slice(6)) } catch { continue }

      if (e.typ === 'beginn') onEinstufung?.(e.safety)
      else if (e.typ === 'delta') onStueck(e.text)
      else if (e.typ === 'fertig') ergebnis = e as unknown as EchoChatResponse
      else if (e.typ === 'fehler') throw new Error(e.detail)
    }
  }

  if (!ergebnis) {
    // Verbindung abgerissen, bevor gespeichert wurde. Der Text auf dem Schirm ist echt,
    // aber nicht abgelegt — das muss die Oberfläche wissen.
    throw new Error('Die Verbindung ist abgebrochen, bevor die Antwort gespeichert war.')
  }
  return ergebnis
}
