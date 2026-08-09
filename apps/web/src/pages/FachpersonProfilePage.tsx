import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PageLayout from '@/components/layout/PageLayout'
import { directoryApi } from '@/api/directory'
import { formatLabel, tierBadge } from '@/directory/taxonomy'
import ContactDialog from '@/components/directory/ContactDialog'

function initials(name: string): string {
  return name.replace(/^(Dr\.|Prof\.|Praxis|Institut)\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function FachpersonProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const [contactOpen, setContactOpen] = useState(false)

  const { data: p, isLoading, isError } = useQuery({
    queryKey: ['dir-detail', slug],
    queryFn: () => directoryApi.detail(slug!),
    enabled: !!slug,
    retry: false,
  })

  useEffect(() => {
    if (p) document.title = `${p.display_name} – ${p.profession_label} in ${p.city} | EchoB`
  }, [p])

  if (isLoading) {
    return <PageLayout><div className="mx-auto max-w-[720px] px-6 py-32 text-center text-brand-muted">Lädt …</div></PageLayout>
  }
  if (isError || !p) {
    return (
      <PageLayout>
        <section className="mx-auto max-w-[720px] px-6 pt-[calc(60px+4rem)] pb-24 text-center">
          <h1 className="text-2xl font-bold text-navy">Fachperson nicht gefunden</h1>
          <p className="mt-2 text-sm text-brand-muted">Dieser Eintrag existiert nicht (mehr).</p>
          <Link to="/fachpersonen" className="mt-5 inline-block text-sm font-semibold text-accent hover:underline">← Zurück zum Verzeichnis</Link>
        </section>
      </PageLayout>
    )
  }

  const badge = tierBadge(p.tier, p.verified)

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-navy px-6 pt-[calc(60px+2.5rem)] pb-12 text-white">
        <div className="mx-auto max-w-[820px]">
          <Link to="/fachpersonen" className="text-xs text-white/55 transition-colors hover:text-white">← Fachpersonen-Verzeichnis</Link>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-brand-lg bg-white/10 text-2xl font-bold text-white">
              {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : initials(p.display_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[clamp(1.6rem,4vw,2.2rem)] font-extrabold leading-tight tracking-[-0.02em]">{p.display_name}</h1>
                {badge && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[0.64rem] font-bold uppercase tracking-wide ${badge.kind === 'partner' ? 'bg-accent text-white' : 'bg-white/15 text-white'}`}>{badge.label}</span>
                )}
              </div>
              {p.title && <p className="mt-1.5 text-[0.95rem] text-white/75">{p.title}</p>}
              <p className="mt-2 text-[0.9rem] text-white/60">
                <span className="font-medium text-white/85">{p.profession_label}</span> · {p.city}
                {p.postal_code && ` (${p.postal_code})`}
              </p>
              {p.headline && <p className="mt-4 max-w-[540px] font-serif text-[1.1rem] italic leading-relaxed text-brand-blue">{p.headline}</p>}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {p.contactable ? (
                  <>
                    <button onClick={() => setContactOpen(true)} className="btn-primary !px-6 !py-3">Termin anfragen</button>
                    {p.booking_url && <a href={p.booking_url} target="_blank" rel="noopener noreferrer nofollow" className="btn-outline !px-5 !py-3">Online buchen</a>}
                    {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="text-[0.85rem] font-medium text-white/70 no-underline hover:text-white">Zur Website ↗</a>}
                  </>
                ) : (
                  <span className="text-[0.85rem] text-white/55">Kontaktdaten weiter unten</span>
                )}
              </div>
              {p.offers_free_intro && p.contactable && (
                <p className="mt-3 text-[0.8rem] text-accent">✓ Bietet ein kostenloses Erstgespräch</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="border-t border-brand-border bg-white px-6 py-[56px]">
        <div className="mx-auto grid max-w-[820px] gap-10 md:grid-cols-[1fr_260px]">
          <div className="min-w-0">
            {p.about && <Section title="Über mich" body={p.about} />}
            {p.approach && <Section title="Mein Vorgehen" body={p.approach} />}

            {p.focus_areas.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-[1.1rem] font-bold text-navy">Schwerpunkte</h2>
                <div className="flex flex-wrap gap-2">
                  {p.focus_areas.map((f) => (
                    <span key={f} className="rounded-full border border-brand-border bg-brand-bg px-3 py-1 text-[0.82rem] text-navy">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {p.fees && <Section title="Honorar" body={p.fees} />}

            {!p.contactable && (
              <div className="mb-8 rounded-brand-lg border border-brand-border bg-brand-bg px-6 py-5">
                <p className="text-[0.9rem] font-semibold text-navy">Kontakt</p>
                <p className="mt-1.5 text-[0.86rem] leading-relaxed text-brand-muted">
                  Diese Fachperson ist (noch) nicht über EchoB erreichbar. Du erreichst sie direkt über ihre eigenen Kontaktdaten:
                </p>
                <div className="mt-3 space-y-1.5 text-[0.88rem]">
                  {p.website && <p><a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-accent hover:underline">Website ↗</a></p>}
                  {p.phone && <p className="text-navy">Telefon: <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="font-medium text-accent hover:underline">{p.phone}</a></p>}
                </div>
              </div>
            )}

            {/* Vor dem ersten Gespräch – Funnel zurück ins Produkt */}
            <div className="mt-4 rounded-brand-lg border border-accent/25 bg-accent/[0.05] px-6 py-6">
              <p className="text-[0.68rem] font-bold uppercase tracking-wider text-accent">Vor dem ersten Gespräch</p>
              <h2 className="mt-1.5 text-[1.1rem] font-bold text-navy">Sortiere deine Situation – dann fällt der Anfang leichter</h2>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-brand-muted">
                Ein erstes Gespräch wird klarer, wenn du vorher weißt, worum es dir eigentlich geht. Mit EchoB
                kannst du deine Situation in Ruhe ordnen – kostenlos und privat.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.85rem] font-semibold">
                <Link to="/selbsttests" className="text-accent hover:underline">Selbsttest machen →</Link>
                <Link to="/szenen" className="text-accent hover:underline">Beziehungsszenen lesen →</Link>
                <Link to="/auth" state={{ defaultTab: 'signup' }} className="text-accent hover:underline">Mit Echo vorbereiten →</Link>
              </div>
            </div>
          </div>

          {/* Sidebar: Fakten */}
          <aside className="md:pt-1">
            <div className="rounded-brand-lg border border-brand-border bg-brand-bg p-5">
              <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-wider text-brand-muted">Auf einen Blick</p>
              <dl className="space-y-3 text-[0.85rem]">
                <Fact label="Fachrichtung" value={p.profession_label} />
                <Fact label="Ort" value={`${p.city}${p.state ? ', ' + p.state : ''}`} />
                {p.formats.length > 0 && <Fact label="Setting" value={p.formats.map(formatLabel).join(', ')} />}
                {p.languages.length > 0 && <Fact label="Sprachen" value={p.languages.join(', ')} />}
                {p.offers_free_intro && <Fact label="Erstgespräch" value="Kostenlos" />}
              </dl>
              {p.contactable && (
                <button onClick={() => setContactOpen(true)} className="btn-primary mt-5 w-full !py-2.5">Termin anfragen</button>
              )}
            </div>
            <p className="mt-3 px-1 text-[0.72rem] leading-relaxed text-brand-muted/80">
              EchoB vermittelt keine Behandlung und übernimmt keine Gewähr. Die Angaben stammen von der Fachperson bzw. aus öffentlichen Quellen.
            </p>
          </aside>
        </div>
      </section>

      {contactOpen && (
        <ContactDialog slug={p.slug} name={p.display_name} offersFreeIntro={p.offers_free_intro} onClose={() => setContactOpen(false)} />
      )}
    </PageLayout>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-8">
      <h2 className="mb-2.5 text-[1.1rem] font-bold text-navy">{title}</h2>
      {body.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="mb-3 text-[0.92rem] leading-relaxed text-brand-text">{para}</p>
      ))}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-brand-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-navy">{value}</dd>
    </div>
  )
}
