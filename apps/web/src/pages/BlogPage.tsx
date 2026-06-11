import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

const POSTS = [
  {
    slug: 'beziehungsmuster',
    tag: 'Beziehungsdynamiken',
    title: 'Beziehungsmuster erkennen',
    excerpt: 'Was sind wiederkehrende Dynamiken, und wie entstehen sie? Ein sachlicher Überblick über Nähe-Distanz-Zyklen, Trigger und die Rolle früher Erfahrungen.',
    readTime: '8 Min. Lesezeit',
  },
  {
    slug: 'beobachtung-gefuehl',
    tag: 'Selbstreflexion',
    title: 'Beobachtung, Gefühl, Interpretation',
    excerpt: 'Wie du lernst, zwischen dem was wirklich passiert ist, dem was du fühlst, und dem was du daraus schließt, zu unterscheiden – ein Kernwerkzeug der GFK.',
    readTime: '6 Min. Lesezeit',
  },
  {
    slug: 'professionelle-hilfe',
    tag: 'Hilfe finden',
    title: 'Wann professionelle Hilfe sinnvoll ist',
    excerpt: 'Orientierung, wann ein Gespräch mit Therapeut:innen oder Berater:innen der nächste sinnvolle Schritt sein kann – und wie man die Hürde überwindet.',
    readTime: '7 Min. Lesezeit',
  },
  {
    slug: 'krisentelefone',
    tag: 'Soforthilfe',
    title: 'Krisentelefone & Anlaufstellen',
    excerpt: 'Eine Übersicht kostenloser Hilfsangebote in Deutschland, Österreich und der Schweiz – anonym, niedrigschwellig und rund um die Uhr erreichbar.',
    readTime: '4 Min. Lesezeit',
  },
]

export default function BlogPage() {
  return (
    <PageLayout>

      {/* Hero */}
      <section className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16">
        <div className="mx-auto max-w-[960px]">
          <span className="label">EchoB Blog</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em]">
            Artikel zu Beziehungen & Selbstreflexion
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[560px] leading-[1.75]">
            Tiefergehende Texte zu Beziehungsdynamiken, Psychologie und Selbstkenntnis –
            konkret, sachlich, ohne Schubladen.
          </p>
        </div>
      </section>

      {/* Artikel */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <div className="grid gap-5 sm:grid-cols-2">
            {POSTS.map(({ slug, tag, title, excerpt, readTime }) => (
              <Link
                key={slug}
                to={`/blog/${slug}`}
                className="card block no-underline hover:border-accent/40 hover:shadow-md transition-all"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent mb-3 block">{tag}</span>
                <h3 className="text-base font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-4">{excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-muted/70">{readTime}</span>
                  <span className="text-xs font-semibold text-accent">Artikel lesen →</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-14 rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 max-w-xl">
            <p className="text-sm text-amber-800">
              <strong>Hinweis:</strong> Alle Artikel dienen der Orientierung und ersetzen keine professionelle
              Beratung, Psychotherapie oder medizinische Diagnostik. Bei akuter Gefahr: Notruf 110 / 112.
            </p>
          </div>
        </div>
      </section>

    </PageLayout>
  )
}
