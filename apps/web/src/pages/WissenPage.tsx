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

const MANIFEST_ITEMS: OverviewItem[] = CONTENT_MANIFEST.map((m) => ({
  title: m.title,
  url: m.url,
  cluster: m.cluster,
  type: m.type,
  description: m.description,
}))

// Szenen haben ihre eigene Seite (/szenen) – hier nicht im Artikel-Index listen.
const ALL_ITEMS = MANIFEST_ITEMS.filter((i) => i.type !== 'scene')

// Self-contained helle Typ-Badges (dunkler Text auf hellem Pill – auf jeder Karte lesbar).
const TYPE_BADGE: Record<ContentType, { bg: string; fg: string }> = {
  topic:          { bg: '#E6F1FB', fg: '#0C447C' },
  problem:        { bg: '#FAECE7', fg: '#712B13' },
  glossary:       { bg: '#EEEDFE', fg: '#3C3489' },
  comparison:     { bg: '#FAEEDA', fg: '#633806' },
  guide:          { bg: '#E1F5EE', fg: '#085041' },
  'case-example': { bg: '#FBEAF0', fg: '#72243E' },
  'therapy-prep': { bg: '#EAF3DE', fg: '#27500A' },
  scene:          { bg: '#FBEFE9', fg: '#7A3B1E' },
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
  scene: 'Szenen',
}
const PRESENT_TYPES = Array.from(new Set(ALL_ITEMS.map((i) => i.type)))
const FORMAT_ORDER: ContentType[] = ['topic', 'glossary', 'comparison', 'case-example', 'guide', 'problem', 'therapy-prep']
const FORMAT_FILTERS = FORMAT_ORDER.filter((t) => PRESENT_TYPES.includes(t))

function chipCls(active: boolean): string {
  return `rounded-full border px-3.5 py-1.5 text-[0.82rem] transition-colors ${
    active ? 'border-accent bg-accent/10 text-accent' : 'border-brand-border text-brand-muted hover:border-accent/50'
  }`
}

/**
 * Wie viele Beiträge je Thema stehen, solange kein Thema gewählt ist.
 *
 * Die Seite zeigte bisher ALLES: jedes Thema mit jedem Beitrag, untereinander. Das war
 * kein Index mehr, sondern eine Liste, die man scrollt, bis man aufhört. Vier je Thema
 * reichen, um zu sehen, worum es geht — der Rest ist einen Klick entfernt.
 */
const VORSCHAU_JE_THEMA = 4

export default function WissenPage() {
  const [activeType, setActiveType] = useState<ContentType | null>(null)
  // Die Themen sind KEIN neues Vokabular. Es sind dieselben Ueberschriften, unter denen
  // die Beitraege ohnehin standen - sie filtern jetzt, statt nur zu beschriften. Ein
  // zweites Schlagwort-System danebenzustellen hiesse, dieselbe Einteilung zweimal zu
  // pflegen, und die zweite waere nach einem halben Jahr die falsche.
  const [activeCluster, setActiveCluster] = useState<Cluster | null>(null)

  const items = ALL_ITEMS.filter(
    (i) => (!activeType || i.type === activeType)
      && (!activeCluster || i.cluster === activeCluster),
  )
  const sichtbareCluster = CLUSTERS.filter((cl) => items.some((i) => i.cluster === cl))

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

      {/* Einladung: Szenen + Selbsttests */}
      <section className="border-t border-brand-border px-6 pt-10 pb-12">
        <div className="mx-auto grid max-w-[960px] gap-4 sm:grid-cols-2">
          <Link
            to="/szenen"
            className="group relative flex flex-col overflow-hidden rounded-brand-lg border border-accent/25 bg-accent/[0.05] px-6 py-6 no-underline transition-colors hover:border-accent/50"
          >
            <span aria-hidden="true" className="pointer-events-none absolute -right-1 top-0 font-serif text-[5rem] leading-none text-accent/10 transition-colors group-hover:text-accent/20">„</span>
            <span className="relative text-[0.7rem] font-bold uppercase tracking-[0.1em] text-accent">Beziehungsszenen</span>
            <h2 className="relative mt-1.5 text-[1.2rem] font-bold text-navy">„Das kenne ich"</h2>
            <p className="relative mt-2 flex-1 text-[0.92rem] leading-relaxed text-brand-muted">
              Gefühlvolle, fiktive Szenen aus schwierigen Beziehungen. Erkenne dich wieder – und sprich mit Echo darüber.
            </p>
            <span className="relative mt-4 text-sm font-semibold text-accent">Zu den Szenen →</span>
          </Link>
          <Link
            to="/selbsttests"
            className="group relative flex flex-col overflow-hidden rounded-brand-lg border border-accent/25 bg-accent/[0.05] px-6 py-6 no-underline transition-colors hover:border-accent/50"
          >
            <span className="relative text-[0.7rem] font-bold uppercase tracking-[0.1em] text-accent">Selbsttests</span>
            <h2 className="relative mt-1.5 text-[1.2rem] font-bold text-navy">Wo stehst du gerade?</h2>
            <p className="relative mt-2 flex-1 text-[0.92rem] leading-relaxed text-brand-muted">
              Fundierte Tests zu Beziehung, Bindung und belastenden Mustern – mit klarem Ergebnis, das du mit Echo besprechen kannst.
            </p>
            <span className="relative mt-4 text-sm font-semibold text-accent">Zu den Tests →</span>
          </Link>
        </div>
      </section>

      {/* Filter: erst das Thema, dann das Format ─────────────────────────────
          Das Thema steht oben, weil danach gesucht wird. Niemand kommt hierher und
          denkt „ich haette gern einen Vergleich" — man kommt mit „Gaslighting". */}
      <section className="border-t border-brand-border px-6 pt-10 pb-1">
        <div className="mx-auto max-w-[960px]">
          <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">
            Nach Thema
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveCluster(null)}
              className={chipCls(activeCluster === null)}>
              Alle Themen
            </button>
            {CLUSTERS.map((cl) => {
              const anzahl = ALL_ITEMS.filter(
                (i) => i.cluster === cl && (!activeType || i.type === activeType)).length
              if (anzahl === 0) return null
              return (
                <button key={cl} type="button" onClick={() => setActiveCluster(cl)}
                  className={chipCls(activeCluster === cl)}>
                  {CLUSTER_LABELS[cl]}
                  <span className="ml-1.5 text-[0.72rem] opacity-60">{anzahl}</span>
                </button>
              )
            })}
          </div>

          <p className="mb-3 mt-6 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">
            Nach Format
          </p>
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

          {(activeCluster || activeType) && (
            <p className="mt-4 text-[0.84rem] text-brand-muted">
              {items.length === 1 ? 'Ein Beitrag' : `${items.length} Beiträge`}
              {activeCluster && <> zu <span className="font-semibold text-navy">{CLUSTER_LABELS[activeCluster]}</span></>}
              {items.length === 0 && ' — probier eine andere Kombination.'}
            </p>
          )}
        </div>
      </section>

      {/* Master-Index nach Thema */}
      <section className="px-6 py-[56px]">
        <div className="mx-auto max-w-[960px]">
          {sichtbareCluster.map((cl) => {
            const clItems = items.filter((i) => i.cluster === cl)
            if (clItems.length === 0) return null
            // Ohne gewaehltes Thema nur eine Vorschau je Thema. Mit gewaehltem alles -
            // dann ist es ja das, was jemand sehen wollte.
            const gezeigt = activeCluster ? clItems : clItems.slice(0, VORSCHAU_JE_THEMA)
            const rest = clItems.length - gezeigt.length
            return (
              <div key={cl} className="mb-12 last:mb-0">
                <h2 className="mb-5 text-[clamp(1.2rem,2vw,1.5rem)] font-bold text-navy">{CLUSTER_LABELS[cl]}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {gezeigt.map((it) => {
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
                {rest > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCluster(cl)}
                    className="mt-4 text-[0.86rem] font-semibold text-accent hover:underline"
                  >
                    Alle {clItems.length} Beiträge zu {CLUSTER_LABELS[cl]} →
                  </button>
                )}
              </div>
            )
          })}

          {items.length === 0 && (
            <p className="text-[0.92rem] text-brand-muted">
              Zu dieser Kombination gibt es noch nichts.{' '}
              <button type="button" onClick={() => { setActiveCluster(null); setActiveType(null) }}
                className="font-semibold text-accent hover:underline">
                Filter zurücksetzen
              </button>
            </p>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-brand-border px-6 py-[56px]">
        <div className="mx-auto max-w-[960px]">
          <div className="max-w-xl rounded-brand border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Alle Inhalte dienen der Orientierung und ersetzen keine professionelle
              Beratung oder Therapie. Bei akuter Gefahr: Notruf <strong>110 / 112</strong>.
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
