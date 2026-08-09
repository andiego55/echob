import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PageLayout from '@/components/layout/PageLayout'
import { directoryApi } from '@/api/directory'
import DirectoryCard from '@/components/directory/DirectoryCard'
import ErstgespraechBanner from '@/components/directory/ErstgespraechBanner'
import { REGION_CITIES, REGION_PROFESSIONS, regionCity, regionProfession } from '@/directory/regions'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import { SELF_TESTS } from '@/selftests'

const CONTENT_BY_SLUG = new Map(CONTENT_MANIFEST.map((m) => [m.slug, m]))
const TEST_BY_SLUG = new Map(SELF_TESTS.map((t) => [t.slug, t]))

function prettify(slug: string | undefined): string {
  return (slug ?? '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function RegionalPage({ professionSlug }: { professionSlug: string }) {
  const { city: citySlug } = useParams<{ city: string }>()
  const prof = regionProfession(professionSlug)
  const cityObj = regionCity(citySlug)
  const cityName = cityObj?.name ?? prettify(citySlug)

  const { data, isLoading } = useQuery({
    queryKey: ['region', professionSlug, citySlug],
    queryFn: () => directoryApi.search({ profession: professionSlug, city: citySlug, page: 1 }),
    enabled: !!citySlug,
  })

  if (!prof) {
    return (
      <PageLayout>
        <section className="mx-auto max-w-[720px] px-6 pt-[calc(60px+4rem)] pb-24 text-center">
          <h1 className="text-2xl font-bold text-navy">Seite nicht gefunden</h1>
          <Link to="/fachpersonen" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">← Zum Verzeichnis</Link>
        </section>
      </PageLayout>
    )
  }

  const items = data?.items ?? []
  const testLinks = prof.tests.map((s) => TEST_BY_SLUG.get(s)).filter(Boolean)
  const articleLinks = prof.articles.map((s) => CONTENT_BY_SLUG.get(s)).filter(Boolean)
  const sceneLinks = prof.scenes.map((s) => CONTENT_BY_SLUG.get(s)).filter(Boolean)

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-navy px-6 pb-12 pt-[calc(60px+3rem)] text-white">
        <div className="mx-auto max-w-[860px]">
          <nav className="mb-4 text-[0.78rem] text-white/45">
            <Link to="/fachpersonen" className="text-white/60 no-underline hover:text-white">Fachperson finden</Link>
            <span className="mx-1.5">›</span>{prof.label}
          </nav>
          <h1 className="text-[clamp(1.8rem,4.2vw,2.5rem)] font-extrabold leading-[1.15] tracking-[-0.02em]">
            {prof.label} in {cityName} finden
          </h1>
          <p className="mt-4 max-w-[600px] text-[0.98rem] leading-relaxed text-white/65">
            Du suchst {prof.label} in {cityName}? Diese Seite gibt dir eine kurze Orientierung – und
            zeigt dir Fachpersonen vor Ort. Ohne Diagnose, ohne Druck.
          </p>
        </div>
      </section>

      {/* Orientierung */}
      <section className="border-t border-brand-border bg-white px-6 py-14">
        <div className="mx-auto max-w-[720px]">
          <h2 className="mb-6 text-[1.35rem] font-bold text-navy">Kurze Orientierung</h2>
          <div className="space-y-6">
            {prof.sections.map((s) => (
              <div key={s.heading}>
                <h3 className="text-[1.05rem] font-bold text-navy">{s.heading}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-brand-text">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fachpersonen vor Ort */}
      <section className="border-t border-brand-border bg-brand-bg px-6 py-14">
        <div className="mx-auto max-w-[1040px]">
          <h2 className="mb-1 text-[1.35rem] font-bold text-navy">{prof.label} in {cityName}</h2>
          <p className="mb-6 text-[0.88rem] text-brand-muted">
            {isLoading ? 'Lädt …' : items.length > 0
              ? `${data?.total ?? items.length} Fachperson${(data?.total ?? 0) === 1 ? '' : 'en'} gefunden`
              : 'Noch im Aufbau'}
          </p>

          {items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => <DirectoryCard key={item.slug} item={item} />)}
            </div>
          ) : (
            !isLoading && (
              <div className="rounded-brand-lg border border-dashed border-brand-border bg-white px-6 py-10 text-center">
                <p className="text-[0.92rem] font-semibold text-navy">Wir bauen das Verzeichnis für {cityName} gerade auf.</p>
                <p className="mx-auto mt-2 max-w-[460px] text-[0.85rem] text-brand-muted">
                  Schau bald wieder vorbei – oder lass dir direkt von uns helfen, die passende Begleitung zu finden.
                </p>
                <Link to="/fachpersonen" className="mt-4 inline-block text-[0.85rem] font-semibold text-accent hover:underline">
                  Alle Fachpersonen ansehen →
                </Link>
              </div>
            )
          )}

          <div className="mt-10"><ErstgespraechBanner /></div>
        </div>
      </section>

      {/* Vor dem ersten Gespräch – Funnel */}
      <section className="border-t border-brand-border bg-white px-6 py-14">
        <div className="mx-auto max-w-[860px]">
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-accent">Vor dem ersten Gespräch</p>
          <h2 className="mt-1.5 text-[1.35rem] font-bold text-navy">Sortiere deine Situation – mit EchoB</h2>
          <p className="mt-2 max-w-[620px] text-[0.95rem] leading-relaxed text-brand-muted">
            Ein erstes Gespräch wird klarer, wenn du vorher weißt, worum es dir geht. Kostenlos und privat.
          </p>

          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            <FunnelCol title="Selbsttests" links={testLinks.map((t) => ({ title: t!.title, to: `/selbsttests/${t!.slug}` }))} />
            <FunnelCol title="Zum Nachlesen" links={articleLinks.map((a) => ({ title: a!.title, to: a!.url }))} />
            <FunnelCol title="Beziehungsszenen" links={sceneLinks.map((s) => ({ title: s!.title, to: s!.url }))} />
          </div>

          <div className="mt-8 rounded-brand-lg border border-accent/25 bg-accent/[0.05] px-6 py-6">
            <h3 className="text-[1.1rem] font-bold text-navy">Bereite dein Gespräch mit Echo vor</h3>
            <p className="mt-2 max-w-[600px] text-[0.9rem] leading-relaxed text-brand-muted">
              Echo hilft dir, deine Beziehungssituation in Ruhe zu ordnen – damit du im ersten Termin schneller
              beim Kern bist. Privat, verschlüsselt, ohne Bewertung.
            </p>
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary mt-4 inline-block !px-6">
              Kostenlos mit Echo starten
            </Link>
          </div>
        </div>
      </section>

      {/* Interne Verlinkung: andere Städte / Fachrichtungen */}
      <section className="border-t border-brand-border bg-brand-bg px-6 py-12">
        <div className="mx-auto max-w-[860px] space-y-7">
          <div>
            <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">{prof.label} in anderen Städten</p>
            <div className="flex flex-wrap gap-2">
              {REGION_CITIES.filter((c) => c.slug !== citySlug).map((c) => (
                <Link key={c.slug} to={`/${prof.slug}/${c.slug}`} className="rounded-full border border-brand-border bg-white px-3 py-1 text-[0.8rem] text-navy no-underline hover:border-accent/50 hover:text-accent">
                  {prof.label} {c.name}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">Andere Fachrichtungen in {cityName}</p>
            <div className="flex flex-wrap gap-2">
              {REGION_PROFESSIONS.filter((p) => p.slug !== prof.slug).map((p) => (
                <Link key={p.slug} to={`/${p.slug}/${citySlug}`} className="rounded-full border border-brand-border bg-white px-3 py-1 text-[0.8rem] text-navy no-underline hover:border-accent/50 hover:text-accent">
                  {p.label} {cityName}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}

function FunnelCol({ title, links }: { title: string; links: { title: string; to: string }[] }) {
  if (links.length === 0) return null
  return (
    <div>
      <p className="mb-2.5 text-[0.8rem] font-bold text-navy">{title}</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-[0.85rem] font-medium text-accent no-underline hover:underline">{l.title} →</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
