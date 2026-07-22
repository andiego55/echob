import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import {
  ATTACH_ORDER, TYPES, RATING_LABEL, ratingFor,
  type AttachType, type Rating, type TypeProfile,
} from '@/content/compatibility'

/**
 * /kompatibilitaet — interaktive Kompatibilitäts-Matrix der vier Bindungstypen.
 * Typ + Partner-Typ wählen (oder in der Matrix klicken) → Passung, Dynamik, Wachstumsweg.
 * Nicht-diagnostisch. SSR-fest (Auswahl nur clientseitig).
 */
const SHORT: Record<AttachType, string> = {
  sicher: 'Sicher', aengstlich: 'Ängstlich', vermeidend: 'Vermeidend', aengstlich_vermeidend: 'Ängstl.-verm.',
}

const RATING_STYLE: Record<Rating, { cell: string; badge: string; dot: string }> = {
  stark: { cell: 'bg-emerald-500 text-white', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  gut: { cell: 'bg-teal-500 text-white', badge: 'bg-teal-100 text-teal-800', dot: 'bg-teal-500' },
  gemischt: { cell: 'bg-amber-400 text-white', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
  herausfordernd: { cell: 'bg-orange-500 text-white', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  intensiv: { cell: 'bg-rose-500 text-white', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
}

export default function KompatibilitaetPage() {
  const [me, setMe] = useState<AttachType | null>(null)
  const [partner, setPartner] = useState<AttachType | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (me && partner) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [me, partner])

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy px-6 pt-[calc(60px+4.5rem)] pb-16 text-white">
        <svg aria-hidden="true" className="pointer-events-none absolute -right-24 -top-10 h-[420px] w-[420px] opacity-[0.12]" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="88" fill="none" stroke="#e07b54" strokeWidth="1" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#e07b54" strokeWidth="1.3" />
          <circle cx="100" cy="100" r="32" fill="none" stroke="#e07b54" strokeWidth="1.6" />
          <circle cx="100" cy="100" r="10" fill="#e07b54" />
        </svg>
        <div className="relative mx-auto max-w-[820px]">
          <span className="label">Kompatibilitäts-Matrix</span>
          <h1 className="mt-2 max-w-[18ch] text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.12] tracking-[-0.02em]">
            Welche Bindungstypen <span className="text-accent">passen zusammen</span>?
          </h1>
          <p className="mt-5 max-w-[600px] text-[1.06rem] leading-[1.75] text-brand-blue">
            Vier Bindungstypen, sechzehn Kombinationen. Wähl deinen Typ und den deines Gegenübers – und
            entdecke, was euch trägt, wo es typischerweise knirscht und wie ihr wachsen könnt.
          </p>
          <p className="mt-5 text-sm text-white/55">
            Nicht sicher, welcher Typ du bist?{' '}
            <Link to="/selbsttests/bindungsstil" className="font-medium text-accent hover:underline">Mach den Bindungsstil-Test →</Link>
          </p>
        </div>
      </section>

      {/* Auswahl */}
      <section className="border-t border-brand-border px-6 py-12">
        <div className="mx-auto max-w-[820px]">
          <div className="grid gap-6 sm:grid-cols-2">
            <Selector title="Du bist …" value={me} onSelect={setMe} />
            <Selector title="Dein Gegenüber ist …" value={partner} onSelect={setPartner} />
          </div>

          {/* Matrix */}
          <div className="mt-10">
            <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">Oder klick dich durch die Matrix</p>
            <Matrix me={me} partner={partner} onPick={(a, b) => { setMe(a); setPartner(b) }} />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {(['stark', 'gut', 'gemischt', 'herausfordernd', 'intensiv'] as Rating[]).map((r) => (
                <span key={r} className="inline-flex items-center gap-1.5 text-[0.72rem] text-brand-muted">
                  <span className={`h-2.5 w-2.5 rounded-full ${RATING_STYLE[r].dot}`} />{RATING_LABEL[r]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ergebnis */}
      <section ref={resultRef} className="scroll-mt-[80px] px-6 pb-4">
        <div className="mx-auto max-w-[820px]">
          {me && partner ? <PairingResult me={me} partner={partner} />
            : <p className="rounded-brand-lg border border-dashed border-brand-border bg-brand-bg/40 px-6 py-10 text-center text-sm text-brand-muted">
                Wähle oben beide Typen – dann erscheint hier die Passungs-Analyse.
              </p>}
        </div>
      </section>

      {/* Typen erkunden */}
      <section className="border-t border-brand-border bg-white px-6 py-14">
        <div className="mx-auto max-w-[820px]">
          <h2 className="text-[clamp(1.3rem,2.6vw,1.8rem)] font-bold text-navy">Die vier Bindungstypen im Detail</h2>
          <p className="mt-2 text-sm text-brand-muted">Klapp einen Typ auf, um tiefer einzusteigen.</p>
          <div className="mt-6 space-y-3">
            {ATTACH_ORDER.map((k) => <TypeCard key={k} profile={TYPES[k]} />)}
          </div>
        </div>
      </section>

      {/* Hinweis */}
      <section className="border-t border-brand-border px-6 py-10">
        <div className="mx-auto max-w-[820px]">
          <p className="text-xs leading-relaxed text-brand-muted/80">
            Bindungstypen sind Modelle, keine Diagnosen oder festen Etiketten. Die meisten Menschen tragen
            Anteile mehrerer Stile in sich, und Bindung kann sich je nach Gegenüber und über die Zeit wandeln.
            Diese Seite ist ein Deutungsangebot zum Nachdenken – kein Urteil über eure Beziehung.
          </p>
        </div>
      </section>
    </PageLayout>
  )
}

function Selector({ title, value, onSelect }: { title: string; value: AttachType | null; onSelect: (t: AttachType) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-navy">{title}</p>
      <div className="space-y-2">
        {ATTACH_ORDER.map((k) => {
          const on = value === k
          return (
            <button
              key={k}
              onClick={() => onSelect(k)}
              className={`flex w-full items-center gap-3 rounded-brand border px-4 py-2.5 text-left transition-colors ${
                on ? 'border-accent bg-accent/[0.06]' : 'border-brand-border bg-white hover:border-accent/40'
              }`}
            >
              <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? 'border-accent' : 'border-brand-border'}`}>
                {on && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-navy">{TYPES[k].name}</span>
                <span className="block text-[0.76rem] leading-snug text-brand-muted">{TYPES[k].tagline}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Matrix({ me, partner, onPick }: { me: AttachType | null; partner: AttachType | null; onPick: (a: AttachType, b: AttachType) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-[92px]" />
            {ATTACH_ORDER.map((c) => (
              <th key={c} className="px-1 pb-1 text-[0.68rem] font-semibold text-brand-muted">{SHORT[c]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATTACH_ORDER.map((r) => (
            <tr key={r}>
              <th className="pr-2 text-right text-[0.68rem] font-semibold text-brand-muted">{SHORT[r]}</th>
              {ATTACH_ORDER.map((c) => {
                const p = ratingFor(r, c)
                const st = RATING_STYLE[p.rating]
                const selected = me === r && partner === c
                return (
                  <td key={c} className="p-0">
                    <button
                      onClick={() => onPick(r, c)}
                      title={`${SHORT[r]} × ${SHORT[c]}: ${RATING_LABEL[p.rating]}`}
                      className={`h-14 w-full rounded-brand-sm px-1 text-[0.62rem] font-semibold leading-tight transition-all ${st.cell} ${
                        selected ? 'ring-2 ring-navy ring-offset-1' : 'opacity-90 hover:opacity-100 hover:-translate-y-0.5'
                      }`}
                    >
                      {RATING_LABEL[p.rating]}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PairingResult({ me, partner }: { me: AttachType; partner: AttachType }) {
  const p = ratingFor(me, partner)
  const meIsA = me === p.a
  const forMe = meIsA ? p.forA : p.forB
  const forThem = meIsA ? p.forB : p.forA
  const st = RATING_STYLE[p.rating]

  return (
    <div className="rounded-brand-lg border border-brand-border bg-white p-7 shadow-brand">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-navy">{TYPES[me].name}</span>
        <span className="text-brand-muted">×</span>
        <span className="text-sm font-bold text-navy">{TYPES[partner].name}</span>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${st.badge}`}>{RATING_LABEL[p.rating]}</span>
      </div>
      <h3 className="mt-3 text-[1.4rem] font-extrabold leading-snug text-navy">{p.headline}</h3>
      <p className="mt-3 text-[1rem] leading-relaxed text-brand-text">{p.dynamic}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Panel tone="good" title="Was euch trägt">{p.draw}</Panel>
        <Panel tone="watch" title="Wo es typischerweise knirscht">{p.friction}</Panel>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Panel tone="accent" title={`Für dich (${TYPES[me].name})`}>{forMe}</Panel>
        <Panel tone="plain" title={`Für dein Gegenüber (${TYPES[partner].name})`}>{forThem}</Panel>
      </div>

      <div className="mt-4 rounded-brand border border-accent/25 bg-accent/[0.05] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Euer Wachstumsweg</p>
        <p className="mt-1 text-[0.97rem] leading-relaxed text-brand-text">{p.growth}</p>
      </div>

      <p className="mt-5 text-xs text-brand-muted">
        Willst du eure Muster konkret durchdenken?{' '}
        <Link to="/selbsttests/beziehungsgesundheit" className="font-medium text-accent hover:underline">Beziehungsgesundheit testen</Link>{' '}
        oder <Link to="/szenen" className="font-medium text-accent hover:underline">Szenen lesen</Link>.
      </p>
    </div>
  )
}

function Panel({ tone, title, children }: { tone: 'good' | 'watch' | 'accent' | 'plain'; title: string; children: ReactNode }) {
  const cls = {
    good: 'border-emerald-200 bg-emerald-50/60',
    watch: 'border-amber-200 bg-amber-50/60',
    accent: 'border-accent/25 bg-accent/[0.04]',
    plain: 'border-brand-border bg-brand-bg/50',
  }[tone]
  return (
    <div className={`rounded-brand border px-5 py-4 ${cls}`}>
      <p className="text-[0.72rem] font-bold uppercase tracking-wide text-navy/80">{title}</p>
      <p className="mt-1.5 text-[0.92rem] leading-relaxed text-brand-text">{children}</p>
    </div>
  )
}

function TypeCard({ profile }: { profile: TypeProfile }) {
  const [open, setOpen] = useState(false)
  const rows: [string, string][] = [
    ['In Beziehungen', profile.inLove],
    ['Größte Angst', profile.fear],
    ['Braucht', profile.needs],
    ['Im Konflikt', profile.inConflict],
    ['Stärke', profile.strength],
    ['Wachstumsweg', profile.growth],
  ]
  return (
    <div className="rounded-brand border border-brand-border bg-white">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span>
          <span className="block text-[1rem] font-bold text-navy">{profile.name}</span>
          <span className="block text-[0.8rem] text-brand-muted">{profile.tagline}</span>
        </span>
        <svg className={`h-4 w-4 shrink-0 text-accent transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-brand-border px-5 py-4">
          <p className="text-[0.95rem] leading-relaxed text-brand-text">{profile.essence}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[0.68rem] font-bold uppercase tracking-wide text-accent/90">{k}</dt>
                <dd className="mt-0.5 text-[0.88rem] leading-relaxed text-brand-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
