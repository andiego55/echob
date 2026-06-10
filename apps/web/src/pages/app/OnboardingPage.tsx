/**
 * /app/cases/:caseId/onboarding — Onboarding-Dialog
 * Geführte Fragen nach der Fallanlage. MVP: einfaches Formular ohne Live-Echo.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '@/components/app/AppShell'
import CaseNav from '@/components/app/CaseNav'

const QUESTIONS = [
  {
    key: 'relationship_description' as const,
    label: 'Wie würdest du die Beziehung insgesamt beschreiben?',
    placeholder:
      'Ist die Beziehung eher intensiv, distanziert, wechselhaft oder konflikthaft? Was macht sie schwer einzuordnen?',
    hint: 'Beschreibe in eigenen Worten – es gibt keine richtigen oder falschen Antworten.',
  },
  {
    key: 'typical_scenes' as const,
    label: 'Was sind typische Szenen oder Situationen, die sich in dieser Beziehung wiederholen?',
    placeholder: 'z.B. Streit nach Nähe, Rückzug nach Konflikten, Vorwürfe nach Treffen mit anderen …',
    hint: 'Typische Muster sind oft hilfreicher als einzelne Ereignisse.',
  },
  {
    key: 'main_burden' as const,
    label: 'Was stört dich besonders oder belastet dich am meisten?',
    placeholder: 'z.B. Ich fühle mich ständig schuldig. Ich weiß nicht mehr, ob ich übertreibe …',
    hint: 'Schreib, was dich innerlich am meisten beschäftigt.',
  },
  {
    key: 'significant_event' as const,
    label: 'Welches Ereignis ist dir besonders nahe gegangen?',
    placeholder: 'Ein konkretes Erlebnis, das dir noch im Gedächtnis geblieben ist …',
    hint: 'Optional – du kannst das auch überspringen.',
    optional: true,
  },
  {
    key: 'memorable_scenes' as const,
    label: 'Gibt es Szenen, die dir besonders in Erinnerung geblieben sind?',
    placeholder: 'Weitere Situationen oder Momente …',
    hint: 'Optional – du kannst hier weitere Szenen notieren.',
    optional: true,
  },
]

type Answers = Record<string, string>

export default function OnboardingPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [saving, setSaving] = useState(false)

  const q = QUESTIONS[currentStep]
  const isLast = currentStep === QUESTIONS.length - 1

  const handleNext = () => {
    if (!isLast) {
      setCurrentStep((s) => s + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    // TODO: POST /api/v1/cases/:caseId/onboarding
    // Vorerst: direkt zur Szenen-Seite navigieren
    setTimeout(() => {
      navigate(`/app/cases/${caseId}/scenes`)
    }, 400)
  }

  const canProceed = q.optional || (answers[q.key]?.trim().length ?? 0) > 0

  return (
    <AppShell>
      <CaseNav caseId={caseId!} />

      <div className="mx-auto max-w-[680px] px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <span className="label">Onboarding · Schritt {currentStep + 1} von {QUESTIONS.length}</span>
          <h1 className="mt-2 text-xl font-bold text-navy">Lass uns deinen Fall besser verstehen</h1>
        </div>

        {/* Fortschritt */}
        <div className="flex gap-1.5 mb-8">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < currentStep ? 'bg-accent' : i === currentStep ? 'bg-accent/60' : 'bg-brand-border'
              }`}
            />
          ))}
        </div>

        {/* Aktuelle Frage */}
        <div className="card">
          <label className="block text-base font-semibold text-navy mb-1">
            {q.label}
            {q.optional && <span className="ml-2 text-xs font-normal text-brand-muted">(optional)</span>}
          </label>
          <p className="text-xs text-brand-muted mb-4">{q.hint}</p>

          <textarea
            value={answers[q.key] ?? ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
            rows={5}
            placeholder={q.placeholder}
            className="w-full rounded-brand border border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />

          <div className="mt-4 flex gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="btn-outline !py-2 !px-4 !text-sm"
              >
                Zurück
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || saving}
              className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
            >
              {saving ? 'Wird gespeichert …' : isLast ? 'Onboarding abschließen' : 'Weiter'}
            </button>
            {!q.optional && (
              <button
                type="button"
                onClick={handleNext}
                className="text-sm text-brand-muted hover:text-brand-text transition-colors"
              >
                Überspringen
              </button>
            )}
          </div>
        </div>

        {/* Hinweis */}
        <div className="mt-6 rounded-brand bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs text-amber-800">
            <strong>Hinweis:</strong> EchoB stellt keine Diagnosen. Deine Antworten helfen dabei,
            Beziehungsmuster zu strukturieren – nicht, die andere Person zu bewerten.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
