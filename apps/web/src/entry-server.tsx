// SSR-Einstiegspunkt fürs Prerendering (siehe scripts/prerender.mjs).
// Rendert je öffentliche Route den reinen Seiteninhalt (AppRoutes, ohne die
// App-Shell-Modals) zu statischem HTML. Läuft in Node – daher keine
// Browser-APIs beim Rendern (Auth/Lock-Provider sind SSR-fest, alle
// window/localStorage-Zugriffe liegen in useEffect bzw. sind geguardet).
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { LockProvider } from '@/contexts/LockContext'
import { AppRoutes } from '@/App'
import { headFor, PUBLIC_ROUTES } from '@/lib/seo'

export { PUBLIC_ROUTES }

export function renderPage(url: string) {
  const queryClient = new QueryClient()
  const appHtml = renderToString(
    <StaticRouter location={url}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LockProvider>
            <AppRoutes />
          </LockProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StaticRouter>,
  )
  return { appHtml, head: headFor(url) }
}
