import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { supabase } from '@/lib/supabase'
import { darfNachfassen, einmalGleichzeitig } from './nachfassen'

/**
 * Zentrale Axios-Instanz für alle /api/v1/* Aufrufe.
 *
 * Im Vite-Dev-Server wird /api/* per Proxy an localhost:8000 weitergeleitet
 * (vite.config.ts). Im Production-Build zeigt VITE_API_URL auf die echte URL.
 *
 * Request-Interceptor: hängt den Supabase-JWT als Bearer-Token an.
 */
export const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? '') + '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

// ── Request-Interceptor: Supabase JWT ────────────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ── Ein abgelaufener Token kostet keinen Klick ───────────────────────────────
//
// **Das Problem.** Supabase erneuert den Token im Hintergrund — aber nur, solange der Tab
// wach ist und sein Timer läuft. Ein Rechner, der eine Stunde zu war, kommt mit einem
// abgelaufenen Token zurück. Die erste Anfrage danach bekommt 401 „Ungültiger oder
// abgelaufener Token", und die Seite, die gerade offen war, sagt „lässt sich nicht öffnen".
//
// Das trifft die pollenden Seiten am härtesten (Paarraum, Sitzung, Thema): Sie fragen alle
// zehn Sekunden nach und stehen deshalb garantiert in dem Moment auf der Leitung, in dem
// der Token kippt.
//
// **Die Antwort darauf:** einmal erneuern, dieselbe Anfrage wiederholen. Einmal, nicht in
// einer Schleife — ist die Sitzung wirklich abgelaufen, muss der 401 durchkommen, sonst
// dreht jede Anfrage doppelt und niemand landet je auf der Anmeldung.

/**
 * Den Token erneuern — höchstens einmal gleichzeitig.
 *
 * Das „höchstens einmal" macht `einmalGleichzeitig`; warum es nötig ist, steht dort (ein
 * Refresh-Token ist genau einmal gültig, sechs parallele Versuche zerstören die Sitzung).
 * Ein Fehlschlag wird zu `null`: Dann kommt der 401 durch, und der Aufrufer entscheidet.
 */
const tokenErneuern = einmalGleichzeitig(async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.refreshSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
})

/** Dieselbe Anfrage wurde schon einmal mit frischem Token versucht. */
type Versucht = InternalAxiosRequestConfig & { _tokenErneuert?: boolean }

// ── Response-Interceptor: 401 einmal nachfassen, sonst Logging ───────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as Versucht | undefined
    if (config && darfNachfassen(error.response?.status, !!config._tokenErneuert)) {
      config._tokenErneuert = true
      const token = await tokenErneuern()
      if (token) {
        config.headers = config.headers ?? {}
        config.headers['Authorization'] = `Bearer ${token}`
        return apiClient(config)
      }
    }
    if (import.meta.env.DEV) {
      console.error('[API Error]', error.response?.status, error.response?.data ?? error.message)
    }
    return Promise.reject(error)
  },
)
