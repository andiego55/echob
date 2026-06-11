/**
 * /app/cases/new — Neuen Fall anlegen
 * 3 Pflichtfragen + optionales Freitextfeld.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { casesApi } from '@/api/cases'
import {
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_STATUS_LABELS,
  CONTACT_FREQUENCY_LABELS,
  type RelationshipType,
  type RelationshipStatus,
  type ContactFrequency,
} from '@/types'

export default function CaseNewPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  const [step, setStep]                   = useState(0)
  const [relType, setRelType]             = useState<RelationshipType | ''>('')
  const [relStatus, setRelStatus]         = useState<RelationshipStatus | ''>('')
  const [contactFreq, setContactFreq]     = useState<ContactFrequency | ''>('')
  const [mainConcern, setMainConcern]     = useState('')

  const mutation = useMutation({
    mutationFn: casesApi.create,
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      navigate(`/app/cases/${newCase.id}/scenes`)
    },
  })

  const steps = [
    {
      label: 'Beziehungstyp',
      question: 'Welche Beziehung möchtest du besser einordnen?',
      options: Object.entries(RELATIONSHIP_TYPE_LABELS) as [RelationshipType, string][],
      value: relType,
      onChange: (v: string) => { setRelType(v as RelationshipType); setStep(1) },
    },
    {
      label: 'Status',
      question: 'Wie ist eure aktuelle Situation?',
      options: Object.entries(RELATIONSHIP_STATUS_LABELS) as [RelationshipStatus, string][],
      value: relStatus,
      onChange: (v: string) => { setRelStatus(v as RelationshipStatus); setStep(2) },
    },
    {
      label: 'Kontakt',
      question: 'Wie häufig habt ihr aktuell Kontakt?',
      options: Object.entries(CONTACT_FREQUENCY_LABELS) as [ContactFrequency, string][],
      value: contactFreq,
      onChange: (v: string) => { setContactFreq(v as ContactFrequency); setStep(3) },
    },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!relType || !relStatus || !contactFreq) return
    mutation.mutate({
      relationship_type:   relType,
      relationship_status: relStatus,
      contact_frequency:   contactFreq,
      main_concern:        mainConcern || undefined,
    })
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[640px] px-6 py-10">
        <div className="mb-8">
          <span className="label">Fall anlegen</span>
          <h1 className="mt-2 text-2xl font-bold text-navy">Welche Beziehung möchtest du reflektieren?</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Beantworte drei kurze Fragen. Das dauert weniger als eine Minute.
          </p>
        </div>

        {/* Fortschritts-Indicator */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-brand-border'
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {steps.slice(0, step + 1).map((s, idx) => (
            <div key={idx}>
              <p className="text-sm font-semibold text-navy mb-3">{s.question}</p>
              <div className="grid gap-2">
                {s.options.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => s.onChange(value)}
                    className={`text-left px-4 py-3 rounded-brand border text-sm transition-all ${
                      s.value === value
                        ? 'border-accent bg-accent/5 text-navy font-medium'
                        : 'border-brand-border text-brand-text hover:border-accent/40 hover:bg-brand-bg'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Schritt 3: Freitext */}
          {step >= 3 && (
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">
                Was ist dein zentrales Anliegen?{' '}
                <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <textarea
                value={mainConcern}
                onChange={(e) => setMainConcern(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Zum Beispiel: Nach Konflikten zweifle ich oft an meiner Wahrnehmung. Ich möchte verstehen, ob sich bestimmte Muster wiederholen."
                className="w-full rounded-brand border border-brand-border bg-white px-4 py-3 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              />
            </div>
          )}

          {step >= 3 && (
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary"
              >
                {mutation.isPending ? 'Fall wird erstellt …' : 'Fall anlegen & loslegen'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="btn-outline"
              >
                Abbrechen
              </button>
            </div>
          )}

          {mutation.isError && (() => {
            const detail = (mutation.error as any)?.response?.data?.detail
            if (detail === 'TRIAL_CASE_LIMIT' || detail === 'TRIAL_EXPIRED') {
              return (
                <div className="rounded-brand border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    {detail === 'TRIAL_EXPIRED' ? 'Testzeitraum abgelaufen' : 'Limit des Testzugangs erreicht'}
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    {detail === 'TRIAL_EXPIRED'
                      ? 'Dein kostenloser Testzugang ist abgelaufen. Wähle ein Abo, um weiter zu machen.'
                      : 'Im Testzugang kannst du nur einen Fall anlegen. Upgrade für unbegrenzte Fälle.'}
                  </p>
                  <Link to="/app/upgrade" className="text-xs font-semibold text-accent hover:underline">
                    Jetzt abonnieren →
                  </Link>
                </div>
              )
            }
            return (
              <p role="alert" className="text-sm text-red-600">
                Fall konnte nicht erstellt werden. Bitte versuche es erneut.
              </p>
            )
          })()}
        </form>
      </div>
    </AppShell>
  )
}
