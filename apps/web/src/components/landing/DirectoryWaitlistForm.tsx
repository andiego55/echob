import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Link } from 'react-router-dom'
import { joinDirectoryWaitlist, type DirectoryWaitlistRequest } from '@/api/directoryWaitlist'

/**
 * Lead-Formular für das künftige EchoB-Fachpersonen-Verzeichnis.
 * Kostenlos & unverbindlich: Fachpersonen/Praxen/Coaches lassen sich vormerken
 * und werden sichtbar, sobald das Verzeichnis startet.
 */

const PROFESSIONS = [
  'Psychotherapie (approbiert)',
  'Heilpraktiker:in (Psychotherapie)',
  'Psychologische Beratung',
  'Paar- & Eheberatung',
  'Coaching',
  'Sozialarbeit / Sozialpädagogik',
  'Psychiatrie',
  'Anderes',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const s = error.response?.status
    if (s === 422) return 'Bitte prüfen Sie Name und E-Mail-Adresse.'
    if (s === 503) return 'Der Dienst ist gerade nicht erreichbar. Bitte versuchen Sie es später.'
    if (!error.response) return 'Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.'
  }
  return 'Etwas ist schiefgelaufen. Bitte versuchen Sie es noch einmal.'
}

const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent'

export default function DirectoryWaitlistForm() {
  const [name, setName]                   = useState('')
  const [email, setEmail]                 = useState('')
  const [organization, setOrganization]   = useState('')
  const [profession, setProfession]       = useState('')
  const [specialization, setSpecialization] = useState('')
  const [location, setLocation]           = useState('')
  const [website, setWebsite]             = useState('')
  const [phone, setPhone]                 = useState('')
  const [note, setNote]                   = useState('')
  const [consent, setConsent]             = useState(false)

  const isValid = name.trim().length > 0 && EMAIL_RE.test(email) && consent

  const mutation = useMutation({ mutationFn: joinDirectoryWaitlist })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    const payload: DirectoryWaitlistRequest = {
      name: name.trim(),
      email: email.trim(),
      consent,
      organization: organization.trim() || null,
      profession: profession || null,
      specialization: specialization.trim() || null,
      location: location.trim() || null,
      website: website.trim() || null,
      phone: phone.trim() || null,
      note: note.trim() || null,
    }
    mutation.mutate(payload)
  }

  if (mutation.isSuccess) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-[1.25rem] border border-[#c0d8ed] bg-[#eef5fb] p-8 text-center"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl text-accent" aria-hidden="true">✓</div>
        <p className="text-lg font-semibold text-navy">{mutation.data.message}</p>
        <p className="mt-2 text-sm text-brand-muted">Vorgemerkt mit: {mutation.data.email}</p>
        <p className="mt-4 text-xs text-brand-muted">
          Sie möchten Angaben ändern? Senden Sie das Formular einfach erneut mit derselben
          E-Mail-Adresse ab.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Pflichtfelder */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dw-name" className="mb-1.5 block text-sm font-medium text-brand-text">
            Name <span className="text-accent" aria-hidden="true">*</span>
            <span className="sr-only">(Pflichtfeld)</span>
          </label>
          <input id="dw-name" type="text" required autoComplete="name" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname"
            className={inputCls} />
        </div>
        <div>
          <label htmlFor="dw-email" className="mb-1.5 block text-sm font-medium text-brand-text">
            E-Mail <span className="text-accent" aria-hidden="true">*</span>
            <span className="sr-only">(Pflichtfeld)</span>
          </label>
          <input id="dw-email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="praxis@beispiel.de"
            className={inputCls} />
        </div>
      </div>

      {/* Optionale Felder */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dw-org" className="mb-1.5 block text-sm font-medium text-brand-text">
            Praxis / Organisation <span className="font-normal text-brand-muted">(optional)</span>
          </label>
          <input id="dw-org" type="text" autoComplete="organization" value={organization}
            onChange={(e) => setOrganization(e.target.value)} placeholder="z. B. Praxis am Park"
            className={inputCls} />
        </div>
        <div>
          <label htmlFor="dw-profession" className="mb-1.5 block text-sm font-medium text-brand-text">
            Berufsgruppe <span className="font-normal text-brand-muted">(optional)</span>
          </label>
          <select id="dw-profession" value={profession}
            onChange={(e) => setProfession(e.target.value)}
            className={`${inputCls} ${profession ? '' : 'text-brand-muted/60'}`}>
            <option value="">Bitte wählen …</option>
            {PROFESSIONS.map((p) => <option key={p} value={p} className="text-brand-text">{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="dw-spec" className="mb-1.5 block text-sm font-medium text-brand-text">
          Schwerpunkte <span className="font-normal text-brand-muted">(optional)</span>
        </label>
        <input id="dw-spec" type="text" value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          placeholder="z. B. Paardynamik, Bindung, narzisstische Beziehungsmuster, Trennung"
          className={inputCls} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="dw-location" className="mb-1.5 block text-sm font-medium text-brand-text">
            Ort / PLZ <span className="font-normal text-brand-muted">(optional)</span>
          </label>
          <input id="dw-location" type="text" autoComplete="postal-code" value={location}
            onChange={(e) => setLocation(e.target.value)} placeholder="z. B. 10115 Berlin"
            className={inputCls} />
        </div>
        <div>
          <label htmlFor="dw-website" className="mb-1.5 block text-sm font-medium text-brand-text">
            Webseite <span className="font-normal text-brand-muted">(optional)</span>
          </label>
          <input id="dw-website" type="text" inputMode="url" autoComplete="url" value={website}
            onChange={(e) => setWebsite(e.target.value)} placeholder="ihre-praxis.de"
            className={inputCls} />
        </div>
        <div>
          <label htmlFor="dw-phone" className="mb-1.5 block text-sm font-medium text-brand-text">
            Telefon <span className="font-normal text-brand-muted">(optional)</span>
          </label>
          <input id="dw-phone" type="tel" autoComplete="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} placeholder="030 1234567"
            className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="dw-note" className="mb-1.5 block text-sm font-medium text-brand-text">
          Anmerkung <span className="font-normal text-brand-muted">(optional)</span>
        </label>
        <textarea id="dw-note" rows={2} value={note} maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Etwas, das wir über Ihr Angebot wissen sollten?"
          className={`${inputCls} resize-none`} />
      </div>

      {/* Einwilligung */}
      <label className="flex cursor-pointer items-start gap-3 rounded-brand border border-brand-border bg-brand-bg/40 px-4 py-3">
        <input type="checkbox" checked={consent} required
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
        <span className="text-xs leading-relaxed text-brand-muted">
          Ich möchte vorgemerkt werden und künftig im EchoB-Verzeichnis gelistet werden. EchoB darf
          mich dazu per E-Mail kontaktieren. Vor einer öffentlichen Listung werden meine Angaben
          erneut mit mir abgestimmt. Es entstehen keine Kosten.{' '}
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
        {mutation.isPending ? 'Wird gesendet…' : 'Kostenlos vormerken lassen'}
      </button>

      <p className="text-center text-xs text-brand-muted">
        Unverbindlich & kostenfrei · Keine Listung ohne Ihre Freigabe · Jederzeit widerrufbar
      </p>
    </form>
  )
}
