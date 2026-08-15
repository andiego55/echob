import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Link } from 'react-router-dom'
import { submitContact } from '@/api/contact'

/**
 * Lead-Formular für die EchoB-Wirksamkeitsstudie. Zwei Varianten:
 *  - 'fachperson': Therapeut:innen/Berater:innen/Coaches, die mitforschen wollen.
 *  - 'nutzer':     Nutzer:innen, die an der Studie teilnehmen wollen.
 * Beide gehen über die bestehende Kontakt-Pipeline an EchoB (submitContact),
 * unterschieden per `source` (forschung_fachperson / forschung_nutzer). Kein Backend
 * nötig – die Rolle steht zusätzlich als Tag in der Nachricht.
 */

type Variant = 'fachperson' | 'nutzer'

const PROFESSIONS = [
  'Psychotherapie (approbiert)',
  'Heilpraktiker:in (Psychotherapie)',
  'Psychologische Beratung',
  'Paar- & Eheberatung',
  'Coaching',
  'Sozialarbeit / Sozialpädagogik',
  'Psychiatrie',
  'Forschung / Hochschule',
  'Anderes',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent'

const COPY: Record<Variant, {
  source: string; tag: string; msgLabel: string; msgPh: string; consent: string; submit: string
}> = {
  fachperson: {
    source: 'forschung_fachperson',
    tag: 'Wirksamkeitsstudie · Fachperson',
    msgLabel: 'Ihr Schwerpunkt / Ihre Motivation',
    msgPh: 'z. B. Arbeitsfeld, Setting oder warum Sie mitforschen möchten – oder lassen Sie es leer.',
    consent:
      'Ich möchte an der EchoB-Wirksamkeitsstudie mitwirken und willige ein, dass EchoB mich dazu per E-Mail kontaktiert.',
    submit: 'Als Fachperson mitwirken',
  },
  nutzer: {
    source: 'forschung_nutzer',
    tag: 'Wirksamkeitsstudie · Nutzer:in',
    msgLabel: 'Anmerkung',
    msgPh: 'Etwas, das wir wissen sollten? Ganz freiwillig – oder lass es leer.',
    consent:
      'Ich möchte an der EchoB-Wirksamkeitsstudie teilnehmen und willige ein, dass EchoB mich dazu per E-Mail kontaktiert.',
    submit: 'An der Studie teilnehmen',
  },
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const s = error.response?.status
    if (s === 422) return 'Bitte prüfen Sie Name und E-Mail-Adresse.'
    if (s === 503) return 'Der Dienst ist gerade nicht erreichbar. Bitte versuchen Sie es später.'
    if (!error.response) return 'Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.'
  }
  return 'Etwas ist schiefgelaufen. Bitte versuchen Sie es noch einmal.'
}

export default function ResearchSignupForm({ variant }: { variant: Variant }) {
  const c = COPY[variant]
  const siez = variant === 'fachperson'
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [profession, setProfession] = useState('')
  const [note, setNote]           = useState('')
  const [consent, setConsent]     = useState(false)
  const [company, setCompany]     = useState('') // Honeypot

  const isValid = name.trim().length > 0 && EMAIL_RE.test(email) && consent

  const mutation = useMutation({ mutationFn: submitContact })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    const lines = [`[${c.tag}]`]
    if (variant === 'fachperson' && profession) lines.push(`Berufsgruppe: ${profession}`)
    if (note.trim()) lines.push('', note.trim())
    mutation.mutate({
      kind: 'general',
      name: name.trim(),
      email: email.trim(),
      message: lines.join('\n'),
      source: c.source,
      consent,
      company: company || null,
    })
  }

  if (mutation.isSuccess) {
    return (
      <div role="status" aria-live="polite"
        className="rounded-[1.25rem] border border-[#c0d8ed] bg-[#eef5fb] p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl text-accent" aria-hidden="true">✓</div>
        <p className="text-lg font-semibold text-navy">Danke – wir melden uns!</p>
        <p className="mt-2 text-sm text-brand-muted">
          {siez ? 'Wir melden uns bei Ihnen' : 'Wir melden uns bei dir'} mit den nächsten Schritten zur Studie.
        </p>
        <p className="mt-3 text-xs text-brand-muted">Notiert mit: {email.trim()}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`rs-${variant}-name`} className="mb-1.5 block text-sm font-medium text-brand-text">
            Name <span className="text-accent" aria-hidden="true">*</span>
            <span className="sr-only">(Pflichtfeld)</span>
          </label>
          <input id={`rs-${variant}-name`} type="text" required autoComplete="name" value={name}
            onChange={(e) => setName(e.target.value)} placeholder={siez ? 'Vor- und Nachname' : 'Wie dürfen wir dich ansprechen?'}
            className={inputCls} />
        </div>
        <div>
          <label htmlFor={`rs-${variant}-email`} className="mb-1.5 block text-sm font-medium text-brand-text">
            E-Mail <span className="text-accent" aria-hidden="true">*</span>
            <span className="sr-only">(Pflichtfeld)</span>
          </label>
          <input id={`rs-${variant}-email`} type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.de"
            className={inputCls} />
        </div>
      </div>

      {variant === 'fachperson' && (
        <div>
          <label htmlFor="rs-profession" className="mb-1.5 block text-sm font-medium text-brand-text">
            Berufsgruppe <span className="font-normal text-brand-muted">(optional)</span>
          </label>
          <select id="rs-profession" value={profession} onChange={(e) => setProfession(e.target.value)}
            className={`${inputCls} ${profession ? '' : 'text-brand-muted/60'}`}>
            <option value="">Bitte wählen …</option>
            {PROFESSIONS.map((p) => <option key={p} value={p} className="text-brand-text">{p}</option>)}
          </select>
        </div>
      )}

      <div>
        <label htmlFor={`rs-${variant}-note`} className="mb-1.5 block text-sm font-medium text-brand-text">
          {c.msgLabel} <span className="font-normal text-brand-muted">(optional)</span>
        </label>
        <textarea id={`rs-${variant}-note`} rows={2} value={note} maxLength={1500}
          onChange={(e) => setNote(e.target.value)} placeholder={c.msgPh}
          className={`${inputCls} resize-none`} />
      </div>

      {/* Honeypot: für Menschen unsichtbar, fängt Bots ab. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Firma
          <input type="text" tabIndex={-1} autoComplete="off" value={company}
            onChange={(e) => setCompany(e.target.value)} />
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-brand border border-brand-border bg-brand-bg/40 px-4 py-3">
        <input type="checkbox" checked={consent} required
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
        <span className="text-xs leading-relaxed text-brand-muted">
          {c.consent} Die Teilnahme ist freiwillig und jederzeit widerrufbar; es entstehen keine Kosten.{' '}
          <Link to="/datenschutz" className="underline hover:text-navy">Datenschutz</Link>.
          <span className="text-accent" aria-hidden="true"> *</span>
        </span>
      </label>

      {mutation.isError && (
        <p role="alert" aria-live="assertive"
          className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {getErrorMessage(mutation.error)}
        </p>
      )}

      <button type="submit" disabled={mutation.isPending || !isValid} className="btn-primary w-full">
        {mutation.isPending ? 'Wird gesendet…' : c.submit}
      </button>
    </form>
  )
}
