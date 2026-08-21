/**
 * /app/cases/:caseId/scenes/:sceneId — Szene ansehen & bearbeiten
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { scenesApi } from '@/api/scenes'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'

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
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editReaction, setEditReaction] = useState('')
  const [editDistress, setEditDistress] = useState<number | null>(null)
  const [editTags, setEditTags] = useState<string[]>([])

  const startEdit = () => {
    if (!scene) return
    setEditTitle(scene.title)
    setEditDate(scene.scene_date ?? '')
    setEditDescription(scene.description ?? '')
    setEditReaction(scene.user_reaction ?? '')
    setEditDistress(scene.distress_score)
    setEditTags(scene.pattern_tags ?? [])
    setEditMode(true)
  }

  const updateMutation = useMutation({
    mutationFn: () => scenesApi.update(caseId!, sceneId!, {
      title: editTitle || 'Szene ohne Titel',
      scene_date: editDate || undefined,
      description: editDescription || undefined,
      user_reaction: editReaction || undefined,
      distress_score: editDistress ?? undefined,
      pattern_tags: editTags,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scene', caseId, sceneId] })
      qc.invalidateQueries({ queryKey: ['scenes', caseId] })
      setEditMode(false)
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
    return <AppShell><CaseNav caseId={caseId!} /><div className="mx-auto max-w-[1100px] px-6 py-8"><PageSkeleton /></div></AppShell>
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
            <h1 className="page-title mt-1">{scene.title}</h1>
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
            <button
              onClick={startEdit}
              className="rounded border border-brand-border px-3 py-1.5 text-sm text-brand-text hover:border-accent hover:text-accent transition-colors"
            >
              Bearbeiten
            </button>
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

        {/* Bearbeitungsformular */}
        {editMode && (
          <div className="card mb-6 space-y-4">
            <p className="text-sm font-semibold text-navy">Szene bearbeiten</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1">Titel</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1">Datum</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Beschreibung</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={5}
                className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Deine Reaktion</label>
              <textarea
                value={editReaction}
                onChange={(e) => setEditReaction(e.target.value)}
                rows={3}
                className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-2">
                Belastung <span className="font-normal">(1 = wenig, 5 = sehr hoch)</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEditDistress(editDistress === n ? null : n)}
                    className={`w-9 h-9 rounded-brand border text-sm font-semibold transition-all ${
                      editDistress === n
                        ? 'border-accent bg-accent text-white'
                        : 'border-brand-border text-brand-muted hover:border-accent/50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-2">Muster-Tags</label>
              <div className="flex flex-wrap gap-2">
                {PATTERN_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setEditTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      editTags.includes(tag)
                        ? 'border-accent bg-accent/10 text-accent font-medium'
                        : 'border-brand-border text-brand-muted hover:border-accent/40'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <Fehlermeldung error={updateMutation.error} />

            <div className="flex gap-3">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="btn-primary !py-2 !px-4 !text-sm"
              >
                {updateMutation.isPending ? 'Wird gespeichert …' : 'Speichern'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="btn-quiet !py-2 !px-4 !text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Inhalt + Muster-Tags + Aktionen */}
        {!editMode && <>
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

          {scene.pattern_tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {scene.pattern_tags.map((tag) => (
                <span key={tag} className="text-xs px-3 py-1.5 bg-accent/10 text-accent rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-muted">Keine Muster-Tags markiert. Über „Bearbeiten" ergänzen.</p>
          )}
        </div>

        {/* Aktionen */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => navigate(`/app/cases/${caseId}/echo`)}
            className="btn-quiet !py-2 !px-4 !text-sm"
          >
            Mit Echo besprechen
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Szene „${scene.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                deleteMutation.mutate()
              }
            }}
            disabled={deleteMutation.isPending}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Szene löschen
          </button>
        </div>
        </>}
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
