import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageLayout from '@/components/layout/PageLayout'
import { directoryApi, type DirectoryCard as Listing } from '@/api/directory'
import { FORMATS, professionLabel } from '@/directory/taxonomy'
import DirectoryCard from '@/components/directory/DirectoryCard'
import ErstgespraechBanner from '@/components/directory/ErstgespraechBanner'

export default function FachpersonenFindenPage() {
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [profession, setProfession] = useState('')
  const [city, setCity] = useState('')
  const [format, setFormat] = useState('')
  const [freeIntro, setFreeIntro] = useState(false)
  const [bills, setBills] = useState(false)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Listing[]>([])

  const filters = {
    q: q || undefined,
    profession: profession || undefined,
    city: city || undefined,
    format: format || undefined,
    free_intro: freeIntro || undefined,
    bills: bills || undefined,
  }

  const { data: facets } = useQuery({ queryKey: ['dir-facets'], queryFn: directoryApi.facets })
  const { data, isFetching } = useQuery({
    queryKey: ['dir-search', filters, page],
    queryFn: () => directoryApi.search({ ...filters, page }),
  })

  // Filteränderung → zurück auf Seite 1.
  useEffect(() => { setPage(1) }, [q, profession, city, format, freeIntro, bills])
  // Ergebnisse: Seite 1 ersetzt, Folgeseiten hängen an.
  useEffect(() => {
    if (!data) return
    setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]))
  }, [data, page])

  const total = data?.total ?? 0
  const hasMore = items.length < total
  const anyFilter = !!(q || profession || city || format || freeIntro || bills)
  const cityLabel = facets?.cities.find((c) => c.slug === city)?.label

  const resetAll = () => {
    setQ(''); setQInput(''); setProfession(''); setCity(''); setFormat(''); setFreeIntro(false); setBills(false)
  }

  return (
    <PageLayout>
      {/* Hero + Suche */}
      <section className="bg-navy px-6 pb-12 pt-[calc(60px+3.5rem)] text-white">
        <div className="mx-auto max-w-[820px] text-center">
          <span className="label mb-3 block !text-accent">Fachpersonen-Verzeichnis</span>
          <h1 className="text-[clamp(1.9rem,4.5vw,2.7rem)] font-extrabold leading-[1.14] tracking-[-0.02em]">
            Finde die passende Fachperson
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[0.98rem] leading-relaxed text-white/65">
            Paartherapeut:innen, Schematherapeut:innen, Coaches und Berater:innen – kuratiert und
            an einem Ort. Such nach Ort oder Name und finde jemanden, der zu dir passt.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); setQ(qInput.trim()) }}
            className="mx-auto mt-7 flex max-w-[560px] items-center gap-2 rounded-brand-lg bg-white p-1.5 shadow-2xl"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-2.5 h-5 w-5 shrink-0 text-brand-muted">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Stadt, Name oder Praxis …"
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-[0.95rem] text-navy placeholder:text-brand-muted/70 focus:outline-none"
            />
            <button type="submit" className="btn-primary shrink-0 !px-5 !py-2.5">Suchen</button>
          </form>
        </div>
      </section>

      {/* Filter + Ergebnisse */}
      <section className="border-t border-brand-border bg-brand-bg px-6 py-8">
        <div className="mx-auto max-w-[1040px]">
          {/* Kategorie-Pills */}
          {facets && facets.professions.length > 0 && (
            <div className="-mx-6 mb-4 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterPill active={!profession} onClick={() => setProfession('')} label="Alle" />
              {facets.professions.map((p) => (
                <FilterPill key={p.slug} active={profession === p.slug} onClick={() => setProfession(p.slug)} label={`${p.label} (${p.count})`} />
              ))}
            </div>
          )}

          {/* Feinfilter */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <select value={city} onChange={(e) => setCity(e.target.value)} className="input !w-auto !py-2 text-[0.85rem]">
              <option value="">Alle Orte</option>
              {facets?.cities.map((c) => <option key={c.slug} value={c.slug}>{c.label} ({c.count})</option>)}
            </select>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="input !w-auto !py-2 text-[0.85rem]">
              <option value="">Jedes Setting</option>
              {FORMATS.map((f) => <option key={f.slug} value={f.slug}>{f.label}</option>)}
            </select>
            <label className="flex cursor-pointer items-center gap-2 rounded-brand-sm border border-brand-border bg-white px-3 py-2 text-[0.85rem] text-navy">
              <input type="checkbox" checked={freeIntro} onChange={(e) => setFreeIntro(e.target.checked)} className="accent-accent" />
              Kostenloses Erstgespräch
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-brand-sm border border-brand-border bg-white px-3 py-2 text-[0.85rem] text-navy">
              <input type="checkbox" checked={bills} onChange={(e) => setBills(e.target.checked)} className="accent-accent" />
              Kassensitz (gesetzl. KK)
            </label>
            {anyFilter && (
              <button onClick={resetAll} className="text-[0.82rem] font-medium text-brand-muted hover:text-accent">
                Filter zurücksetzen
              </button>
            )}
          </div>

          {/* Ergebnis-Kopf */}
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <p className="text-[0.9rem] font-semibold text-navy">
              {isFetching && items.length === 0 ? 'Suche läuft …' : (
                <>
                  {total} {total === 1 ? 'Fachperson' : 'Fachpersonen'}
                  {profession && <span className="text-brand-muted"> · {professionLabel(profession)}</span>}
                  {cityLabel && <span className="text-brand-muted"> in {cityLabel}</span>}
                </>
              )}
            </p>
          </div>

          {/* Ergebnis-Grid */}
          {items.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => <DirectoryCard key={item.slug} item={item} />)}
              </div>
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={isFetching}
                    className="btn-dark !px-7 disabled:opacity-50"
                  >
                    {isFetching ? 'Lädt …' : 'Mehr anzeigen'}
                  </button>
                </div>
              )}
            </>
          ) : (
            !isFetching && (
              <div className="rounded-brand-lg border border-dashed border-brand-border bg-white px-6 py-12 text-center">
                <p className="text-[0.95rem] font-semibold text-navy">Keine passende Fachperson gefunden</p>
                <p className="mx-auto mt-2 max-w-[420px] text-[0.86rem] text-brand-muted">
                  Versuch es mit einem anderen Ort oder einer breiteren Kategorie – oder lass dir von uns
                  direkt weiterhelfen.
                </p>
                {anyFilter && (
                  <button onClick={resetAll} className="mt-4 text-[0.85rem] font-semibold text-accent hover:underline">
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )
          )}

          {/* Direkter Weg zu EchoB */}
          <div className="mt-10">
            <ErstgespraechBanner />
          </div>

          {/* Hinweis für Fachpersonen */}
          <p className="mt-8 text-center text-[0.8rem] text-brand-muted">
            Sie sind Fachperson und möchten gelistet werden?{' '}
            <a href="/fuer-fachpersonen" className="font-semibold text-accent hover:underline">Kostenlos eintragen →</a>
          </p>
        </div>
      </section>
    </PageLayout>
  )
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-brand-border bg-white text-navy hover:border-accent/50 hover:text-accent'
      }`}
    >
      {label}
    </button>
  )
}
