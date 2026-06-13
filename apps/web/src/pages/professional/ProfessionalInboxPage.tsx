/**
 * /professional — Postfach: neue & bestehende Freigaben.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { professionalApi } from '@/api/professional'
import { SHARE_ELEMENT_LABELS } from '@/types'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProfessionalInboxPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['prof-inbox'],
    queryFn: professionalApi.inbox,
  })

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <span className="label">Fachpersonenbereich</span>
        <h1 className="mt-1 text-2xl font-bold text-navy">Postfach</h1>
        <p className="mt-2 text-sm text-brand-muted max-w-2xl">
          Hier erscheinen Freigaben von Nutzer:innen. Du siehst ausschließlich Inhalte, die
          ausdrücklich für dich freigegeben wurden – und nur, solange die Freigabe besteht.
        </p>

        {isLoading && <p className="mt-6 text-sm text-brand-muted">Wird geladen …</p>}

        {!isLoading && data.length === 0 && (
          <div className="mt-6 card text-center py-12 max-w-md mx-auto">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-navy mb-2">Noch keine Freigaben</h2>
            <p className="text-sm text-brand-muted">
              Sobald dir jemand Fallinhalte freigibt, erscheinen sie hier.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {data.map(item => (
            <Link
              key={item.share_id}
              to={`/professional/cases/${item.case_id}`}
              className="card block no-underline hover:border-accent/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-navy">{item.client_display_name}</p>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {item.case_title} · freigegeben am {fmtDate(item.shared_at)}
                  </p>
                </div>
                <span className="text-xs text-accent font-medium shrink-0">Öffnen →</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.element_types.map(et => (
                  <span key={et} className="text-[11px] px-2 py-0.5 rounded-full border border-brand-border text-brand-muted">
                    {SHARE_ELEMENT_LABELS[et]}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </ProfessionalShell>
  )
}
