/**
 * /app/cases/:caseId/scenes — Szenenliste
 */
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { scenesApi } from '@/api/scenes'
import type { Scene } from '@/types'

const SAFETY_COLORS: Record<string, string> = {
  none:     'bg-green-100 text-green-800',
  unclear:  'bg-yellow-100 text-yellow-800',
  elevated: 'bg-orange-100 text-orange-800',
  acute:    'bg-red-100 text-red-800',
}

const SAFETY_LABELS: Record<string, string> = {
  none:     'Kein Risiko',
  unclear:  'Unklar',
  elevated: 'Erhöhte Aufmerksamkeit',
  acute:    'Akut',
}

export default function ScenesPage() {
  const { caseId } = useParams<{ caseId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['scenes', caseId],
    queryFn: () => scenesApi.list(caseId!),
    enabled: !!caseId,
  })

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-navy">Beziehungsszenen</h1>
            <p className="text-sm text-brand-muted mt-1">
              Einzelne Ereignisse und wiederkehrende Situationen in dieser Beziehung.
            </p>
          </div>
          <Link
            to={`/app/cases/${caseId}/scenes/new`}
            className="btn-primary !py-2 !px-4 !text-sm"
          >
            + Szene anlegen
          </Link>
        </div>

        {isLoading && <p className="text-sm text-brand-muted">Szenen werden geladen …</p>}

        {data && data.scenes.length === 0 && <ScenesEmpty caseId={caseId!} />}

        {data && data.scenes.length > 0 && (
          <div className="space-y-3">
            {data.scenes.map((s) => (
              <SceneRow key={s.id} scene={s} caseId={caseId!} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function SceneRow({ scene: s, caseId }: { scene: Scene; caseId: string }) {
  return (
    <Link
      to={`/app/cases/${caseId}/scenes/${s.id}`}
      className="card flex items-start gap-4 no-underline hover:border-accent/40 transition-all"
    >
      {/* Belastungsscore */}
      <div className="flex-shrink-0 w-10 h-10 rounded-brand bg-brand-bg border border-brand-border flex items-center justify-center">
        <span className="text-sm font-bold text-navy">{s.distress_score ?? '–'}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-navy truncate">{s.title}</span>
          {s.safety_level !== 'none' && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SAFETY_COLORS[s.safety_level]}`}>
              {SAFETY_LABELS[s.safety_level]}
            </span>
          )}
          {!s.confirmed_by_user && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-border text-brand-muted">
              Unbestätigt
            </span>
          )}
        </div>
        {s.scene_date && (
          <p className="text-xs text-brand-muted mb-1">{formatDate(s.scene_date)}</p>
        )}
        {s.description && (
          <p className="text-xs text-brand-muted line-clamp-2">{s.description}</p>
        )}
        {s.pattern_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {s.pattern_tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <span className="text-xs text-accent font-medium flex-shrink-0">→</span>
    </Link>
  )
}

function ScenesEmpty({ caseId }: { caseId: string }) {
  return (
    <div className="card text-center py-12 max-w-md mx-auto">
      <div className="text-4xl mb-4">📖</div>
      <h2 className="text-lg font-semibold text-navy mb-2">Noch keine Szenen</h2>
      <p className="text-sm text-brand-muted mb-6">
        Dokumentiere konkrete Ereignisse oder wiederkehrende Situationen, um Muster sichtbar zu machen.
      </p>
      <Link to={`/app/cases/${caseId}/scenes/new`} className="btn-primary !py-2 !px-5 !text-sm">
        Erste Szene anlegen
      </Link>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}
