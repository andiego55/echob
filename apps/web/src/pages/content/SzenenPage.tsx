import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import { submitContact } from '@/api/contact'
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

  const [filterOpen, setFilterOpen] = useState(!!initialTag)

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

      {/* Filter (einklappbar) */}
      <section className="sticky top-[60px] z-30 border-b border-brand-border bg-brand-bg/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto max-w-[1040px]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted transition-colors hover:text-navy"
            >
              <svg className={`h-3 w-3 transition-transform ${filterOpen ? 'rotate-90' : ''}`} viewBox="0 0 12 12" fill="none">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Worum es geht
              <span className="font-medium normal-case tracking-normal text-brand-muted/60">
                {active.size > 0 ? `· ${active.size} aktiv` : `· ${TAG_COUNTS.length} Themen`}
              </span>
            </button>
            {active.size > 0 && (
              <button onClick={() => setActive(new Set())} className="shrink-0 text-xs font-medium text-accent hover:underline">
                Zurücksetzen ({visible.length})
              </button>
            )}
          </div>

          {/* Aktive Schlagworte bleiben sichtbar, auch wenn eingeklappt */}
          {!filterOpen && active.size > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {orderSceneTags(active).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent px-3 py-1 text-[0.82rem] text-white"
                >
                  {sceneTagLabel(tag)}
                  <span className="text-white/70">✕</span>
                </button>
              ))}
            </div>
          )}

          {/* Volle Schlagwortliste */}
          {filterOpen && (
            <div className="mt-3 flex flex-wrap gap-2">
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
          )}
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

      {/* Eigene Szene einreichen */}
      <SubmitSceneSection />

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

function SubmitSceneSection() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [company, setCompany] = useState('') // Honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const canSend = text.trim().length > 20 && /.+@.+\..+/.test(email) && consent && state !== 'sending'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    setState('sending')
    const message =
      `Titel: ${title.trim() || '—'}\n` +
      `Schlagworte: ${tags.trim() || '—'}\n\n` +
      `Szene:\n${text.trim()}`
    try {
      await submitContact({ kind: 'scene', name: name.trim() || null, email: email.trim(), message, source: 'szenen', consent, company })
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <section className="border-t border-brand-border bg-brand-bg/40 px-6 py-14">
      <div className="mx-auto max-w-[720px]">
        {!open ? (
          <div className="text-center">
            <span className="label">Mitmachen</span>
            <h2 className="mt-2 text-[clamp(1.3rem,2.6vw,1.8rem)] font-bold text-navy">Eigene Szene einreichen</h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[0.97rem] leading-relaxed text-brand-muted">
              Hast du eine Szene erlebt, in der sich andere wiedererkennen könnten? Reich sie ein – wir
              bearbeiten sie behutsam redaktionell und veröffentlichen sie (auf Wunsch) hier.
            </p>
            <button onClick={() => setOpen(true)} className="btn-primary mt-6 !px-6 !py-3">Szene einreichen</button>
          </div>
        ) : state === 'done' ? (
          <div className="rounded-brand-lg border border-accent/25 bg-accent/[0.05] px-7 py-8 text-center">
            <h2 className="text-[1.2rem] font-bold text-navy">Danke – wir haben deine Szene erhalten.</h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[0.95rem] leading-relaxed text-brand-muted">
              Wir sehen sie uns an, bearbeiten sie behutsam und melden uns bei dir. Nichts wird ohne
              redaktionelle Prüfung veröffentlicht.
            </p>
          </div>
        ) : (
          <div className="rounded-brand-lg border border-brand-border bg-white p-7 shadow-brand">
            <span className="label">Eigene Szene einreichen</span>
            <div className="mt-2 rounded-brand border border-accent/25 bg-accent/[0.05] px-4 py-3">
              <p className="text-[0.85rem] leading-relaxed text-brand-text">
                <strong className="text-navy">Bitte mit Pseudonymen schreiben</strong> – erfundene Namen statt echter.
                Im Zuge der redaktionellen Bearbeitung ersetzen wir das Pseudonym durch einen (anderen) Namen.
              </p>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <Field label="Titel (optional)">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputCls} placeholder="z. B. Das lange Schweigen" />
              </Field>
              <Field label="Deine Szene *">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={4000}
                  className={`${inputCls} resize-y`} placeholder="Erzähl die Szene aus der Ich-Perspektive – mit Pseudonymen." />
              </Field>
              <Field label="Schlagworte (optional)">
                <input value={tags} onChange={(e) => setTags(e.target.value)} maxLength={200} className={inputCls} placeholder="z. B. Silent Treatment, Nähe-Distanz (kommagetrennt)" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dein Name (optional)">
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} placeholder="Wie dürfen wir dich ansprechen?" />
                </Field>
                <Field label="Deine E-Mail *">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} className={inputCls} placeholder="für Rückfragen" />
                </Field>
              </div>
              <label className="flex items-start gap-2 text-[0.85rem] text-brand-muted">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-accent" />
                <span>Ich bin einverstanden, dass EchoB meine Szene redaktionell bearbeiten und – nach Prüfung – anonymisiert veröffentlichen darf.</span>
              </label>
              {state === 'error' && <p className="text-sm text-red-600">Senden fehlgeschlagen. Bitte später erneut versuchen.</p>}
              <div className="flex items-center gap-3">
                <button type="submit" disabled={!canSend} className="btn-primary !px-6 !py-2.5 disabled:opacity-50">
                  {state === 'sending' ? 'Wird gesendet …' : 'Einreichen'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-brand-muted hover:text-navy">Abbrechen</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  )
}

const inputCls = 'w-full rounded-brand border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-text outline-none transition focus:border-accent focus:ring-1 focus:ring-accent placeholder:text-brand-muted/50'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-brand-text">{label}</span>
      {children}
    </label>
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
