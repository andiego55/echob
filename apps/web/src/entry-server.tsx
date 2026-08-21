// SSR-Einstiegspunkt fürs Prerendering (siehe scripts/prerender.mjs).
// Rendert je öffentliche Route den reinen Seiteninhalt (AppRoutes, ohne die
// App-Shell-Modals) zu statischem HTML. Läuft in Node – daher keine
// Browser-APIs beim Rendern (Auth/Lock-Provider sind SSR-fest, alle
// window/localStorage-Zugriffe liegen in useEffect bzw. sind geguardet).
import { Writable } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { LockProvider } from '@/contexts/LockContext'
import { AppRoutes } from '@/App'
import { headFor, PUBLIC_ROUTES } from '@/lib/seo'

export { PUBLIC_ROUTES }

function baum(url: string) {
  const queryClient = new QueryClient()
  return (
    <StaticRouter location={url}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LockProvider>
            <AppRoutes />
          </LockProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StaticRouter>
  )
}

/**
 * Eine Seite zu statischem HTML rendern - auch wenn sie hinter `React.lazy` liegt.
 *
 * **Warum nicht `renderToString`.** Das war der Weg bis zum Code-Splitting, und er endet
 * dort: `renderToString` ist synchron. Trifft es auf eine noch nicht geladene
 * `React.lazy`-Komponente, hat es zwei Moeglichkeiten, und beide sind falsch. Mit
 * Suspense-Grenze schreibt es den leeren Rueckfall ins HTML (die Seite kam mit 6 KB statt
 * 29 KB heraus - erwischt vom Byte-Vergleich gegen den Stand davor). Ohne Grenze wirft es
 * "A component suspended while responding to synchronous input" und bricht ab.
 *
 * **`renderToPipeableStream` kann warten.** Es loest Suspense-Grenzen auf und ruft
 * `onAllReady`, wenn wirklich alles da ist - genau der Moment fuers Prerendering, das
 * ohnehin keine Eile hat. Ein `Writable` sammelt die Teile zu einem String.
 *
 * `onShellError` und `onError` sind bewusst hart: Der Build soll laut scheitern, statt
 * still 304 leere Seiten zu schreiben.
 */
export function renderPage(url: string): Promise<{ appHtml: string; head: ReturnType<typeof headFor> }> {
  return new Promise((resolve, reject) => {
    const teile: Buffer[] = []
    const senke = new Writable({
      write(stueck, _kodierung, weiter) { teile.push(Buffer.from(stueck)); weiter() },
    })
    senke.on('finish', () =>
      resolve({ appHtml: Buffer.concat(teile).toString('utf-8'), head: headFor(url) }))

    const { pipe, abort } = renderToPipeableStream(baum(url), {
      onAllReady() { pipe(senke) },
      onShellError(fehler) { abort(); reject(fehler) },
      onError(fehler) { abort(); reject(fehler) },
    })
  })
}
