import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Link } from 'react-router-dom'
import { submitContact } from '@/api/contact'

/**
 * „Erstgespräch anfragen" – niedrigschwelliges Lead-Formular als Button + Modal.
 * E-Mail ODER Telefon genügt. Der Button erbt sein Styling über `className`,
 * damit er die bisherigen CTAs 1:1 ersetzen kann. Der direkte Weg (Mail/Telefon)
 * bleibt im Modal-Footer erhalten.
 */

const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/50 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent'

const CONTACT_EMAIL = 'kontakt@echo-b.de'
const CONTACT_TEL = '+4917359089060'
const CONTACT_TEL_LABEL = '0173 5908906'

function errMsg(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 422) return 'Bitte gib eine E-Mail oder Telefonnummer an.'
    if (!error.response) return 'Keine Verbindung. Bitte prüfe deine Internetverbindung.'
  }
  return 'Etwas ist schiefgelaufen. Bitte versuch es noch einmal – oder schreib uns direkt.'
}

export default function ErstgespraechCTA({
  className = 'btn-primary',
  label = 'Erstgespräch anfragen',
  heading = 'Erstgespräch anfragen',
  kind = 'coaching',
  source,
}: {
  className?: string; label?: string; heading?: string
  kind?: 'coaching' | 'demo' | 'general'; source?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open && <LeadModal kind={kind} heading={heading} source={source} onClose={() => setOpen(false)} />}
    </>
  )
}

function LeadModal({ kind, heading, source, onClose }: {
  kind: 'coaching' | 'demo' | 'general'; heading: string; source?: string; onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [company, setCompany] = useState('') // Honeypot
  const [localErr, setLocalErr] = useState<string | null>(null)

  const mutation = useMutation({ mutationFn: submitContact })

  const hasContact = email.trim().length > 0 || phone.trim().length > 0
  const canSubmit = hasContact && consent && !mutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalErr(null)
    if (!hasContact) { setLocalErr('Bitte gib eine E-Mail oder Telefonnummer an.'); return }
    if (!consent) { setLocalErr('Bitte bestätige kurz die Einwilligung.'); return }
    mutation.mutate({
      kind,
      name: name.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      message: message.trim() || null,
      source: source ?? 'coaching',
      consent,
      company: company || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="my-auto w-full max-w-md rounded-[1.25rem] bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="label">Kostenlos & unverbindlich</span>
            <h2 className="mt-1 text-lg font-bold text-navy">{heading}</h2>
          </div>
          <button onClick={onClose} aria-label="Schließen"
            className="shrink-0 rounded-full p-1 text-brand-muted hover:bg-brand-bg hover:text-navy">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mutation.isSuccess ? (
          <div role="status" aria-live="polite" className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl text-accent" aria-hidden="true">✓</div>
            <p className="text-lg font-semibold text-navy">Danke – wir melden uns!</p>
            <p className="mt-2 text-sm text-brand-muted">
              Wir antworten innerhalb von 24 Stunden. Wenn es dringend ist, ruf gern direkt an:{' '}
              <a href={`tel:${CONTACT_TEL}`} className="text-accent hover:underline">{CONTACT_TEL_LABEL}</a>.
            </p>
            <button onClick={onClose} className="btn-primary mt-6 w-full">Schließen</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <p className="text-sm text-brand-muted">
              Sag uns kurz, wie wir dich erreichen – <strong className="text-navy">E-Mail oder Telefon
              genügt</strong>. Wir melden uns innerhalb von 24 Stunden. Kein Druck, keine Verpflichtung.
            </p>

            <div>
              <label htmlFor="lead-name" className="mb-1.5 block text-sm font-medium text-brand-text">
                Name <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <input id="lead-name" type="text" autoComplete="name" value={name}
                onChange={(e) => setName(e.target.value)} placeholder="Wie dürfen wir dich ansprechen?"
                className={inputCls} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="lead-email" className="mb-1.5 block text-sm font-medium text-brand-text">E-Mail</label>
                <input id="lead-email" type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="du@beispiel.de" className={inputCls} />
              </div>
              <div>
                <label htmlFor="lead-phone" className="mb-1.5 block text-sm font-medium text-brand-text">Telefon</label>
                <input id="lead-phone" type="tel" autoComplete="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="0170 1234567" className={inputCls} />
              </div>
            </div>
            <p className="-mt-2 text-xs text-brand-muted">Eines von beiden reicht – wir melden uns auf dem Weg, den du angibst.</p>

            <div>
              <label htmlFor="lead-msg" className="mb-1.5 block text-sm font-medium text-brand-text">
                Worum geht's? <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <textarea id="lead-msg" rows={3} value={message} maxLength={2000}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ein, zwei Sätze genügen – oder lass es einfach leer."
                className={`${inputCls} resize-none`} />
            </div>

            {/* Honeypot: für Menschen unsichtbar, fängt Bots ab. */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>Firma
                <input type="text" tabIndex={-1} autoComplete="off" value={company}
                  onChange={(e) => setCompany(e.target.value)} />
              </label>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-brand-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
              <span>
                Ich willige ein, dass EchoB mich zu meiner Anfrage kontaktiert.{' '}
                <Link to="/datenschutz" target="_blank" className="underline hover:text-navy">Datenschutz</Link>.
              </span>
            </label>

            {(localErr || mutation.isError) && (
              <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {localErr ?? errMsg(mutation.error)}
              </p>
            )}

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full disabled:opacity-50">
              {mutation.isPending ? 'Wird gesendet …' : 'Anfrage senden'}
            </button>

            <p className="text-center text-xs text-brand-muted">
              Lieber direkt?{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">{CONTACT_EMAIL}</a>
              {' · '}
              <a href={`tel:${CONTACT_TEL}`} className="text-accent hover:underline">{CONTACT_TEL_LABEL}</a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
