/**
 * /institute/marketplace — Modul-Marktplatz (Katalog). Angebotene Lernmodule (sellable +
 * veröffentlicht) über alle Institute hinweg. Vorschau je Modul; Erwerb folgt (P-F2).
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import type { MarketplaceModule } from '@/types'

export function euro(cents: number): string {
  return cents === 0 ? 'Kostenlos' : (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function InstituteMarketplacePage() {
  const { data, isLoading } = useQuery({ queryKey: ['institute-marketplace'], queryFn: instituteApi.marketplace })
  const list = data ?? []

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Marktplatz</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Fertige Lernmodule anderer Institute – Fallbeispiele, Aufgaben, Wissenschecks und didaktischer Rahmen als Paket.
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-brand-muted">Lädt …</p>
        ) : list.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="mx-auto max-w-md text-sm leading-relaxed text-brand-muted">
              Noch keine Angebote im Marktplatz. Eigene Module kannst du unter{' '}
              <Link to="/institute/modules" className="text-accent hover:underline">Lernmodule</Link> anbieten –
              im Modul „Im Marktplatz anbieten“ aktivieren und veröffentlichen.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => <Card key={m.id} m={m} />)}
          </div>
        )}
      </div>
    </InstituteShell>
  )
}

function Card({ m }: { m: MarketplaceModule }) {
  return (
    <Link to={`/institute/marketplace/${m.id}`} className="card block no-underline transition-all hover:border-accent/40 hover:shadow-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.price_cents === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-accent/10 text-accent'}`}>{euro(m.price_cents)}</span>
        {m.is_own && <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[10px] text-brand-muted">Dein Angebot</span>}
      </div>
      <p className="text-sm font-semibold leading-snug text-navy">{m.title}</p>
      {m.teaser && <p className="mt-1.5 text-xs leading-relaxed text-brand-muted line-clamp-3">{m.teaser}</p>}
      <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-brand-muted/80">
        <span>{m.step_count} Schritte · {m.provider}</span>
        <span className="shrink-0 text-xs font-medium text-accent">Ansehen →</span>
      </div>
    </Link>
  )
}
