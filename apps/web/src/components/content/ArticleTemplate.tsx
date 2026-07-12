import { Link } from 'react-router-dom'
import type { Cluster, ContentMeta } from '@/content/types'
import { getBody } from '@/content/bodies'
import MarkdownArticle from './MarkdownArticle'
import EchoReflectionCard from './EchoReflectionCard'
import RelatedContentCluster from './RelatedContentCluster'
import SafetyNotice from './SafetyNotice'

const SITE = 'https://echo-b.de'

const CLUSTER_LABEL: Record<Cluster, string> = {
  dynamiken: 'Belastende Dynamiken',
  bindung: 'Bindung & Nähe',
  trennung: 'Trennung',
  selbstreflexion: 'Selbstreflexion',
  therapie: 'Therapie & Coaching',
}

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
          <Link
            to="/wissen"
            className="mb-6 inline-block text-[0.82rem] text-white/50 no-underline transition-colors hover:text-white"
          >
            ← Zurück zum Wissen
          </Link>
          <span className="label mb-3 block">{CLUSTER_LABEL[meta.cluster]}</span>
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

          {positions.includes('end') && <EchoReflectionCard meta={meta} position="end" />}

          <div className="mt-14 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Dieser Artikel dient der allgemeinen Orientierung und ersetzt keine
              professionelle Beratung, Psychotherapie oder medizinische Diagnostik.
            </p>
          </div>

          <RelatedContentCluster meta={meta} />

          <p className="mt-8 border-t border-brand-border pt-6 text-xs text-brand-muted">
            {meta.author ? `${meta.author.name} · ` : ''}Aktualisiert am {updatedLabel}
          </p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
