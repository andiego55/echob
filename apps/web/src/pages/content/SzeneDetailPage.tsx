import { Link, useParams } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import { getBody } from '@/content/bodies'
import MarkdownArticle from '@/components/content/MarkdownArticle'
import type { ContentMeta } from '@/content/types'
import { sceneTagLabel } from '@/content/sceneTags'

/**
 * /szenen/:slug — einzelne fiktive Beziehungsszene (Ich-Perspektive).
 * Literarisches Leseerlebnis + Übergang „mit Echo besprechen" (reflektieren-Flow,
 * thread_type content_<slug>; TopicDialogPage erkennt die Szene und startet den
 * scene-spezifischen Einstieg). Kein generisches Artikel-Template.
 */
const SITE = 'https://echo-b.de'
const SCENES: ContentMeta[] = CONTENT_MANIFEST.filter((m) => m.type === 'scene')

export default function SzeneDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const scene = SCENES.find((s) => s.slug === slug)

  if (!scene) {
    return (
      <PageLayout>
        <section className="mx-auto max-w-[720px] px-6 pt-[calc(60px+4rem)] pb-24 text-center">
          <p className="text-sm text-brand-muted">Diese Szene gibt es nicht (mehr).</p>
          <Link to="/szenen" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            ← Zu allen Szenen
          </Link>
        </section>
      </PageLayout>
    )
  }

  const body = getBody(scene.slug)
  const tags = scene.scene_tags ?? []
  const reflectHref = `/reflektieren?topic=${scene.slug}&source=${scene.slug}`

  // Verwandte Szenen: teilen mindestens ein Schlagwort, meiste Überschneidung zuerst.
  const related = SCENES.filter((s) => s.slug !== scene.slug)
    .map((s) => ({ s, shared: (s.scene_tags ?? []).filter((t) => tags.includes(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 3)
    .map((x) => x.s)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: scene.title,
    headline: scene.title,
    description: scene.description,
    dateModified: scene.updated,
    inLanguage: 'de-DE',
    genre: 'fiction',
    isFamilyFriendly: true,
    mainEntityOfPage: SITE + scene.url,
    publisher: { '@type': 'Organization', name: 'EchoB' },
  }

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-navy px-6 pt-[calc(60px+3.5rem)] pb-14 text-white">
        <div className="mx-auto max-w-[680px]">
          <Link to="/szenen" className="text-xs text-white/55 transition-colors hover:text-white">
            ← Beziehungsszenen
          </Link>
          {scene.perspective && (
            <p className="mt-5 text-[0.74rem] font-semibold uppercase tracking-[0.1em] text-accent">{scene.perspective}</p>
          )}
          <h1 className="mt-2 text-[clamp(1.9rem,4.5vw,2.7rem)] font-extrabold leading-[1.14] tracking-[-0.02em]">
            {scene.title}
          </h1>
          {scene.pull_quote && (
            <p className="mt-5 max-w-[560px] font-serif text-[1.15rem] italic leading-[1.6] text-brand-blue">
              {scene.pull_quote}
            </p>
          )}
          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link
                  key={t}
                  to={`/szenen?tag=${t}`}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.76rem] text-white/70 no-underline transition-colors hover:border-accent/60 hover:text-white"
                >
                  {sceneTagLabel(t)}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Szenentext */}
      <section className="border-t border-brand-border bg-white px-6 py-[64px]">
        <div className="mx-auto max-w-[680px]">
          <div className="prose-scene">
            <MarkdownArticle content={body} />
          </div>

          {/* Übergang zu Echo */}
          <aside className="mt-14 rounded-brand-lg border border-accent/25 bg-accent/[0.05] px-7 py-8">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-accent">
              Mit Echo darüber sprechen
            </span>
            <h2 className="text-[1.35rem] font-bold leading-snug text-navy">Kommt dir das bekannt vor?</h2>
            <p className="mt-3 text-[0.97rem] leading-relaxed text-brand-muted">
              Echo kennt diese Szene. Im Gespräch geht es nicht um die erfundene Figur, sondern um dich:
              ob du etwas Ähnliches erlebt hast, woran die Szene dich erinnert, was sie in dir auslöst –
              behutsam, in deinem Tempo, ohne Bewertung.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link to={reflectHref} className="btn-primary !px-6 !py-3">
                Diese Szene mit Echo besprechen
              </Link>
              <Link to="/auth" state={{ defaultTab: 'signup' }} className="text-sm font-medium text-accent hover:underline">
                Noch kein Konto? Kostenlos starten
              </Link>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-brand-muted/80">
              Echo arbeitet nur mit deinem eigenen, ausdrücklich gewählten Fall – privat und verschlüsselt.
              Es stellt keine Diagnose.
            </p>
          </aside>

          {/* Verwandte Szenen */}
          {related.length > 0 && (
            <div className="mt-14">
              <p className="mb-4 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">
                Szenen mit ähnlichem Gefühl
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {related.map((s) => (
                  <Link
                    key={s.slug}
                    to={s.url}
                    className="group rounded-brand border border-brand-border bg-white p-4 no-underline transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-brand"
                  >
                    {s.perspective && (
                      <p className="mb-1 text-[0.66rem] font-semibold uppercase tracking-wide text-accent/70">{s.perspective}</p>
                    )}
                    <p className="text-[0.95rem] font-bold leading-snug text-navy">{s.title}</p>
                    <span className="mt-2 inline-block text-xs font-medium text-accent">Lesen →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="mt-12 border-t border-brand-border pt-6 text-xs leading-relaxed text-brand-muted/80">
            Frei erfundene Szene – Namen und Figuren sind fiktiv und bilden keine realen Personen ab.
            Zur Orientierung, nicht zur Diagnose. Bei akuter Gefahr: Notruf <strong>110 / 112</strong>,
            Telefonseelsorge <strong>0800 111 0 111</strong>.
          </p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </PageLayout>
  )
}
