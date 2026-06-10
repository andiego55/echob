/**
 * /app/cases/:caseId/scenes/:sceneId — Szene ansehen & bearbeiten
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { scenesApi } from '@/api/scenes'

const SAFETY_BADGE: Record<string, { label: string; cls: string }> = {
  none:     { label: 'Kein Sicherheitsrisiko',    cls: 'bg-green-100 text-green-800' },
  unclear:  { label: 'Sicherheit unklar',          cls: 'bg-yellow-100 text-yellow-800' },
  elevated: { label: 'Erhöhte Aufmerksamkeit',     cls: 'bg-orange-100 text-orange-800' },
  acute:    { label: 'Akutes Sicherheitsrisiko',   cls: 'bg-red-100 text-red-800' },
}

const PATTERN_TAG_OPTIONS = [
  'Schuldumkehr', 'Grenzverletzung', 'Kontrolle', 'Isolation',
  'Nähe-Distanz-Wechsel', 'Abwertung', 'Idealisierung',
  'Wahrnehmungsverunsicherung', 'Konflikteskalation', 'Schweigen/Rückzug',
]

export default function SceneDetailPage() {
  const { caseId, sceneId } = useParams<{ caseId: string; sceneId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: scene, isLoading } = useQuery({
    queryKey: ['scene', caseId, sceneId],
    queryFn: () => scenesApi.get(caseId!, sceneId!),
    enabled: !!caseId && !!sceneId,
  })

  const [editMode, setEditMode] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [distress, setDistress] = useState<number | null>(null)

  const confirmMutation = useMutation({
    mutationFn: () => scenesApi.confirm(caseId!, sceneId!, {
      pattern_tags: tags,
      distress_score: distress ?? undefined,
      safety_level: scene?.safety_level ?? 'none',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scene', caseId, sceneId] })
      qc.invalidateQueries({ queryKey: ['scenes', caseId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => scenesApi.delete(caseId!, sceneId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scenes', caseId] })
      navigate(`/app/cases/${caseId}/scenes`)
    },
  })

  if (isLoading || !scene) {
    return <AppShell><CaseNav caseId={caseId!} /><div className="px-6 py-10 text-sm text-brand-muted">Wird geladen …</div></AppShell>
  }

  const safety = SAFETY_BADGE[scene.safety_level]

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[780px] px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <span className="label mb-2">Beziehungsszene</span>
            <h1 className="mt-1 text-xl font-bold text-navy">{scene.title}</h1>
            {scene.scene_date && (
              <p className="text-sm text-brand-muted mt-1">
                {new Date(scene.scene_date).toLocaleDateString('de-DE', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {scene.distress_score && (
              <span className="text-sm font-semibold text-navy border border-brand-border rounded-brand px-3 py-1">
                Belastung {scene.distress_score}/5
              </span>
            )}
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${safety.cls}`}>
              {safety.label}
            </span>
            {!scene.confirmed_by_user && (
              <span className="text-xs px-3 py-1 rounded-full bg-brand-border text-brand-muted">
                Unbestätigt
              </span>
            )}
          </div>
        </div>

        {/* Sicherheitshinweis */}
        {(scene.safety_level === 'elevated' || scene.safety_level === 'acute') && (
          <div className="mb-6 rounded-brand border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800 mb-1">Sicherheitshinweis</p>
            <p className="text-xs text-red-700">
              Deine Angaben enthalten mögliche Sicherheitsaspekte. Bei akuter Gefahr: Notruf 110 / 112.
              Telefonseelsorge: 0800 111 0 111 (kostenlos, 24h).
            </p>
          </div>
        )}

        {/* Inhalt */}
        <div className="card space-y-5 mb-6">
          {scene.description && (
            <Section label="Beschreibung" text={scene.description} />
          )}
          {scene.user_reaction && (
            <Section label="Deine Reaktion" text={scene.user_reaction} />
          )}
        </div>

        {/* Muster-Tags */}
        <div className="card mb-6">
          <p className="text-sm font-semibold text-navy mb-3">
            Muster-Tags
            <span className="ml-2 text-xs font-normal text-brand-muted">(Hypothesen, keine Diagnosen)</span>
          </p>

          {!scene.confirmed_by_user && (
            <div className="mb-4">
              <p className="text-xs text-brand-muted mb-2">
                Welche Muster könnten in dieser Szene vorgekommen sein? Wähle aus und bestätige.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {PATTERN_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      tags.includes(tag)
                        ? 'border-accent bg-accent/10 text-accent font-medium'
                        : 'border-brand-border text-brand-muted hover:border-accent/40'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="btn-primary !py-2 !px-4 !text-sm"
              >
                {confirmMutation.isPending ? 'Wird gespeichert …' : 'Szene bestätigen'}
              </button>
            </div>
          )}

          {scene.confirmed_by_user && scene.pattern_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {scene.pattern_tags.map((tag) => (
                <span key={tag} className="text-xs px-3 py-1.5 bg-accent/10 text-accent rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {scene.confirmed_by_user && scene.pattern_tags.length === 0 && (
            <p className="text-xs text-brand-muted">Keine Muster-Tags markiert.</p>
          )}
        </div>

        {/* Aktionen */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => navigate(`/app/cases/${caseId}/echo`)}
            className="btn-outline !py-2 !px-4 !text-sm"
          >
            💬 Mit Echo besprechen
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Szene löschen
          </button>
        </div>
      </div>
    </AppShell>
  )
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-brand-muted mb-1">{label}</p>
      <p className="text-sm text-brand-text whitespace-pre-wrap">{text}</p>
    </div>
  )
}
