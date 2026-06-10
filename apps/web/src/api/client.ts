import axios from 'axios'
import { supabase } from '@/lib/supabase'

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

// ── Response-Interceptor: Error-Logging ──────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[API Error]', error.response?.status, error.response?.data ?? error.message)
    }
    return Promise.reject(error)
  },
)
