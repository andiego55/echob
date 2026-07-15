/**
 * /institute/examples/new — KI-Fallgenerierung (Wizard).
 * Rahmen-Eingaben → Echo generiert Onboarding + Szenen (optional Partnerperson).
 * Läuft synchron (kann 1–2 Minuten dauern) → danach in den Editor.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import InstituteShell from '@/components/institute/InstituteShell'
import { instituteApi } from '@/api/institute'
import type { GenerationInput } from '@/types'

const REL_TYPES: [string, string][] = [
  ['partner', 'Partnerschaft'], ['ex_partner', 'Ex-Partnerschaft'], ['family', 'Familie'],
  ['friendship', 'Freundschaft'], ['work', 'Berufliche Beziehung'], ['co_parenting', 'Gemeinsame Elternschaft'],
  ['other', 'Andere'], ['own_patterns', 'Eigene Muster'],
]
const REL_STATUS: [string, string][] = [
  ['together', 'Zusammen'], ['separated', 'Getrennt'], ['cohabiting', 'Zusammenlebend'],
  ['low_contact', 'Wenig Kontakt'], ['conflict_laden', 'Konfliktbeladen'],
  ['forced_contact', 'Erzwungener Kontakt'], ['uncertain', 'Unklar'],
]
const CONTACT: [string, string][] = [
  ['daily', 'Täglich'], ['several_per_week', 'Mehrmals pro Woche'], ['occasionally', 'Gelegentlich'],
  ['rarely', 'Selten'], ['no_contact', 'Kein Kontakt'], ['organisational_only', 'Nur organisatorisch'],
  ['irregular', 'Unregelmäßig'],
]

const inputCls =
  'w-full rounded-brand border border-brand-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent'
const labelCls = 'mb-1.5 block text-sm font-medium text-brand-text'

export default function InstituteGeneratePage() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [personName, setPersonName] = useState('')
  const [relationshipType, setRelationshipType] = useState('partner')
  const [relationshipStatus, setRelationshipStatus] = useState('together')
  const [contactFrequency, setContactFrequency] = useState('occasionally')
  const [distress, setDistress] = useState(3)
  const [focusText, setFocusText] = useState('')
  const [sceneCount, setSceneCount] = useState(12)
  const [withPartner, setWithPartner] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const [freeText, setFreeText] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const input: GenerationInput = {
        title: title.trim() || null,
        person_name: personName.trim(),
        relationship_type: relationshipType,
        relationship_status: relationshipStatus,
        contact_frequency: contactFrequency,
        distress_score: distress,
        focus_terms: focusText.split(',').map(s => s.trim()).filter(Boolean),
        scene_count: sceneCount,
        with_partner: withPartner,
        partner_name: withPartner ? (partnerName.trim() || null) : null,
        free_text: freeText.trim() || null,
      }
      return instituteApi.generateExample(input)
    },
    onSuccess: (data) => navigate(`/institute/examples/${data.id}`),
  })

  const canSubmit = !!personName.trim() && (!withPartner || !!partnerName.trim())

  if (mutation.isPending) {
    return (
      <InstituteShell>
        <div className="mx-auto flex max-w-[600px] flex-col items-center px-6 py-24 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-border border-t-accent" />
          <h1 className="mt-6 text-lg font-bold text-navy">Echo generiert den Beispielfall …</h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Erst das Onboarding-Narrativ, dann {sceneCount} Szenen{withPartner ? ' – und dieselbe Beziehung aus Sicht der Partnerperson' : ''}.
            Das dauert einen Moment (bis ~2 Minuten). Bitte das Fenster offen lassen.
          </p>
        </div>
      </InstituteShell>
    )
  }

  return (
    <InstituteShell>
      <div className="mx-auto max-w-[760px] px-6 py-10">
        <Link to="/institute/dashboard" className="text-sm text-brand-muted no-underline hover:text-navy">
          ← Zurück zum Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-navy">Beispielfall generieren</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Ein paar Rahmen-Eingaben genügen – EchoB erzeugt daraus einen prototypischen Fall, den Sie
          anschließend prüfen, bearbeiten und ablegen.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate() }}
          className="mt-8 space-y-5"
        >
          <div className="card space-y-4">
            <div>
              <label className={labelCls}>Titel des Beispiels (optional)</label>
              <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="z. B. Narzisstisch-toxische Dynamik" maxLength={200} />
            </div>
            <div>
              <label className={labelCls}>Pseudonym der Fallperson</label>
              <input className={inputCls} value={personName} onChange={e => setPersonName(e.target.value)}
                placeholder="z. B. Lena" maxLength={120} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Beziehungsart</label>
                <select className={inputCls} value={relationshipType} onChange={e => setRelationshipType(e.target.value)}>
                  {REL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Aktueller Stand</label>
                <select className={inputCls} value={relationshipStatus} onChange={e => setRelationshipStatus(e.target.value)}>
                  {REL_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Kontakthäufigkeit</label>
                <select className={inputCls} value={contactFrequency} onChange={e => setContactFrequency(e.target.value)}>
                  {CONTACT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Belastungsgrad: <strong className="text-navy">{distress}</strong> / 5</label>
                <input type="range" min={0} max={5} value={distress} onChange={e => setDistress(Number(e.target.value))}
                  className="w-full accent-accent" />
              </div>
              <div>
                <label className={labelCls}>Anzahl Szenen: <strong className="text-navy">{sceneCount}</strong> (max. 30)</label>
                <input type="range" min={3} max={30} value={sceneCount} onChange={e => setSceneCount(Number(e.target.value))}
                  className="w-full accent-accent" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Schwerpunkte (kommagetrennt)</label>
              <input className={inputCls} value={focusText} onChange={e => setFocusText(e.target.value)}
                placeholder="z. B. Gaslighting, Schuldumkehr, Isolation" />
              <p className="mt-1 text-xs text-brand-muted">Muster, die die Beziehung prägen sollen.</p>
            </div>
            <div>
              <label className={labelCls}>Sonstige Angaben zur Beziehung (optional)</label>
              <textarea className={`${inputCls} min-h-[90px]`} value={freeText} onChange={e => setFreeText(e.target.value)}
                placeholder="Kontext, Verlauf, Besonderheiten …" maxLength={4000} />
            </div>
          </div>

          <div className="card space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={withPartner} onChange={e => setWithPartner(e.target.checked)}
                className="h-4 w-4 accent-accent" />
              <span className="text-sm font-medium text-navy">Partnerperson als zweiten Fall anlegen</span>
            </label>
            {withPartner && (
              <div>
                <label className={labelCls}>Pseudonym der Partnerperson</label>
                <input className={inputCls} value={partnerName} onChange={e => setPartnerName(e.target.value)}
                  placeholder="z. B. Marco" maxLength={120} />
                <p className="mt-1 text-xs text-brand-muted">
                  Dieselbe Beziehung wird zusätzlich aus dieser Perspektive generiert – Grundlage für die spätere Paar-Analyse.
                </p>
              </div>
            )}
          </div>

          {mutation.isError && (
            <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              Generierung fehlgeschlagen. Prüfe dein Kontingent oder versuche es erneut.
            </p>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={!canSubmit} className="btn-primary">
              Fall generieren
            </button>
            <span className="text-xs text-brand-muted">Kann bis zu ~2 Minuten dauern.</span>
          </div>
        </form>
      </div>
    </InstituteShell>
  )
}
