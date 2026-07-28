import { Link } from 'react-router-dom'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import { CLUSTER_LABELS, type ContentMeta } from '@/content/types'

/**
 * Interne Verlinkung – nicht „ähnliche Artikel", sondern nach Leser-Stufe
 * benannte Blöcke (Verstehen · Kennst du das? · Genau benennen · Was du tun kannst).
 * Auflösung der Slugs über das generierte Manifest.
 *
 * Zusätzlich: automatische Same-Cluster-Verlinkung – jede Seite bekommt „Mehr aus
 * [Bereich]"-Links zu anderem Content desselben Clusters (Themencluster für SEO +
 * tiefere Navigation), auch wenn keine expliziten links gepflegt sind.
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
  const groups: { label: string; items: ContentMeta[] }[] = []
  const shown = new Set<string>([meta.slug])
  const take = (items: ContentMeta[]) => { items.forEach((m) => shown.add(m.slug)); return items }

  // 1) Gepflegte (redaktionelle) Links haben Vorrang.
  if (links) {
    const parent = resolve(links.parent ? [links.parent] : [])
    if (parent.length) groups.push({ label: 'Übergeordnetes Thema', items: take(parent) })
    for (const g of ARRAY_GROUPS) {
      const items = resolve(links[g.key]).filter((m) => !shown.has(m.slug))
      if (items.length) groups.push({ label: g.label, items: take(items) })
    }
  }

  // 2) Automatisch: weitere Inhalte aus demselben Cluster (ohne Duplikate).
  const sameCluster = CONTENT_MANIFEST.filter((m) => m.cluster === meta.cluster && !shown.has(m.slug)).slice(0, 4)
  if (sameCluster.length) groups.push({ label: `Mehr aus: ${CLUSTER_LABELS[meta.cluster]}`, items: sameCluster })

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
