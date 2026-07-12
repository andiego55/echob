import { useLocation } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import ArticleTemplate from '@/components/content/ArticleTemplate'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'

/**
 * Generische Content-Route: findet die Seite anhand des Pfads im generierten
 * Manifest und rendert das passende Template. Deckt alle datengetriebenen
 * Content-URLs ab (/wissen/:slug, /hilfe/:slug, …). Unbekannt → 404.
 */
const BY_URL = new Map(CONTENT_MANIFEST.map((m) => [m.url, m]))

export default function ContentPage() {
  const { pathname } = useLocation()
  const meta = BY_URL.get(pathname)

  return (
    <PageLayout>
      {meta ? (
        <ArticleTemplate meta={meta} />
      ) : (
        <div className="mx-auto max-w-[720px] px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-navy">Seite nicht gefunden</h1>
          <p className="mt-2 text-sm text-brand-muted">Diese Inhaltsseite existiert nicht (mehr).</p>
        </div>
      )}
    </PageLayout>
  )
}
