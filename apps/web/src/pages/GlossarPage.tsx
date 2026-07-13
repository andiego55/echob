import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'

type GlossItem = (typeof CONTENT_MANIFEST)[number]

const GLOSSARY: GlossItem[] = CONTENT_MANIFEST.filter((m) => m.type === 'glossary').sort((a, b) =>
  a.title.localeCompare(b.title, 'de'),
)

// Nach Anfangsbuchstaben gruppieren (A–Z). Nur vorkommende Buchstaben.
const GROUPS: Record<string, GlossItem[]> = {}
for (const m of GLOSSARY) {
  const letter = m.title.charAt(0).toUpperCase()
  ;(GROUPS[letter] ??= []).push(m)
}
const LETTERS = Object.keys(GROUPS).sort((a, b) => a.localeCompare(b, 'de'))

/** Begriff aus dem SEO-Titel („Gaslighting – Definition …" → „Gaslighting"). */
function term(title: string): string {
  return title.replace(/\s*[–—-]\s.*$/, '')
}

export default function GlossarPage() {
  return (
    <PageLayout>
      <section className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16">
        <div className="mx-auto max-w-[820px]">
          <span className="label">Glossar</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em]">
            Begriffe rund um Beziehungen
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[560px] leading-[1.75]">
            Kurz und klar erklärt – jeder Begriff lässt sich unmittelbar auf deine eigene Situation beziehen.
          </p>
        </div>
      </section>

      <section className="px-6 py-[56px]">
        <div className="mx-auto max-w-[820px]">
          {LETTERS.length === 0 ? (
            <p className="text-brand-muted">Die ersten Begriffe folgen in Kürze.</p>
          ) : (
            LETTERS.map((letter) => (
              <div key={letter} className="mb-10 last:mb-0">
                <h2 className="mb-4 text-lg font-extrabold text-accent">{letter}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {GROUPS[letter].map((m) => (
                    <Link key={m.url} to={m.url} className="group card no-underline hover:border-accent/50">
                      <h3 className="mb-1 text-[0.97rem] font-bold text-navy">{term(m.title)}</h3>
                      <p className="text-sm leading-relaxed text-brand-muted">{m.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}

          <p className="mt-12 border-t border-brand-border pt-6 text-sm text-brand-muted">
            Alle Themen und Artikel findest du in der{' '}
            <Link to="/wissen" className="text-accent hover:underline">
              Wissens-Übersicht
            </Link>
            .
          </p>
        </div>
      </section>
    </PageLayout>
  )
}
