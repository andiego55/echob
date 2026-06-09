import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { joinWaitlist, type WaitlistRequest } from '@/api/waitlist'

type Interest = WaitlistRequest['interest']

const INTERESTS: { value: NonNullable<Interest>; label: string }[] = [
  { value: 'app',        label: 'Die App nutzen' },
  { value: 'coaching',   label: 'Coaching-Angebot' },
  { value: 'fachperson', label: 'Als Fachperson' },
  { value: 'alle',       label: 'Alles interessiert mich' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const s = error.response?.status
    if (s === 422) return 'Bitte gib eine gültige E-Mail-Adresse ein.'
    if (s === 503) return 'Der Dienst ist gerade nicht erreichbar. Bitte versuche es später.'
    if (!error.response) return 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.'
  }
  return 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.'
}

export default function WaitlistForm() {
  const [email, setEmail]       = useState('')
  const [interest, setInterest] = useState<Interest>(null)
  const [note, setNote]         = useState('')

  const isValidEmail = EMAIL_RE.test(email)

  const mutation = useMutation({ mutationFn: joinWaitlist })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail) return
    mutation.mutate({ email, interest, note: note || null })
  }

  if (mutation.isSuccess) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-brand border border-[#c0d8ed] bg-[#eef5fb] p-8 text-center"
      >
        <div className="mb-3 text-3xl text-accent" aria-hidden="true">✓</div>
        <p className="text-lg font-semibold text-navy">{mutation.data.message}</p>
        <p className="mt-2 text-sm text-brand-muted">{mutation.data.email}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* E-Mail */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-brand-text">
          Deine E-Mail-Adresse{' '}
          <span className="text-accent" aria-hidden="true">*</span>
          <span className="sr-only">(Pflichtfeld)</span>
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@beispiel.de"
          className="w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Interesse */}
      <div>
        <p className="mb-2 text-sm font-medium text-brand-text">
          Was interessiert dich?{' '}
          <span className="text-brand-muted font-normal">(optional)</span>
        </p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Interessenauswahl">
          {INTERESTS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={interest === value}
              onClick={() => setInterest(interest === value ? null : value)}
              className={`rounded-brand border px-4 py-2.5 text-sm text-left transition-all ${
                interest === value
                  ? 'border-accent bg-accent/10 text-accent font-medium'
                  : 'border-brand-border bg-white text-brand-muted hover:border-accent/40 hover:text-brand-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Freitext */}
      <div>
        <label htmlFor="note" className="mb-1.5 block text-sm font-medium text-brand-text">
          Möchtest du noch etwas sagen?{' '}
          <span className="text-brand-muted font-normal">(optional)</span>
        </label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder="Was bewegt dich gerade, was erhoffst du dir von EchoB?"
          className="w-full resize-none rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Fehler */}
      {mutation.isError && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
        >
          {getErrorMessage(mutation.error)}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !isValidEmail}
        className="btn-primary w-full"
      >
        {mutation.isPending ? 'Wird eingetragen…' : 'Auf die Warteliste'}
      </button>

      <p className="text-center text-xs text-brand-muted">
        Kein Spam. Jederzeit abmeldbar. Deine Daten werden nicht weitergegeben.
      </p>
    </form>
  )
}
