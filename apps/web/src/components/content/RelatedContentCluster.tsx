import { Link } from 'react-router-dom'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import type { ContentMeta } from '@/content/types'

/**
 * Interne Verlinkung – nicht „ähnliche Artikel", sondern nach Leser-Stufe
 * benannte Blöcke (Verstehen · Kennst du das? · Genau benennen · Was du tun kannst).
 * Auflösung der Slugs über das generierte Manifest.
 */
const BY_SLUG = new Map(CONTENT_MANIFEST.map((m) => [m.slug, m]))
const resolve = (slugs?: string[]): ContentMeta[] =>
  (slugs ?? []).map((s) => BY_SLUG.get(s)).filter((m): m is ContentMeta => !!m)

type ArrayLinkKey = 'children' | 'comparison' | 'glossary' | 'case_example' | 'therapy_prep' | 'related'
const ARRAY_GROUPS: { key: ArrayLinkKey; label: string }[] = [
  { key: 'children', label: 'Konkrete Situationen' },
  { key: 'comparison', label: 'Genau einordnen' },
  { key: 'glossary', label: 'Begriffe klären' },
  { key: 'case_example', label: 'So sieht das aus' },
  { key: 'therapy_prep', label: 'Vorbereiten' },
  { key: 'related', label: 'Verwandt' },
]

export default function RelatedContentCluster({ meta }: { meta: ContentMeta }) {
  const links = meta.links
  if (!links) return null

  const groups: { label: string; items: ContentMeta[] }[] = []
  const parent = resolve(links.parent ? [links.parent] : [])
  if (parent.length) groups.push({ label: 'Übergeordnetes Thema', items: parent })
  for (const g of ARRAY_GROUPS) {
    const items = resolve(links[g.key])
    if (items.length) groups.push({ label: g.label, items })
  }
  if (groups.length === 0) return null

  return (
    <nav className="not-prose my-10 border-t border-brand-border pt-8" aria-label="Weiterlesen">
      <p className="mb-4 text-sm font-semibold text-navy">Weiterlesen</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-muted">{g.label}</p>
            <ul className="space-y-1">
              {g.items.map((m) => (
                <li key={m.url}>
                  <Link to={m.url} className="text-sm text-accent hover:underline">
                    {m.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
