import axios from 'axios'

/**
 * Zentrale Axios-Instanz.
 *
 * Im Vite-Dev-Server wird /api/* per Proxy an localhost:8000 weitergeleitet
 * (vite.config.ts). Im Production-Build zeigt VITE_API_URL auf die echte URL.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

// Antwort-Interceptor: zentrales Error-Logging
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[API Error]', error.response?.data ?? error.message)
    }
    return Promise.reject(error)
  },
)
