/**
 * /app/cases/:caseId — Fall-Überblick
 */
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { casesApi } from '@/api/cases'
import { scenesApi } from '@/api/scenes'
import { personProfileApi } from '@/api/personProfile'
import {
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_STATUS_LABELS,
  CONTACT_FREQUENCY_LABELS,
} from '@/types'

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesApi.get(caseId!),
    enabled: !!caseId,
  })

  const { data: scenesData } = useQuery({
    queryKey: ['scenes', caseId],
    queryFn: () => scenesApi.list(caseId!),
    enabled: !!caseId,
  })

  const { data: personProfile } = useQuery({
    queryKey: ['person-profile', caseId],
    queryFn: () => personProfileApi.get(caseId!),
    enabled: !!caseId,
  })

  if (isLoading || !caseData) {
    return (
      <AppShell>
        <div className="px-6 py-10 text-sm text-brand-muted">Wird geladen …</div>
      </AppShell>
    )
  }

  const c = caseData
  const sceneCount = scenesData?.total ?? 0

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Fall-Header */}
        <div className="card mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="label mb-2">{RELATIONSHIP_TYPE_LABELS[c.relationship_type]}</span>
              <h1 className="mt-2 text-xl font-bold text-navy">
                {RELATIONSHIP_STATUS_LABELS[c.relationship_status]}
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                Kontakt: {CONTACT_FREQUENCY_LABELS[c.contact_frequency]}
              </p>
            </div>
            <Link
              to={`/app/cases/${caseId}/scenes/new`}
              className="btn-primary !py-2 !px-4 !text-sm flex-shrink-0"
            >
              + Szene anlegen
            </Link>
          </div>

          {c.main_concern && (
            <div className="mt-4 rounded-brand bg-brand-bg border border-brand-border px-4 py-3">
              <p className="text-xs font-semibold text-brand-muted mb-1">Hauptanliegen</p>
              <p className="text-sm text-brand-text">{c.main_concern}</p>
            </div>
          )}
        </div>

        {/* Schnell-Aktionen */}
        <div className="grid gap-4 sm:grid-cols-3">
          <QuickCard
            icon="📝"
            title="Szenen"
            value={`${sceneCount} dokumentiert`}
            to={`/app/cases/${caseId}/scenes`}
            cta="Szenen ansehen"
          />
          <QuickCard
            icon="💬"
            title="Echo"
            value="KI-Assistent"
            to={`/app/cases/${caseId}/echo`}
            cta="Mit Echo sprechen"
          />
          <QuickCard
            icon="📊"
            title="Berichte"
            value="Zusammenfassung erstellen"
            to={`/app/cases/${caseId}/reports`}
            cta="Bericht erstellen"
          />
        </div>

        {/* Personenprofil-Karte */}
        <div className="mt-6">
          <PersonProfileCard
            caseId={caseId!}
            hasModules={(personProfile?.completed_modules?.length ?? 0) > 0}
            summaryText={personProfile?.summary_text ?? null}
          />
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-brand-muted/70 max-w-xl">
          EchoB analysiert Beziehungsmuster auf Basis deiner eigenen Angaben.
          Die App ersetzt keine psychologische Beratung und stellt keine Diagnosen.
        </p>
      </div>
    </AppShell>
  )
}

function PersonProfileCard({ caseId, hasModules, summaryText }: {
  caseId: string
  hasModules: boolean
  summaryText: string | null
}) {
  return (
    <Link
      to={`/app/cases/${caseId}/person-profile`}
      className="card block no-underline hover:border-accent/40 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-2xl mb-2">👤</div>
          <p className="text-xs font-semibold text-brand-muted mb-1">Personenprofil</p>
          {hasModules ? (
            <>
              <p className="text-sm font-medium text-navy mb-1">Einschätzung vorhanden</p>
              {summaryText ? (
                <p className="text-xs text-brand-muted line-clamp-2">{summaryText}</p>
              ) : (
                <p className="text-xs text-brand-muted">Keine gespeicherte Beschreibung</p>
              )}
            </>
          ) : (
            <p className="text-sm font-medium text-navy">Personenprofil anlegen</p>
          )}
        </div>
        <span className="text-xs text-accent font-medium flex-shrink-0">
          {hasModules ? 'Ansehen →' : 'Anlegen →'}
        </span>
      </div>
    </Link>
  )
}

function QuickCard({ icon, title, value, to, cta }: {
  icon: string; title: string; value: string; to: string; cta: string
}) {
  return (
    <Link to={to} className="card block no-underline hover:border-accent/40 transition-all">
      <div className="text-2xl mb-3">{icon}</div>
      <p className="text-xs font-semibold text-brand-muted mb-1">{title}</p>
      <p className="text-sm font-medium text-navy mb-3">{value}</p>
      <span className="text-xs text-accent font-medium">{cta} →</span>
    </Link>
  )
}
