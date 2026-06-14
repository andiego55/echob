/**
 * /app/cases/:caseId/scenes/new — Szene anlegen
 * 3 Eingabemodi: Freitext, Geführte Fragen, Chat (Chat → EchoPage).
 */
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import QuickCapture from '@/components/app/QuickCapture'
import { scenesApi } from '@/api/scenes'
import type { InputMode, SceneDraft } from '@/types'

const GUIDED_QUESTIONS = [
  { key: 'what',   label: 'Was ist passiert?' },
  { key: 'said',   label: 'Was wurde gesagt oder getan?' },
  { key: 'react',  label: 'Wie hast du reagiert?' },
  { key: 'feel',   label: 'Wie hast du dich gefühlt?' },
  { key: 'after',  label: 'Was ist danach passiert?' },
  { key: 'repeat', label: 'Ist so etwas schon öfter vorgekommen?' },
]

const PATTERN_TAG_OPTIONS = [
  'Schuldumkehr', 'Grenzverletzung', 'Kontrolle', 'Isolation',
  'Nähe-Distanz-Wechsel', 'Abwertung', 'Idealisierung',
  'Wahrnehmungsverunsicherung', 'Konflikteskalation', 'Schweigen/Rückzug',
]

export default function SceneNewPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate    = useNavigate()
  const qc          = useQueryClient()

  const [mode, setMode]               = useState<InputMode | null>(null)
  const [title, setTitle]             = useState('')
  const [sceneDate, setSceneDate]     = useState('')
  const [freetext, setFreetext]       = useState('')
  const [guidedAnswers, setGuided]    = useState<Record<string, string>>({})
  const [distressScore, setDistress]  = useState<number | null>(null)
  const [tags, setTags]               = useState<string[]>([])
  const [quickOpen, setQuickOpen]     = useState(false)

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof scenesApi.create>[1]) =>
      scenesApi.create(caseId!, data),
    onSuccess: (scene) => {
      qc.invalidateQueries({ queryKey: ['scenes', caseId] })
      navigate(`/app/cases/${caseId}/scenes/${scene.id}`)
    },
  })

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  const handleEntry = (key: string) => {
    if (key === 'chat') { navigate(`/app/cases/${caseId}/scenes/echo`); return }
    if (key === 'voice') { setQuickOpen(true); setMode('freetext'); return }
    setQuickOpen(false)
    setMode(key as InputMode)
  }

  // Von Echo strukturierten Entwurf ins Formular übernehmen (Nutzer prüft + speichert).
  const applyDraft = (d: SceneDraft) => {
    if (d.title) setTitle(d.title)
    if (d.scene_date) setSceneDate(d.scene_date)
    const desc = [d.description, d.user_reaction ? `Meine Reaktion: ${d.user_reaction}` : '']
      .filter(Boolean).join('\n\n')
    if (desc) setFreetext(desc)
    if (d.distress_score) setDistress(d.distress_score)
    if (d.pattern_tags?.length) setTags((prev) => Array.from(new Set([...prev, ...d.pattern_tags])))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const description = mode === 'guided'
      ? Object.entries(guidedAnswers).map(([k, v]) => {
          const q = GUIDED_QUESTIONS.find((q) => q.key === k)
          return q && v ? `${q.label}\n${v}` : ''
        }).filter(Boolean).join('\n\n')
      : freetext

    mutation.mutate({
      title:         title || 'Szene ohne Titel',
      scene_date:    sceneDate || undefined,
      description:   description || undefined,
      distress_score: distressScore ?? undefined,
      pattern_tags:  tags,
      input_mode:    mode ?? 'freetext',
    })
  }

  // Modus-Auswahl
  if (!mode) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="mx-auto max-w-[640px] px-6 py-10">
          <span className="label">Szene anlegen</span>
          <h1 className="mt-2 text-xl font-bold text-navy mb-2">Was möchtest du festhalten?</h1>
          <p className="text-sm text-brand-muted mb-4">
            Eine Szene kann alles sein, was zur Beziehung gehört: ein konkretes Ereignis, eine
            Beobachtung an dir selbst oder der anderen Person, ein Gedanke oder eine Vermutung.
            Auch Kleinigkeiten zählen.
          </p>
          <p className="text-sm text-brand-muted mb-8">
            Wähle einen Eingabemodus. Du kannst jederzeit wechseln.
          </p>
          <div className="grid gap-4">
            {[
              { key: 'freetext', icon: '✍️', label: 'Freitext', desc: 'Beschreibe frei, was du festhalten willst – Situation, Beobachtung oder Gedanke.' },
              { key: 'voice',    icon: '🎙️', label: 'Schnell erfassen (Sprache/Text)', desc: 'Sprich oder füge Text ein – Echo macht daraus einen strukturierten Entwurf, den du prüfst.' },
              { key: 'guided',   icon: '❓', label: 'Geführte Fragen', desc: 'Strukturierte Fragen – ideal für eine konkrete Situation.' },
              { key: 'chat',     icon: '💬', label: 'Mit Echo erarbeiten', desc: 'Echo hilft dir im Gespräch, deine Gedanken zu sortieren und festzuhalten.' },
            ].map(({ key, icon, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleEntry(key)}
                className="card text-left flex items-start gap-4 hover:border-accent/40 transition-all"
              >
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-semibold text-navy">{label}</p>
                  <p className="text-sm text-brand-muted">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="mx-auto max-w-[680px] px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMode(null)} className="text-sm text-brand-muted hover:text-navy transition-colors">
            ← Zurück
          </button>
          <span className="label">{mode === 'freetext' ? 'Freitext' : 'Geführte Fragen'}</span>
          {mode === 'freetext' && !quickOpen && (
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="ml-auto text-xs text-accent hover:underline"
            >
              🎙️ Schnell erfassen
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titel + Datum */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">Titel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Streit nach Besuch · Mir ist aufgefallen, dass …"
                maxLength={200}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Datum <span className="text-brand-muted font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={sceneDate}
                onChange={(e) => setSceneDate(e.target.value)}
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Beschreibung */}
          {mode === 'freetext' ? (
            <div className="space-y-4">
              {quickOpen && <QuickCapture caseId={caseId!} onDraft={applyDraft} />}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">Beschreibung</label>
                <textarea
                  value={freetext}
                  onChange={(e) => setFreetext(e.target.value)}
                  rows={7}
                  placeholder="Beschreibe, was du festhalten möchtest – ein Ereignis (was ist passiert, was wurde gesagt?), eine Beobachtung an dir oder der anderen Person, einen Gedanken oder eine Vermutung. So konkret wie möglich."
                  className="w-full rounded-brand border border-brand-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {GUIDED_QUESTIONS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-brand-text mb-1.5">{label}</label>
                  <textarea
                    value={guidedAnswers[key] ?? ''}
                    onChange={(e) => setGuided((prev) => ({ ...prev, [key]: e.target.value }))}
                    rows={2}
                    className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Belastungsscore */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Belastung <span className="font-normal text-brand-muted">(optional, falls zutreffend · 1 = wenig, 5 = sehr hoch)</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDistress(distressScore === n ? null : n)}
                  className={`w-10 h-10 rounded-brand border text-sm font-semibold transition-all ${
                    distressScore === n
                      ? 'border-accent bg-accent text-white'
                      : 'border-brand-border text-brand-muted hover:border-accent/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Muster-Tags */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Muster-Tags <span className="font-normal text-brand-muted">(optional – Hypothesen, keine Diagnosen)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PATTERN_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
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
          </div>

          {mutation.isError && (() => {
            const detail = (mutation.error as any)?.response?.data?.detail
            if (detail === 'TRIAL_SCENE_LIMIT' || detail === 'TRIAL_EXPIRED') {
              return (
                <div className="rounded-brand border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    {detail === 'TRIAL_EXPIRED' ? 'Testzeitraum abgelaufen' : 'Szenen-Limit erreicht'}
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    {detail === 'TRIAL_EXPIRED'
                      ? 'Dein kostenloser Testzugang ist abgelaufen. Wähle ein Abo um fortzufahren.'
                      : 'Im Testzugang sind maximal 5 Szenen möglich. Upgrade für unbegrenzte Szenen.'}
                  </p>
                  <Link to="/app/upgrade" className="text-xs font-semibold text-accent hover:underline">
                    Jetzt abonnieren →
                  </Link>
                </div>
              )
            }
            return (
              <p role="alert" className="text-sm text-red-600">
                Szene konnte nicht gespeichert werden. Bitte versuche es erneut.
              </p>
            )
          })()}

          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Wird gespeichert …' : 'Szene speichern'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-outline">
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
