/**
 * /app — Fallübersicht
 * Listet alle Fälle des Nutzers. Einstiegsseite nach Login.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { casesApi } from '@/api/cases'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS } from '@/types'
import type { Case } from '@/types'

export default function CasesOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cases'],
    queryFn: casesApi.list,
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">Meine Fälle</h1>
            <p className="mt-1 text-sm text-brand-muted">
              Jeder Fall steht für eine Beziehungssituation, die du besser verstehen möchtest.
            </p>
          </div>
          <Link to="/app/cases/new" className="btn-primary !py-2 !px-5 !text-sm">
            + Fall anlegen
          </Link>
        </div>

        {/* Inhalt */}
        {isLoading && (
          <div className="text-brand-muted text-sm">Fälle werden geladen …</div>
        )}

        {isError && (
          <div className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Fälle konnten nicht geladen werden. Bitte Seite neu laden.
          </div>
        )}

        {data && data.cases.length === 0 && (
          <EmptyState />
        )}

        {data && data.cases.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.cases.map((c) => (
              <CaseCard key={c.id} case_={c} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function CaseCard({ case_: c }: { case_: Case }) {
  const typeLabel   = RELATIONSHIP_TYPE_LABELS[c.relationship_type]   ?? c.relationship_type
  const statusLabel = RELATIONSHIP_STATUS_LABELS[c.relationship_status] ?? c.relationship_status

  return (
    <Link
      to={`/app/cases/${c.id}`}
      className="card block no-underline hover:border-accent/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="label">{typeLabel}</span>
        <span className="text-xs text-brand-muted">{formatDate(c.created_at)}</span>
      </div>
      <p className="text-sm font-medium text-navy mb-1">{statusLabel}</p>
      {c.main_concern && (
        <p className="text-xs text-brand-muted line-clamp-2">{c.main_concern}</p>
      )}
      <div className="mt-4 text-xs text-accent font-medium">Fall öffnen →</div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="card text-center py-12 max-w-md mx-auto">
      <div className="text-4xl mb-4">📂</div>
      <h2 className="text-lg font-semibold text-navy mb-2">Noch keine Fälle</h2>
      <p className="text-sm text-brand-muted mb-6">
        Leg deinen ersten Fall an, um eine Beziehungssituation strukturiert zu reflektieren.
      </p>
      <Link to="/app/cases/new" className="btn-primary !py-2 !px-5 !text-sm">
        Ersten Fall anlegen
      </Link>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
