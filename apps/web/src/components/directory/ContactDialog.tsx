import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import { directoryApi, type DirectoryContactPayload } from '@/api/directory'
import { FORMATS } from '@/directory/taxonomy'

interface Props {
  slug: string
  name: string
  offersFreeIntro?: boolean
  onClose: () => void
}

/** Kleines Kontakt-/Terminanfrage-Formular als Modal. EchoB leitet die Anfrage per Mail weiter. */
export default function ContactDialog({ slug, name, offersFreeIntro, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [personName, setPersonName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [format, setFormat] = useState('')
  const [company, setCompany] = useState('') // Honeypot

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const mutation = useMutation({
    mutationFn: () => {
      const payload: DirectoryContactPayload = {
        from_email: email.trim(),
        from_name: personName.trim() || undefined,
        from_phone: phone.trim() || undefined,
        message: message.trim() || undefined,
        preferred_format: format || undefined,
        company: company || undefined,
      }
      return directoryApi.contact(slug, payload)
    },
  })

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-brand-lg bg-white shadow-2xl sm:rounded-brand-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {mutation.isSuccess ? (
          <div className="px-7 py-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-navy">Anfrage gesendet</h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">
              {name} erhält deine Nachricht und meldet sich direkt bei dir. Eine Bestätigung
              liegt in deinem Postfach.
            </p>
            <button onClick={onClose} className="btn-primary mt-6 !px-6">Schließen</button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate() }}
            className="px-6 py-6 sm:px-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-wider text-accent">Anfrage senden</p>
                <h3 className="mt-1 text-lg font-bold leading-snug text-navy">{name}</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="Schließen" className="-mr-1 -mt-1 rounded-lg p-1.5 text-brand-muted hover:bg-brand-bg hover:text-navy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>

            {offersFreeIntro && (
              <p className="mt-3 rounded-brand-sm bg-accent/[0.07] px-3 py-2 text-[0.8rem] text-navy">
                Diese Fachperson bietet ein kostenloses Erstgespräch an.
              </p>
            )}

            <div className="mt-5 space-y-3.5">
              <label className="block">
                <span className="mb-1 block text-[0.8rem] font-medium text-navy">Deine E-Mail <span className="text-accent">*</span></span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de" className="input" autoComplete="email" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[0.8rem] font-medium text-navy">Name</span>
                  <input value={personName} onChange={(e) => setPersonName(e.target.value)} className="input" autoComplete="name" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.8rem] font-medium text-navy">Telefon</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" autoComplete="tel" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[0.8rem] font-medium text-navy">Wunsch-Setting</span>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className="input">
                  <option value="">Egal</option>
                  {FORMATS.map((f) => <option key={f.slug} value={f.slug}>{f.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[0.8rem] font-medium text-navy">Nachricht</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                  placeholder="Worum geht es? Was ist dir wichtig? (optional)" className="input resize-none" />
              </label>
              {/* Honeypot */}
              <input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)}
                className="hidden" aria-hidden="true" />
            </div>

            {mutation.isError && (
              <p className="mt-3 text-[0.8rem] text-red-600">
                Das hat nicht geklappt. Bitte versuche es später erneut.
              </p>
            )}

            <button type="submit" disabled={!valid || mutation.isPending} className="btn-primary mt-5 w-full disabled:opacity-50">
              {mutation.isPending ? 'Wird gesendet …' : 'Anfrage senden'}
            </button>
            <p className="mt-3 text-[0.72rem] leading-relaxed text-brand-muted">
              EchoB leitet deine Anfrage vertraulich an die Fachperson weiter. Es entstehen keine Kosten,
              und du gehst keine Verpflichtung ein.
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
