/**
 * /app/cases/:caseId/onboarding — Geführtes Onboarding
 * Lädt bestehende Antworten vor und speichert beim Abschluss.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'
import { onboardingApi, type OnboardingAnswers } from '@/api/onboarding'

// ── Schritte ──────────────────────────────────────────────────────────────────

type FieldKey = keyof OnboardingAnswers

interface TextStep {
  type: 'text'
  key: FieldKey
  label: string
  placeholder: string
  hint: string
  optional?: boolean
}

interface SliderStep {
  type: 'slider'
  key: 'distress_score'
  label: string
  hint: string
  min: number
  max: number
  minLabel: string
  maxLabel: string
}

type Step = TextStep | SliderStep

const STEPS: Step[] = [
  {
    type: 'text',
    key: 'person_name',
    label: 'Wie möchtest du die Person in dieser App nennen?',
    placeholder: 'z. B. „Alex", „die Ex", „Mutter" …',
    hint: '',
  },
  {
    type: 'text',
    key: 'relationship_description',
    label: 'Wie würdest du diese Beziehung beschreiben?',
    placeholder:
      'Ist sie eher intensiv, distanziert, wechselhaft, konflikthaft? Was macht sie schwer einzuordnen?',
    hint: 'Beschreibe in eigenen Worten – es gibt keine richtigen oder falschen Antworten.',
  },
  {
    type: 'text',
    key: 'main_burden',
    label: 'Was belastet dich in dieser Beziehung am meisten?',
    placeholder:
      'z. B. Ich fühle mich ständig schuldig. Ich weiß nicht, ob ich überreagiere …',
    hint: 'Schreib, was dich innerlich am meisten beschäftigt.',
  },
  {
    type: 'text',
    key: 'typical_scenes',
    label: 'Welche Situationen oder Konflikte wiederholen sich immer wieder?',
    placeholder:
      'z. B. Streit nach Nähe, Rückzug nach Konflikten, Vorwürfe nach Treffen mit anderen …',
    hint: 'Wiederkehrende Muster sagen oft mehr als einzelne Ereignisse.',
  },
  {
    type: 'slider',
    key: 'distress_score',
    label: 'Wie stark belastet dich diese Beziehung aktuell?',
    hint: 'Eine ehrliche Einschätzung hilft Echo, deinen Fall besser zu verstehen.',
    min: 1,
    max: 10,
    minLabel: 'Kaum belastet',
    maxLabel: 'Extrem belastet',
  },
  {
    type: 'text',
    key: 'significant_event',
    label: 'Gibt es ein Erlebnis, das alles verändert hat oder dir besonders nahe gegangen ist?',
    placeholder: 'Ein konkretes Ereignis, das dir noch lebhaft in Erinnerung ist …',
    hint: 'Optional – du kannst diesen Schritt überspringen.',
    optional: true,
  },
]

// ── Komponente ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const initialized = useRef(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswers>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['onboarding', caseId],
    queryFn: () => onboardingApi.get(caseId!),
    enabled: !!caseId,
    staleTime: 0,
  })

  // Vorhandene Antworten einmalig laden, sobald Query abgeschlossen
  useEffect(() => {
    if (initialized.current || isLoading) return
    initialized.current = true
    if (existing) {
      setAnswers({
        person_name:              existing.person_name ?? '',
        relationship_description: existing.relationship_description ?? '',
        main_burden:              existing.main_burden ?? '',
        typical_scenes:           existing.typical_scenes ?? '',
        significant_event:        existing.significant_event ?? '',
        distress_score:           existing.distress_score ?? 5,
      })
    }
  }, [isLoading, existing])

  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1
  const isReturning = !!existing?.completed_at

  const getValue = (): string => {
    if (step.type === 'slider') {
      return String(answers.distress_score ?? 5)
    }
    return String(answers[step.key] ?? '')
  }

  const canProceed = (): boolean => {
    if (step.type === 'slider') return true
    if (step.optional) return true
    return (answers[step.key as FieldKey] as string ?? '').trim().length > 0
  }

  const handleChange = (value: string) => {
    if (step.type === 'slider') {
      setAnswers(prev => ({ ...prev, distress_score: Number(value) }))
    } else {
      setAnswers(prev => ({ ...prev, [step.key]: value }))
    }
  }

  const handleNext = () => {
    if (!isLast) {
      setCurrentStep(s => s + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    setSaveError(false)
    try {
      const saved = await onboardingApi.save(caseId!, answers)
      qc.setQueryData(['onboarding', caseId], saved)
      navigate(`/app/cases/${caseId}/scenes`)
    } catch {
      setSaveError(true)
      setSaving(false)
    }
  }

  // Zwischenspeichern ohne Weiterspringen – in jedem Schritt möglich.
  const handleSave = async () => {
    setSaving(true)
    setSaveError(false)
    try {
      const saved = await onboardingApi.save(caseId!, answers)
      qc.setQueryData(['onboarding', caseId], saved)
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2000)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <CaseNav caseId={caseId!} />
        <div className="px-6 py-10 text-sm text-brand-muted">Wird geladen …</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[680px] px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <span className="label">
            {isReturning ? 'Onboarding bearbeiten' : 'Onboarding'} · Schritt {currentStep + 1} von {STEPS.length}
          </span>
          <h1 className="mt-2 text-xl font-bold text-navy">
            {isReturning ? 'Deine Angaben aktualisieren' : 'Lass uns deinen Fall besser verstehen'}
          </h1>
          {isReturning && (
            <p className="mt-1 text-sm text-brand-muted">
              Deine früheren Antworten sind bereits eingetragen.
            </p>
          )}
        </div>

        {/* Fortschrittsbalken */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentStep ? 'bg-accent' : i === currentStep ? 'bg-accent/60' : 'bg-brand-border'
              }`}
            />
          ))}
        </div>

        {/* Aktuelle Frage */}
        <div className="card">
          <label className="block text-base font-semibold text-navy mb-1">
            {step.label}
            {step.type !== 'slider' && step.optional && (
              <span className="ml-2 text-xs font-normal text-brand-muted">(optional)</span>
            )}
          </label>

          {step.hint && (
            <p className="text-xs text-brand-muted mb-4">{step.hint}</p>
          )}

          {/* Pseudonym-Hinweis nur bei person_name */}
          {step.key === 'person_name' && (
            <div className="mb-4 flex items-start gap-2.5 rounded-brand border border-blue-200 bg-blue-50 px-4 py-3">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">ℹ</span>
              <p className="text-xs text-blue-800">
                <strong>Empfehlung: Verwende ein Pseudonym.</strong> Der echte Name wird nirgendwo
                benötigt. Ein Pseudonym schützt die Privatsphäre der Person und erleichtert es dir,
                sachlich zu bleiben. Du kannst den Namen jederzeit hier ändern.
              </p>
            </div>
          )}

          {step.type === 'text' ? (
            <textarea
              value={getValue()}
              onChange={e => handleChange(e.target.value)}
              rows={step.key === 'person_name' ? 1 : 5}
              placeholder={step.placeholder}
              className="w-full rounded-brand border border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              style={step.key === 'person_name' ? { resize: 'none' } : undefined}
            />
          ) : (
            <SliderInput
              value={Number(getValue())}
              min={step.min}
              max={step.max}
              minLabel={step.minLabel}
              maxLabel={step.maxLabel}
              onChange={v => handleChange(String(v))}
            />
          )}

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(s => s - 1)}
                className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-brand-bg transition-colors"
              >
                Zurück
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
            >
              {isLast ? (saving ? 'Wird gespeichert …' : 'Abschließen') : 'Weiter'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-brand border border-brand-border bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-brand-bg transition-colors disabled:opacity-50"
            >
              Speichern
            </button>
            {savedOk && <span className="text-xs font-medium text-green-600">✓ Gespeichert</span>}
            {step.type !== 'slider' && !step.optional && (
              <button
                type="button"
                onClick={() => setCurrentStep(s => s + 1)}
                className="text-sm text-brand-muted hover:text-brand-text transition-colors"
              >
                Überspringen
              </button>
            )}
          </div>

          {saveError && (
            <p className="mt-3 text-xs text-red-600">
              Speichern fehlgeschlagen. Bitte versuche es erneut.
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-6 rounded-brand bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs text-amber-800">
            <strong>Hinweis:</strong> EchoB stellt keine Diagnosen. Deine Antworten helfen dabei,
            Beziehungsmuster zu strukturieren – nicht, die andere Person zu bewerten oder zu pathologisieren.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

// ── Slider-Komponente ─────────────────────────────────────────────────────────

function SliderInput({ value, min, max, minLabel, maxLabel, onChange }: {
  value: number
  min: number
  max: number
  minLabel: string
  maxLabel: string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  const color = value <= 3 ? '#4ade80' : value <= 6 ? '#fb923c' : '#f87171'

  return (
    <div className="py-2">
      <div className="flex items-center justify-center mb-4">
        <span
          className="text-4xl font-bold tabular-nums transition-all"
          style={{ color }}
        >
          {value}
        </span>
        <span className="text-lg text-brand-muted ml-1 mt-2">/ {max}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${pct}%, var(--color-brand-border, #e5e7eb) ${pct}%)`,
        }}
      />

      <div className="flex justify-between mt-2 text-xs text-brand-muted">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>

      <div className="flex justify-between mt-2">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-6 h-6 rounded-full text-xs font-medium transition-colors ${
              n === value
                ? 'bg-accent text-white'
                : 'text-brand-muted hover:text-navy hover:bg-brand-bg'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
