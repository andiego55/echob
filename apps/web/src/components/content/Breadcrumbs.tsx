import { Link } from 'react-router-dom'
import type { ContentMeta } from '@/content/types'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'

const SITE = 'https://echo-b.de'

interface Crumb {
  name: string
  url: string
}

/**
 * Brotkrumen-Pfad im Artikel-Hero: Wissen › [übergeordnetes Thema] › aktuelle Seite.
 * Das Zwischenglied kommt aus links.parent (content-getrieben). Emittiert zusätzlich
 * BreadcrumbList-JSON-LD für Suchmaschinen. Ersetzt den früheren „Zurück"-Link.
 */
export default function Breadcrumbs({ meta }: { meta: ContentMeta }) {
  const parents: Crumb[] = [{ name: 'Wissen', url: '/wissen' }]

  const parentSlug = meta.links?.parent
  if (parentSlug) {
    const parent = CONTENT_MANIFEST.find((m) => m.slug === parentSlug)
    if (parent) parents.push({ name: parent.title, url: parent.url })
  }

  const full: Crumb[] = [...parents, { name: meta.title, url: meta.url }]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: full.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: SITE + c.url,
    })),
  }

  return (
    <>
      <nav aria-label="Brotkrumen" className="mb-6 text-[0.82rem]">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {parents.map((c) => (
            <li key={c.url} className="flex items-center gap-x-2">
              <Link to={c.url} className="text-white/55 no-underline transition-colors hover:text-white">
                {c.name}
              </Link>
              <span aria-hidden="true" className="text-white/30">›</span>
            </li>
          ))}
          <li aria-current="page" className="text-white/80">
            {meta.title}
          </li>
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
