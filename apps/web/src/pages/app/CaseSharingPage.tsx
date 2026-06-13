/**
 * /app/cases/:caseId/share — Freigaben eines Falls verwalten.
 * Fachpersonen einladen/verbinden, Inhalte gezielt freigeben, Freigaben widerrufen.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { scenesApi } from '@/api/scenes'
import { sharesApi, professionalsApi } from '@/api/shares'
import { SHARE_ELEMENT_LABELS } from '@/types'
import type { ShareElementType, CaseShare } from '@/types'

const CATEGORY_ELEMENTS: ShareElementType[] = [
  'case_info', 'onboarding', 'all_scenes', 'scales',
  'reports', 'topic_summaries', 'person_profile', 'self_profile',
]

export default function CaseSharingPage() {
  const { caseId } = useParams<{ caseId: string }>()

  const { data: connections = [] } = useQuery({ queryKey: ['prof-connections'], queryFn: professionalsApi.connections })
  const { data: shares = [] } = useQuery({ queryKey: ['case-shares', caseId], queryFn: () => sharesApi.list(caseId!), enabled: !!caseId })
  const { data: scenesData } = useQuery({ queryKey: ['scenes', caseId], queryFn: () => scenesApi.list(caseId!), enabled: !!caseId })
  const scenes = scenesData?.scenes ?? []

  const accepted = useMemo(() => connections.filter(c => c.status === 'accepted' && c.professional_user_id), [connections])

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-6">
        <div>
          <span className="label">Fall teilen</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">Freigaben</h1>
          <p className="mt-2 text-sm text-brand-muted max-w-2xl">
            Gib einzelne Inhalte dieses Falls gezielt an eine Fachperson frei. Nur ausgewählte Inhalte
            werden geteilt. Du kannst jede Freigabe jederzeit widerrufen.
          </p>
        </div>

        <ConnectionsCard />

        <NewShareCard caseId={caseId!} accepted={accepted} shares={shares} scenes={scenes} />

        {/* Aktive Freigaben */}
        <div className="card">
          <h2 className="text-sm font-bold text-navy mb-3">Bestehende Freigaben</h2>
          {shares.length === 0 ? (
            <p className="text-sm text-brand-muted">Noch keine Freigaben für diesen Fall.</p>
          ) : (
            <div className="space-y-3">
              {shares.map(s => (
                <div key={s.id} className="rounded-brand border border-brand-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {s.professional_display_name || 'Fachperson'}
                        {s.status === 'revoked' && <span className="ml-2 text-xs text-red-600">(widerrufen)</span>}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.elements.length === 0
                          ? <span className="text-xs text-brand-muted">Keine Inhalte</span>
                          : dedupeElementLabels(s).map(label => (
                              <span key={label} className="text-[11px] px-2 py-0.5 rounded-full border border-brand-border text-brand-muted">{label}</span>
                            ))}
                      </div>
                    </div>
                    {s.status === 'active' && <RevokeButton caseId={caseId!} share={s} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function dedupeElementLabels(s: CaseShare): string[] {
  const sceneCount = s.elements.filter(e => e.element_type === 'scene').length
  const labels: string[] = []
  for (const e of s.elements) {
    if (e.element_type === 'scene') continue
    labels.push(SHARE_ELEMENT_LABELS[e.element_type])
  }
  if (sceneCount > 0) labels.push(`${sceneCount} Einzelszene${sceneCount === 1 ? '' : 'n'}`)
  return labels
}

function RevokeButton({ caseId, share }: { caseId: string; share: CaseShare }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => sharesApi.revoke(caseId, share.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-shares', caseId] }),
  })
  return (
    <button
      onClick={() => { if (confirm('Freigabe wirklich widerrufen? Die Fachperson hat danach keinen Zugriff mehr.')) mutation.mutate() }}
      disabled={mutation.isPending}
      className="text-xs text-red-600 hover:underline disabled:opacity-50 shrink-0"
    >
      {mutation.isPending ? 'Widerrufe …' : 'Widerrufen'}
    </button>
  )
}

// ── Verbindungen ──────────────────────────────────────────────────────────────

function ConnectionsCard() {
  const qc = useQueryClient()
  const { data: connections = [] } = useQuery({ queryKey: ['prof-connections'], queryFn: professionalsApi.connections })
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const invite = useMutation({
    mutationFn: () => professionalsApi.invite(email.trim()),
    onSuccess: (conn) => {
      qc.invalidateQueries({ queryKey: ['prof-connections'] })
      setEmail('')
      setNotice(conn.status === 'accepted'
        ? `${conn.display_name || conn.email} ist verbunden – du kannst jetzt teilen.`
        : 'Einladung gespeichert. Sobald die Fachperson einen Account erstellt, kannst du teilen.')
    },
    onError: () => setNotice('Einladung fehlgeschlagen. Bitte E-Mail prüfen.'),
  })

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy mb-1">Meine Fachpersonen</h2>
      <p className="text-xs text-brand-muted mb-3">
        Du kannst nur an Fachpersonen freigeben, die einen EchoB-Account haben. Lade jemanden per
        E-Mail ein – sobald die Person registriert ist, erscheint sie hier.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setNotice(null) }}
          placeholder="fachperson@beispiel.de"
          className="flex-1 rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={() => invite.mutate()}
          disabled={invite.isPending || !email.trim()}
          className="btn-primary !py-2 !px-4 !text-sm shrink-0"
        >
          {invite.isPending ? '…' : 'Einladen'}
        </button>
      </div>
      {notice && <p className="mt-2 text-xs text-brand-muted">{notice}</p>}

      {connections.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {connections.map(c => (
            <li key={c.email} className="flex items-center justify-between text-sm">
              <span className="text-brand-text">{c.display_name || c.email}</span>
              <span className={`text-xs ${c.status === 'accepted' ? 'text-green-700' : 'text-amber-600'}`}>
                {c.status === 'accepted' ? '✓ verbunden' : 'eingeladen'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Neue Freigabe ───────────────────────────────────────────────────────────

function NewShareCard({ caseId, accepted, shares, scenes }: {
  caseId: string
  accepted: { professional_user_id: string | null; display_name: string | null; email: string }[]
  shares: CaseShare[]
  scenes: { id: string; title: string }[]
}) {
  const qc = useQueryClient()
  const [proId, setProId] = useState('')
  const [elements, setElements] = useState<ShareElementType[]>([])
  const [sceneIds, setSceneIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  // Bestehende Freigabe der gewählten Fachperson vorbefüllen (= Bearbeiten)
  useEffect(() => {
    const existing = shares.find(s => s.professional_user_id === proId && s.status === 'active')
    if (existing) {
      setElements(existing.elements.filter(e => e.element_type !== 'scene').map(e => e.element_type))
      setSceneIds(existing.elements.filter(e => e.element_type === 'scene' && e.scene_id).map(e => e.scene_id as string))
      setMessage(existing.message ?? '')
    } else {
      setElements([]); setSceneIds([]); setMessage('')
    }
    setDone(false)
  }, [proId, shares])

  const toggle = (el: ShareElementType) =>
    setElements(prev => prev.includes(el) ? prev.filter(e => e !== el) : [...prev, el])
  const toggleScene = (id: string) =>
    setSceneIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  const selectWholeCase = () => { setElements([...CATEGORY_ELEMENTS]); setSceneIds([]) }

  const allScenes = elements.includes('all_scenes')

  const create = useMutation({
    mutationFn: () => {
      const els = [...elements]
      if (sceneIds.length > 0 && !allScenes && !els.includes('scene')) els.push('scene')
      return sharesApi.create(caseId, {
        professional_user_id: proId,
        elements: els,
        scene_ids: allScenes ? [] : sceneIds,
        message: message.trim() || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-shares', caseId] })
      setDone(true)
    },
  })

  const nothingSelected = elements.length === 0 && sceneIds.length === 0

  if (accepted.length === 0) {
    return (
      <div className="card">
        <h2 className="text-sm font-bold text-navy mb-1">Inhalte freigeben</h2>
        <p className="text-sm text-brand-muted">
          Du hast noch keine verbundene Fachperson. Lade oben jemanden ein – sobald die Person registriert ist,
          kannst du hier Inhalte freigeben.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy mb-3">Inhalte freigeben</h2>

      <label className="block text-xs font-medium text-brand-text mb-1">Fachperson</label>
      <select
        value={proId}
        onChange={e => setProId(e.target.value)}
        className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      >
        <option value="">— auswählen —</option>
        {accepted.map(c => (
          <option key={c.professional_user_id!} value={c.professional_user_id!}>{c.display_name || c.email}</option>
        ))}
      </select>

      {proId && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-medium text-brand-text">Freizugebende Inhalte</p>
            <button onClick={selectWholeCase} className="text-xs text-accent hover:underline">Gesamter Fall</button>
          </div>
          <div className="mt-2 grid sm:grid-cols-2 gap-2">
            {CATEGORY_ELEMENTS.map(el => (
              <label key={el} className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
                <input type="checkbox" checked={elements.includes(el)} onChange={() => toggle(el)} className="accent-accent" />
                {SHARE_ELEMENT_LABELS[el]}
              </label>
            ))}
          </div>

          {/* Einzelne Szenen */}
          {scenes.length > 0 && (
            <div className="mt-3 rounded-brand border border-brand-border bg-brand-bg px-3 py-2">
              <p className="text-xs font-medium text-brand-text mb-1">
                Einzelne Szenen {allScenes && <span className="text-brand-muted">(durch „Alle Szenen“ abgedeckt)</span>}
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {scenes.map(s => (
                  <label key={s.id} className={`flex items-center gap-2 text-sm ${allScenes ? 'opacity-40' : 'cursor-pointer'}`}>
                    <input type="checkbox" disabled={allScenes} checked={sceneIds.includes(s.id)} onChange={() => toggleScene(s.id)} className="accent-accent" />
                    {s.title}
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="mt-3 block text-xs font-medium text-brand-text mb-1">Nachricht (optional)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            placeholder="z. B. Worum es dir geht …"
            className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y"
          />

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending || nothingSelected}
              className="btn-primary !py-2 !px-5 !text-sm"
            >
              {create.isPending ? 'Wird freigegeben …' : done ? '✓ Freigegeben' : 'Freigeben'}
            </button>
            <span className="text-xs text-brand-muted">Nur ausgewählte Inhalte werden geteilt · jederzeit widerrufbar</span>
          </div>
        </>
      )}
    </div>
  )
}
