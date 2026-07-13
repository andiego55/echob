import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import {
  CLUSTERS,
  CLUSTER_LABELS,
  CONTENT_TYPE_LABELS,
  type Cluster,
  type ContentType,
} from '@/content/types'

interface OverviewItem {
  title: string
  url: string
  cluster: Cluster
  type: ContentType
  description?: string
}

// Handcodierte Legacy-Wissensseiten (noch nicht als Markdown migriert). Bis zur
// Migration hier eingeordnet, damit die Übersicht vollständig bleibt und nichts
// verwaist. Wandert eine Seite ins Content-Manifest, wird ihr Eintrag hier entfernt.
const LEGACY_ITEMS: OverviewItem[] = [
  { title: 'Bindungsstile', url: '/wissen/bindungsstile', cluster: 'bindung', type: 'topic', description: 'Sicher, ängstlich, vermeidend – wie frühe Bindungserfahrungen Beziehungen prägen.' },
  { title: 'Kommunikation & Konflikte', url: '/wissen/kommunikation-konflikte', cluster: 'dynamiken', type: 'topic', description: 'Warum Gespräche eskalieren und was konstruktive von destruktiver Kommunikation unterscheidet.' },
  { title: 'Persönlichkeit & Verhalten', url: '/wissen/persoenlichkeit-verhalten', cluster: 'dynamiken', type: 'topic', description: 'Wie Persönlichkeitsmerkmale sich in Beziehungen zeigen.' },
  { title: 'Emotionsregulation', url: '/wissen/emotionsregulation', cluster: 'selbstreflexion', type: 'topic', description: 'Warum manche Menschen Gefühle schwer regulieren – und was hilft.' },
  { title: 'Beobachtung & Gefühl trennen', url: '/wissen/beobachtung-gefuehl', cluster: 'selbstreflexion', type: 'topic', description: 'Zwischen dem, was passiert, und dem, was du daraus schließt, unterscheiden.' },
  { title: 'Grenzen setzen', url: '/wissen/grenzen-setzen', cluster: 'selbstreflexion', type: 'topic', description: 'Was Grenzen bedeuten und wie man sie klar kommuniziert.' },
  { title: 'Wann professionelle Hilfe sinnvoll ist', url: '/wissen/professionelle-hilfe', cluster: 'therapie', type: 'guide', description: 'Orientierung, wann Beratung oder Therapie der nächste sinnvolle Schritt ist.' },
  { title: 'Krisentelefone & Anlaufstellen', url: '/wissen/krisentelefone', cluster: 'therapie', type: 'guide', description: 'Kostenlose Hilfsangebote in Deutschland, Österreich und der Schweiz.' },
]

const MANIFEST_ITEMS: OverviewItem[] = CONTENT_MANIFEST.map((m) => ({
  title: m.title,
  url: m.url,
  cluster: m.cluster,
  type: m.type,
  description: m.description,
}))

const ALL_ITEMS = [...MANIFEST_ITEMS, ...LEGACY_ITEMS]

// Self-contained helle Typ-Badges (dunkler Text auf hellem Pill – auf jeder Karte lesbar).
const TYPE_BADGE: Record<ContentType, { bg: string; fg: string }> = {
  topic:          { bg: '#E6F1FB', fg: '#0C447C' },
  problem:        { bg: '#FAECE7', fg: '#712B13' },
  glossary:       { bg: '#EEEDFE', fg: '#3C3489' },
  comparison:     { bg: '#FAEEDA', fg: '#633806' },
  guide:          { bg: '#E1F5EE', fg: '#085041' },
  'case-example': { bg: '#FBEAF0', fg: '#72243E' },
  'therapy-prep': { bg: '#EAF3DE', fg: '#27500A' },
}

// „Nach Format"-Filter – Plural-Labels, nur Typen, die tatsächlich vorkommen.
const FORMAT_LABEL: Record<ContentType, string> = {
  topic: 'Themen',
  problem: 'Hilfe',
  glossary: 'Begriffe',
  comparison: 'Vergleiche',
  guide: 'Ratgeber',
  'case-example': 'Fallbeispiele',
  'therapy-prep': 'Vorbereitung',
}
const PRESENT_TYPES = Array.from(new Set(ALL_ITEMS.map((i) => i.type)))
const FORMAT_ORDER: ContentType[] = ['topic', 'glossary', 'comparison', 'case-example', 'guide', 'problem', 'therapy-prep']
const FORMAT_FILTERS = FORMAT_ORDER.filter((t) => PRESENT_TYPES.includes(t))

function chipCls(active: boolean): string {
  return `rounded-full border px-3.5 py-1.5 text-[0.82rem] transition-colors ${
    active ? 'border-accent bg-accent/10 text-accent' : 'border-brand-border text-brand-muted hover:border-accent/50'
  }`
}

export default function WissenPage() {
  const [activeType, setActiveType] = useState<ContentType | null>(null)
  const items = activeType ? ALL_ITEMS.filter((i) => i.type === activeType) : ALL_ITEMS

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Wissen</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em]">
            Alle Themen und Artikel
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[600px] leading-[1.75]">
            Nach Thema geordnet, mit direktem Link zu jeder Seite – Themen, Begriffe, Vergleiche und mehr.
            Jede Seite lässt sich unmittelbar auf deine eigene Situation beziehen.
          </p>
        </div>
      </section>

      {/* Nach Format – Filter */}
      <section className="border-t border-brand-border px-6 pt-10 pb-1">
        <div className="mx-auto max-w-[960px]">
          <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">Nach Format</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveType(null)} className={chipCls(activeType === null)}>
              Alle
            </button>
            {FORMAT_FILTERS.map((t) => (
              <button key={t} type="button" onClick={() => setActiveType(t)} className={chipCls(activeType === t)}>
                {FORMAT_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Master-Index nach Thema */}
      <section className="px-6 py-[56px]">
        <div className="mx-auto max-w-[960px]">
          {CLUSTERS.map((cl) => {
            const clItems = items.filter((i) => i.cluster === cl)
            if (clItems.length === 0) return null
            return (
              <div key={cl} className="mb-12 last:mb-0">
                <h2 className="mb-5 text-[clamp(1.2rem,2vw,1.5rem)] font-bold text-navy">{CLUSTER_LABELS[cl]}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {clItems.map((it) => {
                    const c = TYPE_BADGE[it.type]
                    return (
                      <Link key={it.url} to={it.url} className="group card no-underline hover:border-accent/50">
                        <span
                          className="mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: c.bg, color: c.fg }}
                        >
                          {CONTENT_TYPE_LABELS[it.type]}
                        </span>
                        <h3 className="mb-1 text-[0.97rem] font-bold text-navy">{it.title}</h3>
                        {it.description && <p className="text-sm leading-relaxed text-brand-muted">{it.description}</p>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Disclaimer + Blog */}
      <section className="border-t border-brand-border px-6 py-[56px]">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-10 max-w-xl rounded-brand border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Alle Inhalte dienen der Orientierung und ersetzen keine professionelle
              Beratung oder Therapie. Bei akuter Gefahr: Notruf <strong>110 / 112</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="mb-1 text-xl font-bold text-navy">EchoB Blog</h2>
              <p className="text-sm text-brand-muted">Tiefergehende Artikel zu Beziehungsthemen – persönlicher, mit konkreten Beispielen.</p>
            </div>
            <Link to="/blog" className="btn-primary">Zum Blog →</Link>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
