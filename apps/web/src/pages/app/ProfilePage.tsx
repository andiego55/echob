/**
 * /app/profile — Mein Beziehungsprofil
 * Selbstbeschreibung in 9 Modulen mit Scoring und Zusammenfassung.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { profileApi } from '@/api/profile'
import { PROFILE_MODULES } from '@/utils/profileModules'
import type { ProfileModuleConfig } from '@/utils/profileModules'
import { computeModuleScores, computeResourcesIndex, scoreLevel, buildSummaryText } from '@/utils/profileScoring'

const SAFETY_STATUS_INFO: Record<string, { label: string; cls: string; show: boolean }> = {
  no_indication:       { label: 'Keine Sicherheitshinweise', cls: 'bg-green-50 border-green-200 text-green-800', show: false },
  unclear:             { label: 'Sicherheitsstatus unklar', cls: 'bg-yellow-50 border-yellow-200 text-yellow-800', show: false },
  heightened_attention:{ label: 'Erhöhte Aufmerksamkeit', cls: 'bg-orange-50 border-orange-200 text-orange-800', show: true },
  acute_concern:       { label: 'Akute Sicherheitsbedenken', cls: 'bg-red-50 border-red-200 text-red-800', show: true },
}

const LIKERT_LABELS = ['', 'Trifft gar nicht zu', 'Trifft eher nicht zu', 'Teils/teils', 'Trifft eher zu', 'Trifft sehr zu']

export default function ProfilePage() {
  const qc = useQueryClient()
  const [activeModule, setActiveModule] = useState(PROFILE_MODULES[0].id)
  const [showSummary, setShowSummary] = useState(false)
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })

  useEffect(() => {
    if (profile?.modules) {
      setAnswers(profile.modules as Record<string, Record<string, unknown>>)
    }
    if (profile?.display_name) {
      setNameInput(profile.display_name)
    }
  }, [profile?.id])

  const saveMutation = useMutation({
    mutationFn: (moduleId: string) => {
      const moduleData = answers[moduleId] ?? {}
      const moduleCfg = PROFILE_MODULES.find(m => m.id === moduleId)!
      // Scores berechnen
      const scores = computeModuleScores(
        moduleData as Record<string, number>,
        moduleCfg.scoreDimensions.map(d => ({
          key: d.key,
          itemKeys: d.itemKeys,
          reverseKeys: d.reverseKeys,
        })),
      )
      // Ressourcen-Index
      if (moduleId === 'resources') {
        scores['resources_index'] = computeResourcesIndex(scores)
      }
      const dataWithScores = { ...moduleData, ...scores }

      return profileApi.saveModule(moduleId, dataWithScores)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      if (data?.modules) {
        setAnswers(data.modules as Record<string, Record<string, unknown>>)
      }
      setIsDirty(false)
    },
  })

  const saveNameMutation = useMutation({
    mutationFn: (name: string) => profileApi.saveDisplayName(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2500)
    },
  })

  const currentModuleCfg = PROFILE_MODULES.find(m => m.id === activeModule)!
  const currentAnswers = (answers[activeModule] ?? {}) as Record<string, unknown>

  const setAnswer = (key: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [activeModule]: { ...(prev[activeModule] ?? {}), [key]: value } }))
    setIsDirty(true)
  }

  const toggleMulti = (key: string, value: string) => {
    const prev = (currentAnswers[key] as string[] | undefined) ?? []
    const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    setAnswer(key, next)
  }

  const completedModules = profile?.completed_modules ?? []
  const safetyStatus = profile?.safety_status ?? 'no_indication'
  const safetyInfo = SAFETY_STATUS_INFO[safetyStatus]

  const currentIdx = PROFILE_MODULES.findIndex(m => m.id === activeModule)
  const canGoNext = currentIdx < PROFILE_MODULES.length - 1
  const canGoPrev = currentIdx > 0

  const handleNext = async () => {
    if (isDirty) await saveMutation.mutateAsync(activeModule)
    if (canGoNext) setActiveModule(PROFILE_MODULES[currentIdx + 1].id)
  }

  const handlePrev = async () => {
    if (isDirty) await saveMutation.mutateAsync(activeModule)
    if (canGoPrev) setActiveModule(PROFILE_MODULES[currentIdx - 1].id)
  }

  if (isLoading) {
    return <AppShell><div className="px-6 py-10 text-sm text-brand-muted">Wird geladen …</div></AppShell>
  }

  if (showSummary) {
    return (
      <AppShell>
        <SummaryView
          modules={answers}
          safetyStatus={safetyStatus}
          summaryText={profile?.summary_text ?? null}
          onEdit={() => setShowSummary(false)}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <span className="label">Selbstbeschreibung</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">Mein Beziehungsprofil</h1>
          <p className="mt-2 text-sm text-brand-muted max-w-2xl">
            Dein Beziehungsprofil hilft EchoB, deine Beziehungssituationen besser einzuordnen.
            Es geht nicht darum, dich zu bewerten oder eine Diagnose zu stellen. Die Angaben helfen dabei,
            zwischen Beziehungsmustern, eigenen Reaktionsweisen, Belastung, Ressourcen und Sicherheitsaspekten zu unterscheiden.
          </p>
          <div className="mt-3 rounded-brand border border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-muted max-w-2xl">
            Du kannst einzelne Fragen überspringen. Besonders persönliche Angaben sind freiwillig.
            Du kannst deine Antworten später ändern oder löschen.
          </div>
        </div>

        {/* Sicherheitshinweis */}
        {safetyInfo.show && (
          <div className={`mb-6 rounded-brand border px-4 py-3 max-w-2xl ${safetyInfo.cls}`}>
            <p className="text-sm font-semibold mb-1">⚠ {safetyInfo.label}</p>
            <p className="text-xs">
              Deine Angaben enthalten Hinweise, dass Sicherheit eine wichtige Rolle spielen könnte.
              EchoB ersetzt keine Notfallhilfe. Wenn du akut gefährdet bist, wende dich bitte an
              lokale Notruf- oder Beratungsstellen (z.B. Notruf 110 / 112, Telefonseelsorge 0800 111 0 111).
            </p>
          </div>
        )}

        {/* Fortschrittsanzeige */}
        <div className="mb-6 max-w-2xl">
          <div className="flex items-center justify-between text-xs text-brand-muted mb-1">
            <span>{completedModules.length} von {PROFILE_MODULES.length} Modulen gespeichert</span>
            <span>{Math.round((completedModules.length / PROFILE_MODULES.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(completedModules.length / PROFILE_MODULES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Namens-Karte */}
        <div className="mb-6 max-w-2xl card">
          <p className="text-sm font-semibold text-navy mb-0.5">Wie soll Echo dich nennen?</p>
          <p className="text-xs text-brand-muted mb-3">
            Bitte verwende einen <strong>Nicknamen oder ein Pseudonym</strong> — keinen echten Namen.
            Echo spricht dich dann persönlicher an.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setNameSaved(false) }}
              placeholder="z. B. Sky, Alex, M. …"
              maxLength={50}
              className="flex-1 rounded-brand border border-brand-border bg-brand-bg px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => saveNameMutation.mutate(nameInput.trim())}
              disabled={saveNameMutation.isPending || !nameInput.trim()}
              className="rounded-brand border border-accent bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
            >
              {saveNameMutation.isPending ? 'Wird gespeichert …' : nameSaved ? '✓ Gespeichert' : 'Speichern'}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Modul-Navigation (Sidebar) */}
          <aside className="hidden md:block w-52 flex-shrink-0">
            <nav className="space-y-1 sticky top-20">
              {PROFILE_MODULES.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => { if (isDirty) saveMutation.mutate(activeModule); setActiveModule(mod.id) }}
                  className={`w-full text-left px-3 py-2 rounded-brand text-sm transition-colors flex items-center gap-2 ${
                    activeModule === mod.id
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-brand-muted hover:text-navy hover:bg-brand-border/30'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border flex-shrink-0 text-[10px] flex items-center justify-center ${
                    completedModules.includes(mod.id)
                      ? 'bg-accent border-accent text-white'
                      : 'border-brand-border'
                  }`}>
                    {completedModules.includes(mod.id) ? '✓' : ''}
                  </span>
                  {mod.shortLabel}
                </button>
              ))}
              <div className="pt-3 border-t border-brand-border mt-3">
                <button
                  onClick={() => setShowSummary(true)}
                  className="w-full text-left px-3 py-2 rounded-brand text-sm text-accent font-medium hover:bg-accent/5 transition-colors"
                >
                  Zusammenfassung →
                </button>
              </div>
            </nav>
          </aside>

          {/* Modul-Formular */}
          <div className="flex-1 min-w-0">
            <ModuleForm
              cfg={currentModuleCfg}
              answers={currentAnswers}
              onAnswer={setAnswer}
              onToggleMulti={toggleMulti}
            />

            {saveMutation.isError && (
              <p className="mt-3 text-sm text-red-600">Speichern fehlgeschlagen. Bitte versuche es erneut.</p>
            )}

            {/* Buttons */}
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => saveMutation.mutate(activeModule)}
                disabled={saveMutation.isPending}
                className="btn-primary !py-2 !px-5 !text-sm"
              >
                {saveMutation.isPending ? 'Wird gespeichert …' : 'Speichern'}
              </button>
              {canGoPrev && (
                <button onClick={handlePrev} className="btn-outline !py-2 !px-4 !text-sm">
                  ← Zurück
                </button>
              )}
              {canGoNext && (
                <button onClick={handleNext} className="btn-outline !py-2 !px-4 !text-sm">
                  Weiter →
                </button>
              )}
              <button
                onClick={() => { saveMutation.mutate(activeModule); setActiveModule(activeModule) }}
                className="text-sm text-brand-muted hover:text-navy transition-colors"
              >
                Modul überspringen
              </button>
              {!canGoNext && (
                <button
                  onClick={() => { saveMutation.mutate(activeModule); setShowSummary(true) }}
                  className="ml-auto text-sm font-medium text-accent hover:underline"
                >
                  Zusammenfassung ansehen →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── Modul-Formular ────────────────────────────────────────────────────────────

function ModuleForm({
  cfg,
  answers,
  onAnswer,
  onToggleMulti,
}: {
  cfg: ProfileModuleConfig
  answers: Record<string, unknown>
  onAnswer: (key: string, value: unknown) => void
  onToggleMulti: (key: string, value: string) => void
}) {
  return (
    <div className="card space-y-6">
      <div>
        <span className="label">{cfg.shortLabel}</span>
        <h2 className="mt-1 text-lg font-bold text-navy">{cfg.label}</h2>
        <p className="mt-1 text-sm text-brand-muted">{cfg.description}</p>
        {cfg.intro && <p className="mt-2 text-xs text-brand-muted/80 italic">{cfg.intro}</p>}
      </div>

      {/* Auswahlfelder */}
      {cfg.selections.map((sel) => (
        <div key={sel.key}>
          <p className="text-sm font-medium text-brand-text mb-2">{sel.label}</p>
          {sel.multi ? (
            <div className="flex flex-wrap gap-2">
              {sel.options.map((opt) => {
                const selected = ((answers[sel.key] as string[]) ?? []).includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onToggleMulti(sel.key, opt.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selected
                        ? 'border-accent bg-accent/10 text-accent font-medium'
                        : 'border-brand-border text-brand-muted hover:border-accent/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sel.options.map((opt) => {
                const selected = answers[sel.key] === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onAnswer(sel.key, selected ? undefined : opt.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selected
                        ? 'border-accent bg-accent/10 text-accent font-medium'
                        : 'border-brand-border text-brand-muted hover:border-accent/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* Likert-Fragen */}
      {cfg.likertItems.length > 0 && (
        <div className="space-y-4">
          {cfg.likertItems.map((item) => (
            <LikertQuestion
              key={item.key}
              itemKey={item.key}
              text={item.text}
              value={(answers[item.key] as number | undefined) ?? null}
              onChange={(v) => onAnswer(item.key, v)}
            />
          ))}
        </div>
      )}

      {/* Freitext */}
      {cfg.freeTextKey && cfg.freeTextLabel && (
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1.5">{cfg.freeTextLabel}</label>
          <textarea
            value={(answers[cfg.freeTextKey] as string | undefined) ?? ''}
            onChange={(e) => onAnswer(cfg.freeTextKey!, e.target.value)}
            rows={3}
            placeholder="Optional – du kannst diese Frage überspringen."
            className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
        </div>
      )}
    </div>
  )
}

function LikertQuestion({
  text, value, onChange,
}: {
  itemKey: string
  text: string
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="text-sm text-brand-text mb-2">{text}</p>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            title={LIKERT_LABELS[n]}
            onClick={() => onChange(value === n ? 0 : n)}
            className={`flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5 rounded-brand border text-xs transition-all ${
              value === n
                ? 'border-accent bg-accent text-white font-semibold'
                : 'border-brand-border text-brand-muted hover:border-accent/50 bg-white'
            }`}
          >
            <span className="font-semibold">{n}</span>
            <span className="text-[9px] leading-tight text-center hidden sm:block" style={{ maxWidth: 52 }}>
              {LIKERT_LABELS[n]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Zusammenfassung ───────────────────────────────────────────────────────────

function SummaryView({
  modules,
  safetyStatus,
  summaryText,
  onEdit,
}: {
  modules: Record<string, Record<string, unknown>>
  safetyStatus: string
  summaryText: string | null
  onEdit: () => void
}) {
  const qc = useQueryClient()
  const [editingText, setEditingText] = useState(false)
  const [editValue, setEditValue] = useState('')

  const saveTextMutation = useMutation({
    mutationFn: (text: string) => profileApi.saveSummaryText(text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      setEditingText(false)
    },
  })

  const safetyInfo = SAFETY_STATUS_INFO[safetyStatus]
  const summaryLines = buildSummaryText(modules)

  const scoreRows: { label: string; value: number | null; key: string }[] = [
    { key: 'distress_index', label: 'Aktueller Belastungsgrad', value: (modules.distress?.distress_index as number | null) ?? null },
    { key: 'attachment_anxiety_score', label: 'Nähebedürfnis und Verlustangst', value: (modules.attachment?.attachment_anxiety_score as number | null) ?? null },
    { key: 'attachment_avoidance_score', label: 'Rückzug und Distanzschutz', value: (modules.attachment?.attachment_avoidance_score as number | null) ?? null },
    { key: 'attachment_ambivalence_score', label: 'Ambivalenz Nähe–Distanz', value: (modules.attachment?.attachment_ambivalence_score as number | null) ?? null },
    { key: 'emotional_overwhelm_score', label: 'Emotionale Überwältigung', value: (modules.emotion_regulation?.emotional_overwhelm_score as number | null) ?? null },
    { key: 'self_soothing_score', label: 'Selbststabilisierung', value: (modules.emotion_regulation?.self_soothing_score as number | null) ?? null },
    { key: 'guilt_tendency_score', label: 'Schuld- und Verantwortungsdruck', value: (modules.guilt_shame_selfworth?.guilt_tendency_score as number | null) ?? null },
    { key: 'shame_score', label: 'Scham und Selbstabwertung', value: (modules.guilt_shame_selfworth?.shame_score as number | null) ?? null },
    { key: 'boundary_stability_score', label: 'Grenzen halten unter Druck', value: (modules.boundaries_autonomy?.boundary_stability_score as number | null) ?? null },
    { key: 'autonomy_score', label: 'Autonomieerleben', value: (modules.boundaries_autonomy?.autonomy_score as number | null) ?? null },
    { key: 'perception_uncertainty_score', label: 'Wahrnehmungsverunsicherung', value: (modules.perception_clarity?.perception_uncertainty_score as number | null) ?? null },
    { key: 'resources_index', label: 'Ressourcenindex', value: (modules.resources?.resources_index as number | null) ?? null },
  ]

  const hasAnyData = scoreRows.some(r => r.value != null)

  return (
    <div className="mx-auto max-w-[780px] px-6 py-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <span className="label">Beziehungsprofil</span>
          <h1 className="mt-1 text-xl font-bold text-navy">Deine vorläufige Selbstbeschreibung</h1>
          <p className="text-xs text-brand-muted mt-1">
            Diese Einschätzung ist vorläufig und ersetzt keine professionelle Diagnostik.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="btn-outline !py-2 !px-4 !text-sm">
            Profil bearbeiten
          </button>
          <Link to="/app/profile/echo" className="btn-primary !py-2 !px-4 !text-sm">
            Mit Echo besprechen
          </Link>
        </div>
      </div>

      {safetyInfo.show && (
        <div className={`mb-6 rounded-brand border px-4 py-3 ${safetyInfo.cls}`}>
          <p className="text-sm font-semibold mb-1">⚠ {safetyInfo.label}</p>
          <p className="text-xs">
            Deine Angaben enthalten Hinweise, dass Sicherheit eine wichtige Rolle spielen könnte.
            EchoB ersetzt keine Notfallhilfe. Bei akuter Gefahr: Notruf 110 / 112, Telefonseelsorge 0800 111 0 111 (kostenlos, 24h).
          </p>
        </div>
      )}

      {!hasAnyData && (
        <div className="card text-center py-8 text-brand-muted text-sm">
          <p>Noch keine Daten vorhanden. Fülle die Module aus, um eine Zusammenfassung zu sehen.</p>
          <button onClick={onEdit} className="mt-4 btn-primary !py-2 !px-4 !text-sm">
            Module ausfüllen
          </button>
        </div>
      )}

      {/* Gespeicherte Selbstbeschreibung (editierbar) */}
      {summaryText && (
        <div className="card mb-6 border-accent/30 bg-accent/5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-navy">Meine Selbstbeschreibung</p>
            {!editingText && (
              <button
                onClick={() => { setEditValue(summaryText); setEditingText(true) }}
                className="text-xs text-accent hover:text-navy transition-colors"
              >
                Bearbeiten
              </button>
            )}
          </div>

          {editingText ? (
            <>
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={6}
                className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => setEditingText(false)}
                  className="text-xs text-brand-muted hover:text-navy transition-colors px-3 py-1.5"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => saveTextMutation.mutate(editValue.trim())}
                  disabled={!editValue.trim() || saveTextMutation.isPending}
                  className="rounded border border-accent bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                >
                  {saveTextMutation.isPending ? 'Wird gespeichert …' : 'Speichern'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-brand-text whitespace-pre-wrap">{summaryText}</p>
          )}

          {!editingText && (
            <p className="text-xs text-brand-muted/70 pt-2 mt-2 border-t border-brand-border">
              Du kannst diese Beschreibung jederzeit manuell anpassen.
            </p>
          )}
        </div>
      )}

      {hasAnyData && (
        <>
          {/* Textliche Zusammenfassung */}
          {summaryLines.length > 0 && (
            <div className="card mb-6 space-y-3">
              <p className="text-sm font-semibold text-navy">Zusammenfassung</p>
              {summaryLines.map((line, i) => (
                <p key={i} className="text-sm text-brand-text" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ))}
              <p className="text-xs text-brand-muted/70 pt-2 border-t border-brand-border">
                Diese Einschätzung basiert auf deinen Selbstangaben und ist vorläufig. Sie ersetzt keine professionelle Beratung oder Diagnostik.
              </p>
            </div>
          )}

          {/* Score-Tabelle */}
          <div className="card mb-6">
            <p className="text-sm font-semibold text-navy mb-4">Profilwerte im Überblick</p>
            <div className="space-y-3">
              {scoreRows.map((row) => {
                if (row.value == null) return null
                const level = scoreLevel(row.value)
                return (
                  <div key={row.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-brand-text">{row.label}</span>
                      <span className="text-brand-muted font-medium">{level} ({row.value.toFixed(1)})</span>
                    </div>
                    <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/70 rounded-full transition-all"
                        style={{ width: `${((row.value - 1) / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-brand-muted/70 mt-4 pt-3 border-t border-brand-border">
              Skala: 1 = trifft gar nicht zu · 5 = trifft sehr zu · Fehlende Werte = zu wenige Antworten
            </p>
          </div>
        </>
      )}
    </div>
  )
}
