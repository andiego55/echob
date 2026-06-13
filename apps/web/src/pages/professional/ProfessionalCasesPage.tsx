/**
 * /professional/cases — Übersicht über zugewiesene Klient:innen & Fälle.
 * Nach Klient:in gruppiert; jeder Fall ist ein eigener Echo-Kontext.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { professionalApi } from '@/api/professional'
import { SHARE_ELEMENT_LABELS } from '@/types'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProfessionalCasesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['prof-cases'],
    queryFn: professionalApi.cases,
  })

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <span className="label">Fachpersonenbereich</span>
        <h1 className="mt-1 text-2xl font-bold text-navy">Klient:innen & Fälle</h1>
        <p className="mt-2 text-sm text-brand-muted max-w-2xl">
          Alle dir zugewiesenen Fälle, gruppiert nach Klient:in. Eine Klient:in kann mehrere Fälle haben.
        </p>

        {isLoading && <p className="mt-6 text-sm text-brand-muted">Wird geladen …</p>}

        {!isLoading && data.length === 0 && (
          <div className="mt-6 card text-center py-12 max-w-md mx-auto">
            <div className="text-4xl mb-4">🗂️</div>
            <h2 className="text-lg font-semibold text-navy mb-2">Keine zugewiesenen Fälle</h2>
            <p className="text-sm text-brand-muted">Freigegebene Fälle erscheinen hier und im Postfach.</p>
          </div>
        )}

        <div className="mt-6 space-y-8">
          {data.map((group, i) => (
            <section key={i}>
              <h2 className="text-sm font-semibold text-navy mb-3">{group.client_display_name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.cases.map(c => (
                  <Link
                    key={c.share_id}
                    to={`/professional/cases/${c.case_id}`}
                    className="card block no-underline hover:border-accent/40 hover:shadow-md transition-all"
                  >
                    <span className="label">{c.case_title}</span>
                    <p className="text-xs text-brand-muted mt-2">Freigegeben am {fmtDate(c.shared_at)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.element_types.slice(0, 4).map(et => (
                        <span key={et} className="text-[11px] px-2 py-0.5 rounded-full border border-brand-border text-brand-muted">
                          {SHARE_ELEMENT_LABELS[et]}
                        </span>
                      ))}
                      {c.element_types.length > 4 && (
                        <span className="text-[11px] px-2 py-0.5 text-brand-muted">+{c.element_types.length - 4}</span>
                      )}
                    </div>
                    <div className="mt-4 text-right">
                      <span className="text-xs text-accent font-medium">Fall öffnen →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </ProfessionalShell>
  )
}
