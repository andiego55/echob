import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ProfessionalShell from '@/components/professional/ProfessionalShell'
import { directoryProfileApi, type DirectoryMe, type DirectoryProfilePayload } from '@/api/directory'
import { professionalApi } from '@/api/professional'
import { FORMATS, PROFESSIONS } from '@/directory/taxonomy'

type FormState = Omit<DirectoryMe, 'completeness' | 'stars' | 'missing' | 'publishable' | 'missing_required'>

function toForm(m: DirectoryMe): FormState {
  return {
    slug: m.slug, display_name: m.display_name, profession: m.profession,
    professions: m.professions, bills_insurance: m.bills_insurance, title: m.title,
    city: m.city, postal_code: m.postal_code, state: m.state, website: m.website, phone: m.phone,
    contact_email: m.contact_email, photo_url: m.photo_url, headline: m.headline, about: m.about,
    approach: m.approach, fees: m.fees, focus_areas: m.focus_areas, formats: m.formats,
    languages: m.languages, offers_free_intro: m.offers_free_intro, booking_url: m.booking_url,
    tier: m.tier, published: m.published, public_url: m.public_url,
  }
}

function toPayload(f: FormState, published: boolean): DirectoryProfilePayload {
  return {
    display_name: f.display_name, profession: f.professions[0] ?? '', professions: f.professions,
    bills_insurance: f.bills_insurance, title: f.title, city: f.city,
    postal_code: f.postal_code, state: f.state, website: f.website, phone: f.phone,
    contact_email: f.contact_email, headline: f.headline, about: f.about, approach: f.approach,
    fees: f.fees, focus_areas: f.focus_areas, formats: f.formats, languages: f.languages,
    offers_free_intro: f.offers_free_intro, booking_url: f.booking_url, published,
  }
}

const CHECKS: { key: string; label: string; points: number; ok: (f: FormState) => boolean }[] = [
  { key: 'photo', label: 'Profilfoto', points: 15, ok: (f) => !!f.photo_url },
  { key: 'headline', label: 'Kurzprofil (ein Satz)', points: 10, ok: (f) => !!f.headline?.trim() },
  { key: 'about', label: 'Über mich (min. 80 Zeichen)', points: 20, ok: (f) => (f.about?.trim().length ?? 0) >= 80 },
  { key: 'approach', label: 'Mein Vorgehen', points: 15, ok: (f) => (f.approach?.trim().length ?? 0) >= 60 },
  { key: 'focus', label: 'Mind. 3 Schwerpunkte', points: 15, ok: (f) => f.focus_areas.length >= 3 },
  { key: 'fees', label: 'Honorar-Angabe', points: 10, ok: (f) => !!f.fees?.trim() },
  { key: 'formats', label: 'Setting angeben', points: 5, ok: (f) => f.formats.length >= 1 },
  { key: 'languages', label: 'Sprachen', points: 5, ok: (f) => f.languages.length >= 1 },
  { key: 'title', label: 'Berufsbezeichnung', points: 5, ok: (f) => !!f.title?.trim() },
]

function completeness(f: FormState) {
  const done = CHECKS.filter((c) => c.ok(f))
  const score = done.reduce((s, c) => s + c.points, 0)
  const missing = CHECKS.filter((c) => !c.ok(f))
  return { score, stars: Math.round(score / 20), missing }
}

const REQUIRED: { label: string; ok: (f: FormState) => boolean }[] = [
  { label: 'Name', ok: (f) => !!f.display_name?.trim() },
  { label: 'Fachrichtung', ok: (f) => f.professions.length > 0 },
  { label: 'Ort', ok: (f) => !!f.city?.trim() },
  { label: 'Kontakt-E-Mail', ok: (f) => !!f.contact_email?.trim() },
]

export default function ProfessionalProfilePage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['directory-me'], queryFn: directoryProfileApi.me })
  const [form, setForm] = useState<FormState | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (data && !form) setForm(toForm(data)) }, [data, form])

  const set = (patch: Partial<FormState>) => {
    setForm((f) => (f ? { ...f, ...patch } : f))
    setDirty(true)
    setSaved(false)
  }

  const save = useMutation({
    mutationFn: (published: boolean) => directoryProfileApi.save(toPayload(form!, published)),
    onSuccess: (me) => {
      setForm(toForm(me))
      setDirty(false)
      setSaved(true)
      qc.setQueryData(['directory-me'], me)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const photo = useMutation({
    mutationFn: (file: File) => directoryProfileApi.uploadPhoto(file),
    onSuccess: (r) => setForm((f) => (f ? { ...f, photo_url: r.photo_url } : f)),
  })

  const meProf = useQuery({ queryKey: ['professional-me'], queryFn: professionalApi.me })
  const discoverable = !!meProf.data?.discoverable
  const setDiscoverable = useMutation({
    mutationFn: (v: boolean) => professionalApi.setDiscoverable(v),
    onSuccess: (p) => qc.setQueryData(['professional-me'], p),
  })

  if (isLoading || !form) {
    return <ProfessionalShell><div className="py-32 text-center text-brand-muted">Lädt …</div></ProfessionalShell>
  }

  const { score, stars, missing } = completeness(form)
  const missingRequired = REQUIRED.filter((r) => !r.ok(form)).map((r) => r.label)
  const publishable = missingRequired.length === 0

  return (
    <ProfessionalShell>
      <div className="mx-auto max-w-[1000px] px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-navy">Mein Verzeichnis-Profil</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-muted">
            So erscheinst du bei „Fachperson finden". Ein vollständiges Profil wird häufiger gefunden
            und angefragt. Ein paar Minuten genügen.
          </p>
        </header>

        {!form.published && !!form.profession && form.display_name !== 'Meine Praxis' && (
          <div className="mb-6 rounded-brand-lg border border-accent/25 bg-accent/[0.06] px-5 py-4">
            <p className="text-[0.9rem] font-bold text-navy">Willkommen bei EchoB</p>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-brand-muted">
              Wir haben dein Profil aus öffentlich verfügbaren Angaben schon vorbereitet. Ergänze ein Foto
              und ein paar Sätze – und schalte es mit einem Klick öffentlich. Der Eintrag ist und bleibt kostenlos.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Formular */}
          <div className="order-2 space-y-5 lg:order-1">
            {/* Foto + Grunddaten */}
            <Card title="Foto & Grunddaten">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="shrink-0">
                  <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-brand-lg bg-navy/[0.06] text-2xl font-bold text-navy">
                    {form.photo_url ? <img src={form.photo_url} alt="" className="h-full w-full object-cover" /> : (form.display_name?.[0] ?? '?')}
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) photo.mutate(file) }} />
                  <button onClick={() => fileRef.current?.click()} disabled={photo.isPending}
                    className="mt-2 w-28 rounded-brand-sm border border-brand-border bg-white px-2 py-1.5 text-[0.78rem] font-medium text-navy hover:border-accent/50 hover:text-accent disabled:opacity-50">
                    {photo.isPending ? 'Lädt …' : form.photo_url ? 'Foto ändern' : 'Foto hochladen'}
                  </button>
                  {photo.isError && <p className="mt-1 w-28 text-[0.68rem] text-red-600">Upload fehlgeschlagen.</p>}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <Field label="Name / Praxis" required value={form.display_name} onChange={(v) => set({ display_name: v })} />
                  <Field label="Berufsbezeichnung" value={form.title ?? ''} onChange={(v) => set({ title: v })}
                    placeholder="z. B. Psychologische Psychotherapeutin, Paartherapeutin" />
                  <div>
                    <span className="mb-1.5 block text-[0.8rem] font-medium text-navy">
                      Fachrichtung(en) <span className="text-accent">*</span>{' '}
                      <span className="font-normal text-brand-muted">– Mehrfachauswahl möglich</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PROFESSIONS.map((p) => {
                        const on = form.professions.includes(p.slug)
                        return (
                          <button
                            key={p.slug}
                            type="button"
                            onClick={() => set({ professions: on ? form.professions.filter((x) => x !== p.slug) : [...form.professions, p.slug] })}
                            className={`rounded-full border px-3 py-1 text-[0.8rem] transition-colors ${on ? 'border-accent bg-accent text-white' : 'border-brand-border bg-white text-navy hover:border-accent/50'}`}
                          >
                            {p.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ort" required value={form.city} onChange={(v) => set({ city: v })} placeholder="z. B. Kassel" />
                    <Field label="PLZ" value={form.postal_code ?? ''} onChange={(v) => set({ postal_code: v })} />
                  </div>
                  <Field label="Bundesland" value={form.state ?? ''} onChange={(v) => set({ state: v })} placeholder="z. B. Hessen" />
                </div>
              </div>
            </Card>

            <Card title="Kurzprofil" hint="Ein Satz, der zu dir passt – erscheint oben auf deinem Profil.">
              <Field label="Claim" value={form.headline ?? ''} onChange={(v) => set({ headline: v })}
                placeholder="z. B. Wieder ins Gespräch kommen, wenn die Worte fehlen" maxLength={160} />
            </Card>

            <Card title="Über mich" hint="Wer bist du, wen begleitest du? Menschen entscheiden nach Sympathie.">
              <Area value={form.about ?? ''} onChange={(v) => set({ about: v })} rows={5} min={80}
                placeholder="Erzähl in ein paar Sätzen, wer du bist und mit welcher Haltung du arbeitest." />
              <MdHint />
            </Card>

            <Card title="Mein Vorgehen" hint="Wie läuft die Zusammenarbeit ab? Welche Methode?">
              <Area value={form.approach ?? ''} onChange={(v) => set({ approach: v })} rows={4} min={60}
                placeholder="z. B. integrativ auf Basis der Emotionsfokussierten Paartherapie …" />
              <MdHint />
            </Card>

            <Card title="Schwerpunkte" hint="Womit kommen Menschen zu dir? 3–6 Themen wirken am stärksten.">
              <TagInput values={form.focus_areas} onChange={(v) => set({ focus_areas: v })}
                placeholder="Thema eintippen und Enter …" suggestions={['Vertrauensbruch & Affäre', 'Kommunikation', 'Trennungsklärung', 'Bindungsangst', 'Nähe-Distanz', 'Sexualität', 'Eifersucht', 'Selbstwert']} />
            </Card>

            <Card title="Honorar" hint="Transparenz schafft Vertrauen und spart Rückfragen.">
              <Area value={form.fees ?? ''} onChange={(v) => set({ fees: v })} rows={2}
                placeholder="z. B. Selbstzahler 120 € / 60 Min. Erstgespräch kostenlos." />
            </Card>

            <Card title="Arbeitsweise">
              <div className="space-y-4">
                <div>
                  <span className="mb-1.5 block text-[0.8rem] font-medium text-navy">Setting</span>
                  <div className="flex flex-wrap gap-2">
                    {FORMATS.map((fmt) => {
                      const on = form.formats.includes(fmt.slug)
                      return (
                        <button key={fmt.slug} onClick={() => set({ formats: on ? form.formats.filter((x) => x !== fmt.slug) : [...form.formats, fmt.slug] })}
                          className={`rounded-full border px-3 py-1.5 text-[0.82rem] transition-colors ${on ? 'border-accent bg-accent text-white' : 'border-brand-border bg-white text-navy hover:border-accent/50'}`}>
                          {fmt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-[0.8rem] font-medium text-navy">Sprachen</span>
                  <TagInput values={form.languages} onChange={(v) => set({ languages: v })} placeholder="Sprache + Enter …" suggestions={['Deutsch', 'Englisch', 'Türkisch', 'Französisch', 'Russisch']} />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-[0.88rem] text-navy">
                  <input type="checkbox" checked={form.offers_free_intro} onChange={(e) => set({ offers_free_intro: e.target.checked })} className="h-4 w-4 accent-accent" />
                  Ich biete ein kostenloses Erstgespräch an
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-[0.88rem] text-navy">
                  <input type="checkbox" checked={form.bills_insurance} onChange={(e) => set({ bills_insurance: e.target.checked })} className="h-4 w-4 accent-accent" />
                  Ich kann mit der gesetzlichen Krankenkasse abrechnen (Kassensitz)
                </label>
                <Field label="Buchungslink (optional)" value={form.booking_url ?? ''} onChange={(v) => set({ booking_url: v })} placeholder="https://…" />
              </div>
            </Card>

            <Card title="Kontakt" hint="Anfragen aus dem Verzeichnis werden an diese E-Mail weitergeleitet.">
              <div className="space-y-3">
                <Field label="Kontakt-E-Mail" required type="email" value={form.contact_email ?? ''} onChange={(v) => set({ contact_email: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefon" value={form.phone ?? ''} onChange={(v) => set({ phone: v })} />
                  <Field label="Website" value={form.website ?? ''} onChange={(v) => set({ website: v })} placeholder="https://…" />
                </div>
              </div>
            </Card>
          </div>

          {/* Fortschritts-Panel */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-20 space-y-4">
              <div className="rounded-brand-lg border border-brand-border bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.72rem] font-bold uppercase tracking-wider text-brand-muted">Profil-Stärke</span>
                  <span className="text-[0.95rem] font-bold text-navy">{score}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-brand-bg">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500" style={{ width: `${score}%` }} />
                </div>
                <div className="mt-2.5 text-[1.1rem] tracking-wide text-accent">
                  {'★'.repeat(stars)}<span className="text-brand-border">{'★'.repeat(5 - stars)}</span>
                </div>

                {missing.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-[0.72rem] font-semibold text-brand-muted">Noch offen:</p>
                    <ul className="space-y-1.5">
                      {missing.slice(0, 5).map((m) => (
                        <li key={m.key} className="flex items-center justify-between gap-2 text-[0.8rem] text-navy">
                          <span className="flex items-center gap-1.5"><span className="text-brand-border">○</span>{m.label}</span>
                          <span className="shrink-0 font-semibold text-accent">+{m.points}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-[0.82rem] font-medium text-accent">★ Vollständig – stark!</p>
                )}
              </div>

              {/* Veröffentlichen + Speichern */}
              <div className="rounded-brand-lg border border-brand-border bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.85rem] font-bold text-navy">Öffentliches Verzeichnis</p>
                    <p className="text-[0.72rem] text-brand-muted">{form.published ? 'Auf echo-b.de sichtbar.' : 'Noch als Entwurf.'}</p>
                  </div>
                  <button
                    role="switch" aria-checked={form.published}
                    disabled={!publishable && !form.published}
                    onClick={() => save.mutate(!form.published)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${form.published ? 'bg-accent' : 'bg-brand-border'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.published ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <p className="mt-2 text-[0.72rem] leading-relaxed text-brand-muted">
                  Dein Profil erscheint öffentlich auf <span className="font-medium text-navy">echo-b.de/fachpersonen</span> – für alle sichtbar, auch ohne EchoB-Konto.
                </p>
                {!publishable && (
                  <p className="mt-2 text-[0.72rem] text-brand-muted">Zum Veröffentlichen fehlt: {missingRequired.join(', ')}.</p>
                )}

                <button onClick={() => save.mutate(form.published)} disabled={save.isPending || (!dirty && !saved)}
                  className="btn-primary mt-4 w-full !py-2.5 disabled:opacity-50">
                  {save.isPending ? 'Speichert …' : saved ? 'Gespeichert ✓' : 'Speichern'}
                </button>
                {save.isError && <p className="mt-2 text-[0.72rem] text-red-600">{(save.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Speichern fehlgeschlagen.'}</p>}

                {form.published && (
                  <a href={form.public_url} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[0.8rem] font-semibold text-accent hover:underline">
                    Öffentliches Profil ansehen ↗
                  </a>
                )}
              </div>

              {/* Auffindbar in EchoB (App) – abgegrenzt vom öffentlichen Verzeichnis */}
              <div className="rounded-brand-lg border border-brand-border bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.85rem] font-bold text-navy">Auffindbar in EchoB</p>
                    <p className="text-[0.72rem] text-brand-muted">{discoverable ? 'In der App auffindbar.' : 'Nicht auffindbar.'}</p>
                  </div>
                  <button
                    role="switch" aria-checked={discoverable}
                    onClick={() => setDiscoverable.mutate(!discoverable)}
                    disabled={setDiscoverable.isPending}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${discoverable ? 'bg-accent' : 'bg-brand-border'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${discoverable ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <p className="mt-2 text-[0.72rem] leading-relaxed text-brand-muted">
                  Etwas anderes als das Verzeichnis: EchoB-Nutzer:innen können dich <span className="font-medium text-navy">in der App</span> per
                  Name/Fachrichtung finden und dir vertraulich ihren Fall freigeben – erst <span className="font-medium text-navy">nach deiner Bestätigung</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProfessionalShell>
  )
}

// ── Bausteine ────────────────────────────────────────────────────────────────

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-brand-lg border border-brand-border bg-white p-5">
      <h2 className="text-[0.98rem] font-bold text-navy">{title}</h2>
      {hint && <p className="mt-0.5 mb-3 text-[0.78rem] text-brand-muted">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

function MdHint() {
  return (
    <p className="mt-1.5 text-[0.72rem] text-brand-muted">
      Formatierung möglich: Links <code className="rounded bg-brand-bg px-1">[Text](https://…)</code> ·
      Aufzählung mit <code className="rounded bg-brand-bg px-1">-</code> am Zeilenanfang.
    </p>
  )
}

function Field({ label, value, onChange, required, placeholder, type = 'text', maxLength }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string; type?: string; maxLength?: number
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.8rem] font-medium text-navy">{label} {required && <span className="text-accent">*</span>}</span>
      <input type={type} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </label>
  )
}

function Area({ value, onChange, rows, min, placeholder }: { value: string; onChange: (v: string) => void; rows: number; min?: number; placeholder?: string }) {
  const len = value.trim().length
  return (
    <div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="input resize-none" />
      {min && (
        <p className={`mt-1 text-right text-[0.7rem] ${len >= min ? 'text-accent' : 'text-brand-muted'}`}>{len}/{min} Zeichen</p>
      )}
    </div>
  )
}

function TagInput({ values, onChange, placeholder, suggestions }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [draft, setDraft] = useState('')
  const add = (t: string) => { const v = t.trim(); if (v && !values.includes(v)) onChange([...values, v]); setDraft('') }
  const openSuggestions = (suggestions ?? []).filter((s) => !values.includes(s))
  return (
    <div>
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {values.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[0.8rem] text-navy">
              {t}
              <button onClick={() => onChange(values.filter((x) => x !== t))} className="text-brand-muted hover:text-accent" aria-label="Entfernen">×</button>
            </span>
          ))}
        </div>
      )}
      <input value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft) } }}
        placeholder={placeholder} className="input" />
      {openSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {openSuggestions.slice(0, 6).map((s) => (
            <button key={s} onClick={() => add(s)} className="rounded-full border border-dashed border-brand-border px-2.5 py-0.5 text-[0.75rem] text-brand-muted hover:border-accent hover:text-accent">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
