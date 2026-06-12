/**
 * /app/cases/:caseId/person-profile — Personenprofil
 * Fremdeinschätzung der anderen Person in 7 Modulen mit Scoring und Zusammenfassung.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { personProfileApi } from '@/api/personProfile'
import { casesApi } from '@/api/cases'
import { PERSON_PROFILE_MODULES } from '@/utils/personProfileModules'
import type { PersonProfileModuleConfig } from '@/utils/personProfileModules'
import { computePersonModuleScores, scoreLevel, buildPersonSummaryText } from '@/utils/personProfileScoring'
import { RELATIONSHIP_TYPE_LABELS } from '@/types'

const LIKERT_LABELS = ['', 'Trifft gar nicht zu', 'Trifft eher nicht zu', 'Teils/teils', 'Trifft eher zu', 'Trifft sehr zu']

export default function PersonProfilePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const qc = useQueryClient()
  const [activeModule, setActiveModule] = useState(PERSON_PROFILE_MODULES[0].id)
  const [showSummary, setShowSummary] = useState(false)
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({})
  const [isDirty, setIsDirty] = useState(false)

  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesApi.get(caseId!),
    enabled: !!caseId,
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['person-profile', caseId],
    queryFn: () => personProfileApi.get(caseId!),
    enabled: !!caseId,
  })

  useEffect(() => {
    if (profile?.modules) {
      setAnswers(profile.modules as Record<string, Record<string, unknown>>)
    }
  }, [profile?.id])

  const saveMutation = useMutation({
    mutationFn: (moduleId: string) => {
      const moduleData = answers[moduleId] ?? {}
      const moduleCfg = PERSON_PROFILE_MODULES.find(m => m.id === moduleId)!
      const scores = computePersonModuleScores(
        moduleData as Record<string, number>,
        moduleCfg.scoreDimensions.map(d => ({
          key: d.key,
          itemKeys: d.itemKeys,
          reverseKeys: d.reverseKeys,
        })),
      )
      const dataWithScores = { ...moduleData, ...scores }
      return personProfileApi.saveModule(caseId!, moduleId, dataWithScores)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['person-profile', caseId] })
      // Scores sind nur in den Server-Daten – lokalen State damit aktualisieren
      if (data?.modules) {
        setAnswers(data.modules as Record<string, Record<string, unknown>>)
      }
      setIsDirty(false)
    },
  })

  const currentModuleCfg = PERSON_PROFILE_MODULES.find(m => m.id === activeModule)!
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
  const currentIdx = PERSON_PROFILE_MODULES.findIndex(m => m.id === activeModule)
  const canGoNext = currentIdx < PERSON_PROFILE_MODULES.length - 1
  const canGoPrev = currentIdx > 0

  const handleNext = async () => {
    if (isDirty) await saveMutation.mutateAsync(activeModule)
    if (canGoNext) setActiveModule(PERSON_PROFILE_MODULES[currentIdx + 1].id)
  }

  const handlePrev = async () => {
    if (isDirty) await saveMutation.mutateAsync(activeModule)
    if (canGoPrev) setActiveModule(PERSON_PROFILE_MODULES[currentIdx - 1].id)
  }

  const relationshipLabel = caseData ? RELATIONSHIP_TYPE_LABELS[caseData.relationship_type] : ''

  if (isLoading) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="px-6 py-10 text-sm text-brand-muted">Wird geladen …</div>
      </AppShell>
    )
  }

  if (showSummary) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <PersonProfileSummaryView
          caseId={caseId!}
          modules={answers}
          summaryText={profile?.summary_text ?? null}
          relationshipLabel={relationshipLabel}
          onEdit={() => setShowSummary(false)}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <span className="label">Fremdeinschätzung</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">
            Profil der anderen Person
            {relationshipLabel && <span className="text-lg font-normal text-brand-muted ml-2">– {relationshipLabel}</span>}
          </h1>
          <p className="mt-2 text-sm text-brand-muted max-w-2xl">
            Hier beschreibst du, wie du die andere Person in dieser Beziehung wahrnimmst.
            Es geht nicht darum, sie zu bewerten oder zu diagnostizieren – sondern darum, deine eigene Erfahrung
            in Worte zu fassen, damit EchoB die Dynamik besser verstehen kann.
          </p>
          <div className="mt-3 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-2xl">
            Diese Einschätzung basiert auf deiner subjektiven Wahrnehmung und ist keine Diagnose der anderen Person.
            Du kannst einzelne Fragen überspringen.
          </div>
        </div>

        {/* Fortschrittsanzeige */}
        <div className="mb-6 max-w-2xl">
          <div className="flex items-center justify-between text-xs text-brand-muted mb-1">
            <span>{completedModules.length} von {PERSON_PROFILE_MODULES.length} Modulen gespeichert</span>
            <span>{Math.round((completedModules.length / PERSON_PROFILE_MODULES.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(completedModules.length / PERSON_PROFILE_MODULES.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Modul-Navigation (Sidebar) */}
          <aside className="hidden md:block w-52 flex-shrink-0">
            <nav className="space-y-1 sticky top-20">
              {PERSON_PROFILE_MODULES.map((mod) => (
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
            <PersonProfileModuleForm
              cfg={currentModuleCfg}
              answers={currentAnswers}
              onAnswer={setAnswer}
              onToggleMulti={toggleMulti}
            />

            {saveMutation.isError && (
              <p className="mt-3 text-sm text-red-600">Speichern fehlgeschlagen. Bitte versuche es erneut.</p>
            )}

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => saveMutation.mutate(activeModule)}
                disabled={saveMutation.isPending}
                className="btn-primary !py-2 !px-5 !text-sm"
              >
                {saveMutation.isPending ? 'Wird gespeichert …' : 'Speichern'}
              </button>
              {canGoPrev && (
                <button onClick={handlePrev} className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-sm">
                  ← Zurück
                </button>
              )}
              {canGoNext && (
                <button onClick={handleNext} className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2 !px-4 !text-sm">
                  Zum nächsten Modul →
                </button>
              )}
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

// ── Modul-Formular ─────────────────────────────────────────────────────────────

function PersonProfileModuleForm({
  cfg,
  answers,
  onAnswer,
  onToggleMulti,
}: {
  cfg: PersonProfileModuleConfig
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
      </div>

      {/* Auswahlfelder */}
      {cfg.selections?.map((sel) => (
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

// ── Zusammenfassung ────────────────────────────────────────────────────────────

function PersonProfileSummaryView({
  caseId,
  modules,
  summaryText,
  relationshipLabel,
  onEdit,
}: {
  caseId: string
  modules: Record<string, Record<string, unknown>>
  summaryText: string | null
  relationshipLabel: string
  onEdit: () => void
}) {
  const qc = useQueryClient()
  const [editingText, setEditingText] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)

  const saveTextMutation = useMutation({
    mutationFn: (text: string) => personProfileApi.saveSummaryText(caseId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person-profile', caseId] })
      setEditingText(false)
      setShowAiSuggestion(false)
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => personProfileApi.generateSummary(caseId),
    onSuccess: (data) => {
      setAiSuggestion(data.summary_text)
      setShowAiSuggestion(true)
    },
  })

  const summaryLines = buildPersonSummaryText(modules)

  const scoreRows: { label: string; value: number | null; key: string }[] = [
    { key: 'emotional_volatility', label: 'Emotionale Volatilität', value: (modules.emotional_reactions?.emotional_volatility as number | null) ?? null },
    { key: 'empathy_deficit', label: 'Wahrgenommenes Empathiedefizit', value: (modules.empathy?.empathy_deficit as number | null) ?? null },
    { key: 'grandiosity', label: 'Wahrgenommene Grandiosität', value: (modules.self_image?.grandiosity as number | null) ?? null },
    { key: 'manipulation_score', label: 'Manipulationsverhalten', value: (modules.manipulation?.manipulation_score as number | null) ?? null },
    { key: 'attachment_instability', label: 'Bindungsinstabilität', value: (modules.attachment_patterns?.attachment_instability as number | null) ?? null },
    { key: 'impulsivity_score', label: 'Impulsivität', value: (modules.impulsivity?.impulsivity_score as number | null) ?? null },
    { key: 'relational_burden', label: 'Wahrgenommene Beziehungsbelastung', value: (modules.overall_impression?.relational_burden as number | null) ?? null },
  ]

  const hasAnyData = scoreRows.some(r => r.value != null)

  return (
    <div className="mx-auto max-w-[780px] px-6 py-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <span className="label">Personenprofil</span>
          <h1 className="mt-1 text-xl font-bold text-navy">
            Deine Einschätzung
            {relationshipLabel && <span className="text-base font-normal text-brand-muted ml-2">– {relationshipLabel}</span>}
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Diese Einschätzung basiert auf deiner subjektiven Wahrnehmung und ist keine Diagnose der anderen Person.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onEdit} className="btn-outline !py-2 !px-4 !text-sm">
            Module bearbeiten
          </button>
          <Link to={`/app/cases/${caseId}/person-profile/echo`} className="btn-primary !py-2 !px-4 !text-sm">
            Mit Echo besprechen
          </Link>
        </div>
      </div>

      {!hasAnyData && (
        <div className="card text-center py-8 text-brand-muted text-sm">
          <p>Noch keine Daten vorhanden. Fülle die Module aus, um eine Zusammenfassung zu sehen.</p>
          <button onClick={onEdit} className="mt-4 btn-primary !py-2 !px-4 !text-sm">
            Module ausfüllen
          </button>
        </div>
      )}

      {/* Gespeicherte Beschreibung (editierbar) */}
      {summaryText && (
        <div className="card mb-6 border-accent/30 bg-accent/5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-navy">Gespeicherte Beschreibung</p>
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

      {/* KI-Zusammenfassung generieren */}
      {hasAnyData && (
        <div className="card mb-6 border-brand-border">
          <p className="text-sm font-semibold text-navy mb-2">KI-Zusammenfassung generieren</p>
          <p className="text-xs text-brand-muted mb-3">
            EchoB kann auf Basis deiner Modul-Antworten eine erste vorsichtige Beschreibung formulieren.
            Du kannst sie dann prüfen und bei Bedarf speichern.
          </p>

          {!showAiSuggestion ? (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-outline !py-2 !px-4 !text-sm disabled:opacity-50"
            >
              {generateMutation.isPending ? 'Wird generiert …' : 'KI-Zusammenfassung generieren'}
            </button>
          ) : aiSuggestion ? (
            <div>
              <div className="rounded-brand border border-brand-border bg-brand-bg px-4 py-3 mb-3">
                <p className="text-sm text-brand-text whitespace-pre-wrap">{aiSuggestion}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => saveTextMutation.mutate(aiSuggestion)}
                  disabled={saveTextMutation.isPending}
                  className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
                >
                  {saveTextMutation.isPending ? 'Wird gespeichert …' : 'Beschreibung speichern'}
                </button>
                <button
                  onClick={() => { setShowAiSuggestion(false); setAiSuggestion(null) }}
                  className="btn-outline !py-2 !px-4 !text-sm"
                >
                  Verwerfen
                </button>
              </div>
            </div>
          ) : null}

          {generateMutation.isError && (
            <p className="mt-2 text-xs text-red-600">Generierung fehlgeschlagen. Bitte versuche es erneut.</p>
          )}
        </div>
      )}

      {hasAnyData && (
        <>
          {/* Textliche Zusammenfassung */}
          {summaryLines.length > 0 && (
            <div className="card mb-6 space-y-3">
              <p className="text-sm font-semibold text-navy">Zusammenfassung deiner Einschätzung</p>
              {summaryLines.map((line, i) => (
                <p key={i} className="text-sm text-brand-text" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ))}
              <p className="text-xs text-brand-muted/70 pt-2 border-t border-brand-border">
                Diese Einschätzung basiert auf deinen Angaben zu der anderen Person und ist vorläufig.
                Sie ist keine Diagnose und stellt keine professionelle Beurteilung dar.
              </p>
            </div>
          )}

          {/* Score-Balken */}
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
