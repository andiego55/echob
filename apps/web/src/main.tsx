import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { LockProvider } from './contexts/LockContext.tsx'
import App from './App.tsx'
// Fonts self-hosted (DSGVO: kein Request an Google Fonts) – Familie bleibt "Inter"
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'

// ── Error-Monitoring (nur wenn DSN gesetzt) ───────────────────────────────────
// Bewusst PII-frei: keine Request-Bodies, keine personenbezogenen Defaults.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) delete event.request.data
      return event
    },
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 Minuten
      retry: 1,
    },
  },
})

/** Auffangseite statt weißem Screen, wenn ein Render-Fehler durchschlägt. */
function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 360 }}>
        <p style={{ fontWeight: 700, color: '#0f1e2e', margin: '0 0 .5rem' }}>
          Etwas ist schiefgelaufen.
        </p>
        <p style={{ color: '#5b6b7a', fontSize: '.9rem', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
          Bitte lade die Seite neu. Falls es erneut auftritt, melde dich bei info@echo-b.de.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#e07b54', color: '#fff', border: 0, borderRadius: 8,
            padding: '.6rem 1.25rem', fontSize: '.9rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Neu laden
        </button>
      </div>
    </div>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root-Element #root nicht gefunden – prüfe index.html.')

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LockProvider>
              <App />
            </LockProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
