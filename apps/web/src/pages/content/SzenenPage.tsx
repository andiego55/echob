import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import { CONTENT_MANIFEST } from '@/content/manifest.generated'
import type { ContentMeta } from '@/content/types'
import { orderSceneTags, sceneTagLabel } from '@/content/sceneTags'

/**
 * /szenen — öffentliche Sammlung fiktiver Beziehungsszenen (Ich-Perspektive).
 * Leser:innen sollen sich wiedererkennen und eingeladen fühlen, die Szene mit
 * Echo auf die eigene Situation zu beziehen (Übergang über /szenen/:slug).
 * Dediziertes, literarisches Design – nicht das generische Artikel-Template.
 */
const SCENES: ContentMeta[] = CONTENT_MANIFEST.filter((m) => m.type === 'scene')

// Tag → Anzahl Szenen (für die Filterleiste), in kuratierter Reihenfolge.
const TAG_COUNTS: { tag: string; count: number }[] = (() => {
  const counts = new Map<string, number>()
  for (const s of SCENES) for (const t of s.scene_tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  return orderSceneTags(counts.keys()).map((tag) => ({ tag, count: counts.get(tag) ?? 0 }))
})()

export default function SzenenPage() {
  const [params] = useSearchParams()
  const initialTag = params.get('tag')
  const [active, setActive] = useState<Set<string>>(() =>
    initialTag && TAG_COUNTS.some((t) => t.tag === initialTag) ? new Set([initialTag]) : new Set(),
  )

  const toggle = (tag: string) =>
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })

  const visible = useMemo(() => {
    if (active.size === 0) return SCENES
    return SCENES.filter((s) => (s.scene_tags ?? []).some((t) => active.has(t)))
  }, [active])

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy px-6 pt-[calc(60px+4.5rem)] pb-20 text-white">
        {/* stiller Echo-Wellen-Hintergrund */}
        <svg aria-hidden="true" className="pointer-events-none absolute -right-24 -top-10 h-[420px] w-[420px] opacity-[0.13]" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#e07b54" strokeWidth="1" />
          <circle cx="100" cy="100" r="64" fill="none" stroke="#e07b54" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="38" fill="none" stroke="#e07b54" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="14" fill="#e07b54" />
        </svg>
        <div className="relative mx-auto max-w-[820px]">
          <span className="label">Beziehungsszenen</span>
          <h1 className="mt-2 max-w-[15ch] text-[clamp(2rem,5vw,3.1rem)] font-extrabold leading-[1.12] tracking-[-0.02em]">
            Manche Szenen liest du und denkst: <span className="text-accent">Das kenne ich.</span>
          </h1>
          <p className="mt-6 max-w-[560px] text-[1.08rem] leading-[1.75] text-brand-blue">
            Kurze, gefühlvolle Momente aus schwierigen Beziehungen – erzählt aus der Ich-Perspektive,
            mit erfundenen Namen. Vielleicht erkennst du dich in einer wieder. Und vielleicht willst du
            dann darüber sprechen.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="#szenen" className="btn-primary !px-6 !py-3">
              Szenen entdecken
            </a>
            <span className="text-sm text-white/45">{SCENES.length} Szenen · alle frei zu lesen</span>
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="sticky top-[60px] z-30 border-b border-brand-border bg-brand-bg/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">Worum es geht</p>
            {active.size > 0 && (
              <button onClick={() => setActive(new Set())} className="text-xs font-medium text-accent hover:underline">
                Filter zurücksetzen ({visible.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {TAG_COUNTS.map(({ tag, count }) => {
              const on = active.has(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.82rem] transition-colors ${
                    on
                      ? 'border-accent bg-accent text-white'
                      : 'border-brand-border bg-white text-brand-muted hover:border-accent/50 hover:text-navy'
                  }`}
                >
                  {sceneTagLabel(tag)}
                  <span className={`text-[0.7rem] tabular-nums ${on ? 'text-white/70' : 'text-brand-muted/50'}`}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Szenen-Raster */}
      <section id="szenen" className="scroll-mt-[132px] px-6 py-14">
        <div className="mx-auto max-w-[1040px]">
          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-brand-muted">
              Keine Szene mit dieser Kombination. Wähle weniger Schlagworte.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {visible.map((s) => (
                <SceneCard key={s.slug} scene={s} activeTags={active} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Einladung: eigene Szenen festhalten */}
      <section className="border-t border-brand-border bg-white px-6 py-16">
        <div className="mx-auto max-w-[720px] text-center">
          <span className="label">Deine eigene Geschichte</span>
          <h2 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-bold text-navy">
            Genau so kannst du deine eigenen Szenen festhalten
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[1rem] leading-[1.75] text-brand-muted">
            In EchoB schreibst du solche Momente aus deinem Leben auf – privat und verschlüsselt.
            Echo hilft dir, sie zu sortieren, wiederkehrende Muster zu erkennen und zu verstehen,
            was sich da immer wieder abspielt. Ohne Diagnose, in deinem Tempo.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary !px-6 !py-3">
              Kostenlos beginnen
            </Link>
            <Link to="/wissen" className="text-sm font-medium text-accent hover:underline">
              Zum Wissen →
            </Link>
          </div>
        </div>
      </section>

      {/* Hinweis */}
      <section className="border-t border-brand-border px-6 py-10">
        <div className="mx-auto max-w-[720px]">
          <p className="text-xs leading-relaxed text-brand-muted/80">
            Alle Szenen sind frei erfunden. Namen, Figuren und Situationen sind fiktiv und bilden keine
            realen Personen ab. Sie dienen der Orientierung und dem Wiedererkennen – nicht der Diagnose.
            Bei akuter Gefahr: Notruf <strong>110 / 112</strong>, Telefonseelsorge <strong>0800 111 0 111</strong>.
          </p>
        </div>
      </section>
    </PageLayout>
  )
}

function SceneCard({ scene, activeTags }: { scene: ContentMeta; activeTags: Set<string> }) {
  const tags = scene.scene_tags ?? []
  return (
    <Link
      to={scene.url}
      className="group relative flex flex-col overflow-hidden rounded-brand-lg border border-brand-border bg-white p-7 no-underline shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-brand-lg"
    >
      {/* großes Anführungszeichen als stiller Akzent */}
      <span aria-hidden="true" className="pointer-events-none absolute right-5 top-1 font-serif text-[5rem] leading-none text-accent/10 transition-colors group-hover:text-accent/20">
        „
      </span>
      {scene.perspective && (
        <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-accent/80">{scene.perspective}</p>
      )}
      <h3 className="text-[1.2rem] font-bold leading-snug text-navy">{scene.title}</h3>
      <p className="relative mt-3 font-serif text-[1.02rem] italic leading-[1.6] text-brand-text/90">
        {scene.pull_quote ?? scene.description}
      </p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className={`rounded-full px-2 py-0.5 text-[0.68rem] font-medium ${
              activeTags.has(t) ? 'bg-accent/15 text-accent' : 'bg-brand-bg text-brand-muted'
            }`}
          >
            {sceneTagLabel(t)}
          </span>
        ))}
      </div>
      <span className="mt-5 text-sm font-semibold text-accent">Szene lesen →</span>
    </Link>
  )
}
