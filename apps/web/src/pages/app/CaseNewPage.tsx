/**
 * /app/cases/new — Neuen Fall anlegen
 *
 * Drei Pflichtfragen, dann ein Abschluss-Schritt: Pseudonym, Avatar und das zentrale
 * Anliegen.
 *
 * **Warum das Benennen hierher gehört.** Pseudonym und Avatar leben in den
 * Onboarding-Antworten und wurden früher auch erst dort erfragt. Bis dahin stand der
 * frische Fall in der Übersicht als „Partnerschaft" ohne Gesicht — und die Übersicht ist
 * das Erste, was man wiedersieht. Wer gerade beschrieben hat, um welche Beziehung es
 * geht, hat die Person ohnehin im Kopf; das ist der günstigste Moment, ihr einen Namen zu
 * geben.
 *
 * Beides bleibt freiwillig und jederzeit im Onboarding änderbar. Der Fall gilt dadurch
 * NICHT als eingerichtet: Das Backend lässt `completed_at` leer, damit die eigentlichen
 * Onboarding-Fragen noch kommen.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Avatar from '@/components/Avatar'
import AvatarPicker from '@/components/AvatarPicker'
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
  const [personName, setPersonName]       = useState('')
  const [avatar, setAvatar]               = useState<string | undefined>()
  const [avatarOffen, setAvatarOffen]     = useState(false)

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
      person_name:         personName.trim() || undefined,
      avatar:              avatar,
    })
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[640px] px-6 py-10">
        <div className="mb-8">
          <span className="label">Fall anlegen</span>
          <h1 className="page-title mt-2">Welche Beziehung möchtest du reflektieren?</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Drei kurze Fragen, dann gibst du der Person einen Namen. Das dauert weniger
            als eine Minute.
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

          {/* Schritt 3a: Wer ist gemeint? */}
          {step >= 3 && (
            <div>
              <label htmlFor="person-name" className="block text-sm font-semibold text-navy mb-2">
                Wie möchtest du die Person in dieser App nennen?{' '}
                <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <div className="mb-3 flex items-start gap-2.5 rounded-brand border border-blue-200 bg-blue-50 px-4 py-3">
                <span className="mt-0.5 flex-shrink-0 text-blue-500">ℹ</span>
                <p className="text-xs text-blue-800">
                  <strong>Nimm ein Pseudonym.</strong> Der echte Name wird nirgendwo
                  gebraucht. Ein Pseudonym schützt die Privatsphäre der Person und macht
                  es dir leichter, sachlich zu bleiben. Ändern kannst du es jederzeit.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Das Gesicht steht neben dem Namen, nicht darunter – die beiden
                    gehören zusammen und werden zusammen gelesen. */}
                <button
                  type="button"
                  onClick={() => setAvatarOffen(true)}
                  title={avatar ? 'Avatar ändern' : 'Avatar wählen'}
                  aria-label={avatar ? 'Avatar ändern' : 'Avatar wählen'}
                  className="flex-shrink-0 rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <Avatar value={avatar} size="lg" />
                </button>
                <input
                  id="person-name"
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  maxLength={120}
                  placeholder={'z. B. „Alex“, „die Ex“, „Mutter“ …'}
                  className="input flex-1"
                />
              </div>
              {!avatar && (
                <p className="mt-2 text-xs text-brand-muted">
                  Tipp: Tippe auf das Bild, um ein Symbol zu wählen. Das hilft, Fälle
                  später auseinanderzuhalten.
                </p>
              )}
            </div>
          )}

          {/* Schritt 3b: Freitext */}
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
                className="btn-quiet"
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

        {avatarOffen && (
          <AvatarPicker
            value={avatar}
            onSelect={(a) => setAvatar(a)}
            onClose={() => setAvatarOffen(false)}
            title="Avatar für die Person"
          />
        )}
      </div>
    </AppShell>
  )
}
