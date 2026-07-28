import { CLUSTER_LABELS, type ContentMeta } from '@/content/types'
import { getBody } from '@/content/bodies'
import MarkdownArticle from './MarkdownArticle'
import EchoReflectionCard from './EchoReflectionCard'
import RelatedContentCluster from './RelatedContentCluster'
import SafetyNotice from './SafetyNotice'
import Breadcrumbs from './Breadcrumbs'

const SITE = 'https://echo-b.de'

/**
 * Standard-Artikel-Template (topic/problem/glossary/… teilen sich diese Basis).
 * Echo-Karten erscheinen an definierten Positionen im Artikel – „after-intro"
 * wird durch Split am ersten H2 realisiert, „end" hinter dem Body.
 */
export default function ArticleTemplate({ meta }: { meta: ContentMeta }) {
  const body = getBody(meta.slug)
  const splitAt = body.indexOf('\n## ')
  const intro = splitAt === -1 ? body : body.slice(0, splitAt)
  const rest = splitAt === -1 ? '' : body.slice(splitAt)
  const positions = meta.echo.cta_positions ?? ['end']
  const hasSafety = !!meta.safety_tags && meta.safety_tags.length > 0
  const updatedLabel = new Date(meta.updated).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title,
    description: meta.description,
    dateModified: meta.updated,
    inLanguage: 'de-DE',
    mainEntityOfPage: SITE + meta.url,
    ...(meta.author ? { author: { '@type': 'Organization', name: meta.author.name } } : {}),
    publisher: { '@type': 'Organization', name: 'EchoB' },
  }

  return (
    <>
      <section className="bg-navy px-6 pb-16 pt-[calc(60px+4rem)] text-white">
        <div className="mx-auto max-w-[720px]">
          <Breadcrumbs meta={meta} />
          <span className="label mb-3 block">{CLUSTER_LABELS[meta.cluster]}</span>
          <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-extrabold leading-[1.2] tracking-[-0.02em]">
            {meta.title}
          </h1>
          <p className="mt-4 text-[0.9rem] text-white/50">{meta.description}</p>
        </div>
      </section>

      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[720px]">
          {hasSafety && <SafetyNotice />}

          <div className="prose-article">
            <MarkdownArticle content={intro} />
            {positions.includes('after-intro') && <EchoReflectionCard meta={meta} position="after-intro" />}
            {rest && <MarkdownArticle content={rest} />}
          </div>

          {meta.faq && meta.faq.length > 0 && (
            <section className="not-prose mt-12 border-t border-brand-border pt-8" aria-label="Häufige Fragen">
              <h2 className="mb-5 text-sm font-semibold text-navy">Häufige Fragen</h2>
              <div className="space-y-5">
                {meta.faq.map((f, i) => (
                  <div key={i}>
                    <h3 className="text-[0.95rem] font-semibold text-navy">{f.question}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {positions.includes('end') && <EchoReflectionCard meta={meta} position="end" />}

          <RelatedContentCluster meta={meta} />

          <p className="mt-8 border-t border-brand-border pt-6 text-xs text-brand-muted">
            {meta.author ? `${meta.author.name} · ` : ''}Aktualisiert am {updatedLabel}
          </p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {meta.faq && meta.faq.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: meta.faq.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }) }} />
      )}
    </>
  )
}
