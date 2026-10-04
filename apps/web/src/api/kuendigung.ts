/**
 * Die Kündigung nach § 312k BGB — ein öffentlicher Aufruf ohne Anmeldung.
 *
 * **Warum eine eigene Axios-Instanz und nicht `apiClient`.** Der gemeinsame Client hängt
 * in seinem Request-Interceptor an jedem Aufruf `supabase.auth.getSession()` davor und
 * fasst bei 401 mit einem Token-Refresh nach. Für jeden anderen Endpunkt ist das richtig.
 * Hier wäre es falsch: Diese Seite muss funktionieren, **wenn die Anmeldung gerade nicht
 * funktioniert** — abgelaufene Sitzung, verlorenes Passwort, Supabase nicht erreichbar.
 * Genau das ist der Fall, für den § 312k den Knopf verlangt.
 *
 * Die längere Frist ist Absicht: Der Aufruf schreibt eine Zeile und verschickt zwei
 * E-Mails, und ein Abbruch nach fünfzehn Sekunden hinterlässt eine Person, die nicht
 * weiß, ob sie gekündigt hat.
 */
import axios from 'axios'

const kuendigungsClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? '') + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

export type KuendigungsArt = 'ordentlich' | 'ausserordentlich'
export type Wirkung = 'naechstmoeglich' | 'datum'

export interface KuendigungEingang {
  art: KuendigungsArt
  grund: string
  vertrag: string
  name: string
  email: string
  kennung: string
  wirkung: Wirkung
  /** ISO-Datum, nur wenn `wirkung === 'datum'`. */
  wirkung_datum: string | null
  /** Honeypot — bleibt leer, wenn ein Mensch das Formular ausfüllt. */
  company: string
}

export interface KuendigungAck {
  eingegangen_am: string
  message: string
  /** Der Wortlaut zum Aufbewahren (§ 312k Abs. 3 BGB). */
  erklaerung: string
}

export const kuendigungApi = {
  kuendigen: (daten: KuendigungEingang) =>
    kuendigungsClient.post<KuendigungAck>('/kuendigung', daten).then(r => r.data),
}
