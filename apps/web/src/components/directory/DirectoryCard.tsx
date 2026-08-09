import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { DirectoryCard as Listing } from '@/api/directory'
import { formatLabel, tierBadge } from '@/directory/taxonomy'
import ContactDialog from './ContactDialog'

function initials(name: string): string {
  return name
    .replace(/^(Dr\.|Prof\.|Praxis|Institut)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function DirectoryCard({ item }: { item: Listing }) {
  const [contactOpen, setContactOpen] = useState(false)
  const badge = tierBadge(item.tier, item.verified)
  const isPartner = item.tier === 'partner'
  const href = `/fachpersonen/${item.slug}`

  return (
    <>
      <div
        className={`group relative flex flex-col rounded-brand border bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand ${
          isPartner ? 'border-accent/40 shadow-brand-sm ring-1 ring-accent/10' : 'border-brand-border'
        }`}
      >
        {badge && (
          <span
            className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide ${
              badge.kind === 'partner' ? 'bg-accent text-white' : 'bg-navy/[0.06] text-navy'
            }`}
          >
            {badge.label}
          </span>
        )}

        <div className="flex items-start gap-3.5">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-navy/[0.06] text-[0.95rem] font-bold text-navy">
            {item.photo_url ? (
              <img src={item.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(item.display_name)
            )}
          </div>
          <div className="min-w-0 flex-1 pr-14">
            <Link to={href} className="no-underline">
              <h3 className="truncate text-[1.02rem] font-bold leading-snug text-navy group-hover:text-accent">
                {item.display_name}
              </h3>
            </Link>
            {item.title && <p className="mt-0.5 truncate text-[0.8rem] text-brand-muted">{item.title}</p>}
            <p className="mt-1 text-[0.78rem] text-brand-muted">
              <span className="font-medium text-navy/80">{item.profession_label}</span>
              <span className="mx-1.5 text-brand-border">·</span>
              {item.city}
            </p>
          </div>
        </div>

        {item.headline && (
          <p className="mt-3 line-clamp-2 text-[0.86rem] leading-relaxed text-brand-text">{item.headline}</p>
        )}

        {item.focus_areas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.focus_areas.slice(0, 3).map((f) => (
              <span key={f} className="rounded-full bg-brand-bg px-2.5 py-0.5 text-[0.7rem] text-brand-muted">
                {f}
              </span>
            ))}
          </div>
        )}

        {(item.formats.length > 0 || item.offers_free_intro) && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-brand-muted">
            {item.formats.map((f) => formatLabel(f)).join(' · ')}
            {item.offers_free_intro && (
              <span className="rounded-full bg-accent/[0.08] px-2 py-0.5 font-semibold text-accent">
                Kostenloses Erstgespräch
              </span>
            )}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3 border-t border-brand-border/70 pt-3.5">
          {item.contactable ? (
            <>
              <button
                onClick={() => setContactOpen(true)}
                className="rounded-brand-sm bg-accent px-3.5 py-2 text-[0.8rem] font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Termin anfragen
              </button>
              <Link to={href} className="text-[0.8rem] font-semibold text-navy/70 no-underline hover:text-accent">
                Profil ansehen →
              </Link>
            </>
          ) : (
            <Link to={href} className="text-[0.8rem] font-semibold text-accent no-underline hover:underline">
              Kontaktdaten ansehen →
            </Link>
          )}
        </div>
      </div>

      {contactOpen && (
        <ContactDialog
          slug={item.slug}
          name={item.display_name}
          offersFreeIntro={item.offers_free_intro}
          onClose={() => setContactOpen(false)}
        />
      )}
    </>
  )
}
