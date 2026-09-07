/**
 * /admin/verzeichnis — Fachpersonen recherchieren, vorbereiten, einladen.
 *
 * **Drei Wege zu einem Konto, bewusst unterschieden:**
 *
 * 1. *Nur eintragen* — kein Konto. Für recherchierte Einträge, die niemand angefragt hat.
 * 2. *Zugang vorbereiten* — Konto und Rolle entstehen, es geht **nichts** raus. Für
 *    Fachpersonen, die zugesagt haben und deren Zugangsdaten persönlich übergeben werden.
 * 3. *Einladen* — Konto entsteht **und** eine Mail geht raus, deren Text vorher zu lesen
 *    und zu ändern ist.
 *
 * Der Unterschied zwischen 2 und 3 ist nicht rückholbar, deshalb sehen die Knöpfe
 * verschieden aus und der dritte zeigt den Text, bevor er etwas tut.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PROFESSIONS, professionLabel } from '@/directory/taxonomy'
import {
  adminApi,
  type ListingCreate,
  type ListingRow,
  type ListingUpdate,
  type ProvisionResult,
} from './api'
import { SETTINGS, linkStelleFehlt, listeAusText, settingUmschalten, textAusListe } from './felder'

const FILTER = [
  { key: '', label: 'Alle' },
  { key: 'researched', label: 'Recherchiert' },
  { key: 'claimed', label: 'Mit Konto' },
  { key: 'invited', label: 'Eingeladen' },
  { key: 'published', label: 'Veröffentlicht' },
]

const TIER = [
  { value: 'researched', label: 'Recherchiert' },
  { value: 'basic', label: 'Gelistet' },
  { value: 'profile', label: 'Profil' },
  { value: 'partner', label: 'Partner' },
]

export default function AdminListingsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [zuletztAngelegt, setZuletztAngelegt] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-listings', filter],
    queryFn: () => adminApi.listings(filter || undefined),
    retry: false,
  })

  const neuLaden = () => qc.invalidateQueries({ queryKey: ['admin-listings'] })
  const verwehrt = (error as { response?: { status?: number } })?.response?.status === 403

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-navy px-6">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between">
          <span className="font-bold text-white">Echo<span className="text-accent">B</span> · Verzeichnis</span>
          <div className="flex items-center gap-4">
            <Link to="/admin/nutzer" className="text-[0.82rem] text-white/60 no-underline hover:text-white">Konten ↗</Link>
            <Link to="/fachpersonen" className="text-[0.82rem] text-white/60 no-underline hover:text-white">Öffentlich ↗</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-6 py-8">
        {verwehrt ? (
          <div className="rounded-brand-lg border border-brand-border bg-white px-6 py-16 text-center">
            <h1 className="text-lg font-bold text-navy">Kein Admin-Zugriff</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Dieser Bereich ist an eine einzelne Konto-Kennung gebunden (<code>ADMIN_USER_ID</code>).
            </p>
          </div>
        ) : (
          <>
            <AnlegenFormular onAngelegt={(id) => { setZuletztAngelegt(id); neuLaden() }} />

            <div className="mb-4 mt-8 flex flex-wrap items-center gap-2">
              {FILTER.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors ${
                    filter === f.key
                      ? 'border-accent bg-accent text-white'
                      : 'border-brand-border bg-white text-navy hover:border-accent/50'}`}>
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-[0.82rem] text-brand-muted">{data?.length ?? 0} Einträge</span>
            </div>

            {isLoading ? (
              <p className="py-12 text-center text-brand-muted">Lädt …</p>
            ) : (
              <div className="space-y-2.5">
                {(data ?? []).map(row => (
                  <Zeile
                    key={row.id}
                    row={row}
                    sofortOeffnen={row.id === zuletztAngelegt}
                    onGeaendert={neuLaden}
                  />
                ))}
                {data?.length === 0 && (
                  <p className="py-12 text-center text-sm text-brand-muted">Keine Einträge in dieser Ansicht.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Mehrfachauswahl der Fachrichtungen — die App erlaubt bis zu fünf. */
function Fachrichtungen({ werte, onAendern }: { werte: string[]; onAendern: (w: string[]) => void }) {
  const umschalten = (slug: string) => {
    if (werte.includes(slug)) onAendern(werte.filter(w => w !== slug))
    else if (werte.length < 5) onAendern([...werte, slug])
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {PROFESSIONS.map(p => {
        const an = werte.includes(p.slug)
        return (
          <button
            key={p.slug} type="button" onClick={() => umschalten(p.slug)}
            className={`rounded-full border px-2.5 py-1 text-[0.75rem] transition-colors ${
              an ? 'border-accent bg-accent text-white' : 'border-brand-border bg-white text-navy hover:border-accent/50'}`}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

function AnlegenFormular({ onAngelegt }: { onAngelegt: (id: string) => void }) {
  const leer: ListingCreate = { display_name: '', profession: '', city: '', professions: [] }
  const [f, setF] = useState<ListingCreate>(leer)
  const [offen, setOffen] = useState(false)

  const anlegen = useMutation({
    mutationFn: () => adminApi.create({ ...f, profession: (f.professions ?? [])[0] ?? '' }),
    // Direkt den Editor öffnen: Beim Anlegen fragen wir nur das Nötigste ab, alles
    // Weitere steht im Editor — ohne diesen Sprung übersieht man die Hälfte.
    onSuccess: (row) => { setF(leer); setOffen(false); onAngelegt(row.id) },
  })

  const gueltig = f.display_name.trim() && (f.professions ?? []).length > 0 && f.city.trim()

  if (!offen) {
    return <button onClick={() => setOffen(true)} className="btn-primary">+ Fachperson hinzufügen</button>
  }
  return (
    <div className="rounded-brand-lg border border-brand-border bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-navy">Fachperson anlegen</h2>
        <button onClick={() => setOffen(false)} className="text-sm text-brand-muted hover:text-navy">Schließen</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Name / Praxis *" value={f.display_name}
          onChange={e => setF({ ...f, display_name: e.target.value })} />
        <input className="input" placeholder="Ort *" value={f.city}
          onChange={e => setF({ ...f, city: e.target.value })} />
        <input className="input" placeholder="PLZ" value={f.postal_code ?? ''}
          onChange={e => setF({ ...f, postal_code: e.target.value })} />
        <input className="input" placeholder="Bundesland" value={f.state ?? ''}
          onChange={e => setF({ ...f, state: e.target.value })} />
        <input className="input" placeholder="E-Mail (Kontakt & Konto)" value={f.contact_email ?? ''}
          onChange={e => setF({ ...f, contact_email: e.target.value })} />
        <input className="input" placeholder="Telefon" value={f.phone ?? ''}
          onChange={e => setF({ ...f, phone: e.target.value })} />
        <input className="input" placeholder="Website (https://…)" value={f.website ?? ''}
          onChange={e => setF({ ...f, website: e.target.value })} />
        <input className="input" placeholder="Berufsbezeichnung" value={f.title ?? ''}
          onChange={e => setF({ ...f, title: e.target.value })} />
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block text-[0.78rem] font-medium text-brand-text">Fachrichtungen * (bis 5)</span>
        <Fachrichtungen werte={f.professions ?? []} onAendern={w => setF({ ...f, professions: w })} />
      </div>

      <button onClick={() => gueltig && anlegen.mutate()} disabled={!gueltig || anlegen.isPending}
        className="btn-primary mt-4 disabled:opacity-50">
        {anlegen.isPending ? 'Legt an …' : 'Anlegen und weiter zum Profil'}
      </button>
      {anlegen.isError && <span className="ml-3 text-sm text-red-600">Fehler beim Anlegen.</span>}
    </div>
  )
}

function Zeile({ row, sofortOeffnen, onGeaendert }: {
  row: ListingRow
  sofortOeffnen: boolean
  onGeaendert: () => void
}) {
  const [profilOffen, setProfilOffen] = useState(sofortOeffnen)
  const [einladungOffen, setEinladungOffen] = useState(false)
  const [zugang, setZugang] = useState<ProvisionResult | null>(null)

  const aendern = useMutation({
    mutationFn: (patch: ListingUpdate) => adminApi.update(row.id, patch),
    onSuccess: onGeaendert,
  })
  const loeschen = useMutation({ mutationFn: () => adminApi.remove(row.id), onSuccess: onGeaendert })
  const vorbereiten = useMutation({
    mutationFn: (email?: string) => adminApi.provision(row.id, email),
    onSuccess: (r) => { setZugang(r); onGeaendert() },
  })

  const adresse = () => {
    const hinterlegt = row.contact_email ?? ''
    return (hinterlegt || window.prompt('E-Mail der Fachperson:') || '').trim()
  }

  return (
    <div className="rounded-brand border border-brand-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/fachpersonen/${row.slug}`} className="font-bold text-navy no-underline hover:text-accent">
              {row.display_name}
            </Link>
            {row.published && <Chip ton="gruen">Sichtbar</Chip>}
            {row.claimed && <Chip ton="akzent">{row.claim_sent_at ? 'Eingeladen' : 'Konto da'}</Chip>}
            {row.verified && <Chip ton="navy">Verifiziert</Chip>}
          </div>
          <p className="mt-0.5 text-[0.8rem] text-brand-muted">
            {(row.professions.length ? row.professions : [row.profession]).map(professionLabel).join(', ')}
            {' · '}{row.city}
            {row.contact_email && <> · {row.contact_email}</>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={row.tier} onChange={e => aendern.mutate({ tier: e.target.value })}
            className="rounded-brand-sm border border-brand-border bg-white px-2 py-1.5 text-[0.78rem] text-navy">
            {TIER.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={() => setProfilOffen(!profilOffen)}
            className="rounded-brand-sm border border-brand-border px-3 py-1.5 text-[0.78rem] font-medium text-navy hover:border-accent/50">
            {profilOffen ? 'Profil schließen' : 'Profil bearbeiten'}
          </button>
          {!row.claimed && (
            <button
              onClick={() => { const e = adresse(); if (e) vorbereiten.mutate(e) }}
              disabled={vorbereiten.isPending}
              title="Legt Konto und Rolle an, ohne etwas zu verschicken"
              className="rounded-brand-sm border border-navy bg-navy px-3 py-1.5 text-[0.78rem] font-semibold text-white hover:bg-navy/90 disabled:opacity-50">
              {vorbereiten.isPending ? '…' : 'Zugang vorbereiten'}
            </button>
          )}
          <button onClick={() => setEinladungOffen(!einladungOffen)}
            title="Zeigt den Einladungstext zum Ändern — verschickt noch nichts"
            className="rounded-brand-sm border border-accent px-3 py-1.5 text-[0.78rem] font-semibold text-accent hover:bg-accent/10">
            Einladen …
          </button>
          <button onClick={() => { if (window.confirm(`„${row.display_name}" löschen?`)) loeschen.mutate() }}
            className="rounded-brand-sm border border-brand-border px-2.5 py-1.5 text-[0.78rem] text-brand-muted hover:border-red-300 hover:text-red-600">
            Löschen
          </button>
        </div>
      </div>

      {vorbereiten.isError && <p className="mt-2 text-[0.76rem] text-red-600">Bereitstellung fehlgeschlagen.</p>}
      {zugang && <ZugangPanel ergebnis={zugang} name={row.display_name} onSchliessen={() => setZugang(null)} />}
      {einladungOffen && (
        <EinladungPanel
          listingId={row.id}
          voreingestellteMail={row.contact_email}
          onGesendet={() => { setEinladungOffen(false); onGeaendert() }}
          onAbbrechen={() => setEinladungOffen(false)}
        />
      )}
      {profilOffen && <ProfilEditor listingId={row.id} onGespeichert={onGeaendert} />}
    </div>
  )
}

/**
 * Die Zugangsdaten — einmal und nie wieder.
 *
 * Das Startpasswort steht in keiner Datenbank und in keinem Protokoll. Wird dieses Feld
 * geschlossen, ohne dass jemand es kopiert hat, ist es weg und das Konto braucht
 * „Passwort vergessen". Deshalb steht die Warnung darüber und nicht darunter.
 */
function ZugangPanel({ ergebnis, name, onSchliessen }: {
  ergebnis: ProvisionResult
  name: string
  onSchliessen: () => void
}) {
  const [kopiert, setKopiert] = useState(false)

  if (!ergebnis.ok || !ergebnis.password) {
    return (
      <p className="mt-3 rounded-brand border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] text-red-700">
        {ergebnis.detail ?? 'Konto konnte nicht angelegt werden.'}
      </p>
    )
  }

  const text = `Zugang zu EchoB\nBenutzername: ${ergebnis.email}\nStartpasswort: ${ergebnis.password}\nAnmelden: https://echo-b.de/auth`

  return (
    <div className="mt-3 rounded-brand border-2 border-navy bg-navy/[0.03] px-4 py-3.5">
      <p className="text-[0.82rem] font-semibold text-navy">
        Zugang für {name} steht — es wurde nichts verschickt.
      </p>
      <p className="mt-1 text-[0.78rem] leading-relaxed text-brand-text">
        Das Startpasswort siehst du <strong>nur jetzt</strong>. Kopiere es, bevor du dieses
        Feld schließt — es ist nirgends gespeichert.
      </p>

      <div className="mt-2.5 rounded-brand-sm border border-brand-border bg-white px-3 py-2 font-mono text-[0.8rem]">
        <div className="text-brand-muted">Benutzername</div>
        <div className="text-navy">{ergebnis.email}</div>
        <div className="mt-1.5 text-brand-muted">Startpasswort</div>
        <div className="select-all text-navy">{ergebnis.password}</div>
      </div>

      {ergebnis.detail && <p className="mt-2 text-[0.76rem] text-amber-700">{ergebnis.detail}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => { navigator.clipboard?.writeText(text); setKopiert(true) }}
          className="rounded-brand-sm bg-navy px-3 py-1.5 text-[0.78rem] font-semibold text-white hover:bg-navy/90">
          {kopiert ? 'Kopiert ✓' : 'Zugangsdaten kopieren'}
        </button>
        <button onClick={onSchliessen} className="text-[0.78rem] text-brand-muted hover:text-navy">
          Habe ich notiert – schließen
        </button>
      </div>

      <p className="mt-3 border-t border-brand-border pt-2 text-[0.74rem] leading-relaxed text-brand-muted">
        Beim ersten Login verlangt EchoB von selbst ein neues Passwort und den
        Auftragsverarbeitungsvertrag. Beides bleibt der Fachperson überlassen — der Vertrag
        ist ihre Erklärung, nicht deine.
      </p>
    </div>
  )
}

/**
 * Der Einladungstext, bevor er rausgeht.
 *
 * Eine Einladung ist der erste Eindruck bei jemandem, den man gewinnen will. Sie einem
 * Vorlagenfeld in einem fremden Dashboard zu überlassen, heißt sie nie zu lesen. Hier
 * steht sie vor dem Senden auf dem Schirm und lässt sich ändern.
 *
 * `{LINK}` wird erst beim Senden durch den echten Einladungslink ersetzt — den es vorher
 * noch gar nicht gibt, weil ihn erst das Anlegen des Kontos erzeugt.
 */
function EinladungPanel({ listingId, voreingestellteMail, onGesendet, onAbbrechen }: {
  listingId: string
  voreingestellteMail: string | null
  onGesendet: () => void
  onAbbrechen: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-invite-draft', listingId, voreingestellteMail],
    queryFn: () => adminApi.inviteDraft(listingId, voreingestellteMail ?? undefined),
    retry: false,
    staleTime: Infinity,
  })

  const [f, setF] = useState<{ email: string; subject: string; body: string } | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)

  const senden = useMutation({
    mutationFn: () => adminApi.inviteSend(listingId, f!),
    onSuccess: (r) => {
      if (r.ok) { setMeldung(null); onGesendet() }
      else setMeldung(r.detail ?? 'Fehlgeschlagen.')
    },
    onError: () => setMeldung('Senden fehlgeschlagen.'),
  })

  if (isLoading || !data) return <p className="mt-3 text-[0.78rem] text-brand-muted">Lädt Entwurf …</p>

  const v = f ?? { email: data.email, subject: data.subject, body: data.body }
  const setz = (patch: Partial<typeof v>) => { setF({ ...v, ...patch }); setMeldung(null) }
  const linkFehlt = linkStelleFehlt(v.body)
  const bereit = v.email.includes('@') && v.subject.trim() && !linkFehlt

  return (
    <div className="mt-3 rounded-brand border-2 border-accent/40 bg-accent/[0.04] p-4">
      <p className="text-[0.82rem] font-semibold text-navy">Einladung — noch ist nichts verschickt</p>
      <p className="mt-1 text-[0.78rem] leading-relaxed text-brand-text">
        Beim Senden wird ein Konto angelegt und diese Mail verschickt.
        {' '}<code className="rounded bg-white px-1">{'{LINK}'}</code> ersetzt der Server durch
        den echten Einladungslink.
      </p>

      <div className="mt-3 space-y-2.5">
        <input className="input" placeholder="Empfänger" value={v.email}
          onChange={e => setz({ email: e.target.value })} />
        <input className="input" placeholder="Betreff" value={v.subject}
          onChange={e => setz({ subject: e.target.value })} />
        <textarea className="input font-mono text-[0.8rem]" rows={16} value={v.body}
          onChange={e => setz({ body: e.target.value })} />
      </div>

      {linkFehlt && (
        <p className="mt-2 rounded-brand border border-amber-200 bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-900">
          Im Text fehlt <code>{'{LINK}'}</code>. Ohne diese Stelle enthält die Mail keinen Zugang.
        </p>
      )}
      {meldung && <p className="mt-2 text-[0.78rem] text-red-600">{meldung}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={() => bereit && senden.mutate()} disabled={!bereit || senden.isPending}
          className="rounded-brand-sm bg-accent px-3.5 py-1.5 text-[0.8rem] font-semibold text-white hover:bg-accent-hover disabled:opacity-40">
          {senden.isPending ? 'Sendet …' : 'Konto anlegen und Mail senden'}
        </button>
        <button onClick={onAbbrechen} className="text-[0.78rem] text-brand-muted hover:text-navy">Abbrechen</button>
      </div>
    </div>
  )
}

/**
 * Das ausführliche Profil — jedes Feld, das die Fachperson später selbst pflegen kann.
 *
 * Erst beim Öffnen geladen: „Über mich" und „Mein Vorgehen" sind lange Texte, die in
 * einer Liste mit hunderten Einträgen nur Gewicht wären.
 */
function ProfilEditor({ listingId, onGespeichert }: { listingId: string; onGespeichert: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-listing', listingId],
    queryFn: () => adminApi.listing(listingId),
    retry: false,
  })
  const [f, setF] = useState<ListingUpdate | null>(null)
  const [ok, setOk] = useState(false)

  const speichern = useMutation({
    mutationFn: () => adminApi.update(listingId, f ?? {}),
    onSuccess: () => { setOk(true); onGespeichert() },
  })

  if (isLoading || !data) return <p className="mt-3 text-[0.78rem] text-brand-muted">Lädt Profil …</p>

  const v: ListingUpdate = f ?? {
    display_name: data.display_name,
    city: data.city,
    postal_code: data.postal_code ?? '',
    state: data.state ?? '',
    professions: data.professions.length ? data.professions : [data.profession].filter(Boolean),
    contact_email: data.contact_email ?? '',
    website: data.website ?? '',
    phone: data.phone ?? '',
    title: data.title ?? '',
    headline: data.headline ?? '',
    about: data.about ?? '',
    approach: data.approach ?? '',
    fees: data.fees ?? '',
    booking_url: data.booking_url ?? '',
    focus_areas: data.focus_areas,
    formats: data.formats,
    languages: data.languages,
    offers_free_intro: data.offers_free_intro,
    bills_insurance: data.bills_insurance,
    published: data.published,
    verified: data.verified,
  }
  const setz = (patch: ListingUpdate) => { setF({ ...v, ...patch }); setOk(false) }

  return (
    <div className="mt-3 rounded-brand border border-brand-border bg-brand-bg/60 p-4">
      <FotoFeld listingId={listingId} vorhanden={data.photo_url} onGewechselt={onGespeichert} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Name / Praxis" value={v.display_name ?? ''}
          onChange={e => setz({ display_name: e.target.value })} />
        <input className="input" placeholder="Ort" value={v.city ?? ''}
          onChange={e => setz({ city: e.target.value })} />
        <input className="input" placeholder="PLZ" value={v.postal_code ?? ''}
          onChange={e => setz({ postal_code: e.target.value })} />
        <input className="input" placeholder="Bundesland" value={v.state ?? ''}
          onChange={e => setz({ state: e.target.value })} />
        <input className="input" placeholder="E-Mail (Kontakt & Konto)" value={v.contact_email ?? ''}
          onChange={e => setz({ contact_email: e.target.value })} />
        <input className="input" placeholder="Telefon" value={v.phone ?? ''}
          onChange={e => setz({ phone: e.target.value })} />
        <input className="input" placeholder="Website (https://…)" value={v.website ?? ''}
          onChange={e => setz({ website: e.target.value })} />
        <input className="input" placeholder="Berufsbezeichnung" value={v.title ?? ''}
          onChange={e => setz({ title: e.target.value })} />
        <input className="input sm:col-span-2" placeholder="Kurzer Claim (Überschrift)" maxLength={160}
          value={v.headline ?? ''} onChange={e => setz({ headline: e.target.value })} />
        <textarea className="input sm:col-span-2" rows={4} placeholder="Über mich"
          value={v.about ?? ''} onChange={e => setz({ about: e.target.value })} />
        <textarea className="input sm:col-span-2" rows={4} placeholder="Mein Vorgehen"
          value={v.approach ?? ''} onChange={e => setz({ approach: e.target.value })} />
        <textarea className="input sm:col-span-2" rows={2} placeholder="Honorar"
          value={v.fees ?? ''} onChange={e => setz({ fees: e.target.value })} />
        <input className="input" placeholder="Schwerpunkte, mit Komma getrennt"
          value={textAusListe(v.focus_areas)} onChange={e => setz({ focus_areas: listeAusText(e.target.value) })} />
        <input className="input" placeholder="Sprachen, mit Komma getrennt"
          value={textAusListe(v.languages)} onChange={e => setz({ languages: listeAusText(e.target.value) })} />
        <input className="input sm:col-span-2" placeholder="Buchungslink (optional)"
          value={v.booking_url ?? ''} onChange={e => setz({ booking_url: e.target.value })} />
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block text-[0.78rem] font-medium text-brand-text">Fachrichtungen (bis 5)</span>
        <Fachrichtungen werte={v.professions ?? []} onAendern={w => setz({ professions: w })} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.78rem] text-brand-muted">Setting:</span>
          {SETTINGS.map(s => (
            <label key={s.wert} className="flex items-center gap-1.5 text-[0.78rem] text-navy">
              <input type="checkbox" className="accent-accent"
                checked={(v.formats ?? []).includes(s.wert)}
                onChange={() => setz({ formats: settingUmschalten(v.formats ?? [], s.wert) })} />
              {s.label}
            </label>
          ))}
        </div>
        <Haken an={!!v.offers_free_intro} onAendern={x => setz({ offers_free_intro: x })}>Erstgespräch kostenfrei</Haken>
        <Haken an={!!v.bills_insurance} onAendern={x => setz({ bills_insurance: x })}>Kassenabrechnung</Haken>
        <Haken an={!!v.published} onAendern={x => setz({ published: x })}>Öffentlich sichtbar</Haken>
        <Haken an={!!v.verified} onAendern={x => setz({ verified: x })}>Identität geprüft</Haken>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => speichern.mutate()} disabled={speichern.isPending || !f}
          className="btn-primary disabled:opacity-50">
          {speichern.isPending ? 'Speichert …' : 'Profil speichern'}
        </button>
        {ok && <span className="text-[0.78rem] text-green-700">Gespeichert ✓</span>}
        {speichern.isError && <span className="text-[0.78rem] text-red-600">Speichern fehlgeschlagen.</span>}
      </div>
    </div>
  )
}

function Haken({ an, onAendern, children }: {
  an: boolean
  onAendern: (x: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-1.5 text-[0.78rem] text-navy">
      <input type="checkbox" checked={an} onChange={e => onAendern(e.target.checked)} className="accent-accent" />
      {children}
    </label>
  )
}

/**
 * Das Profilfoto — hier, weil ein vorbereitetes Profil ohne Bild halb fertig ist.
 *
 * Läuft über die Eintrags-Id statt über ein Konto: Beim Vorbereiten gibt es das Konto oft
 * noch gar nicht. Wechselt die Fachperson das Bild später selbst, überschreibt sie es.
 */
function FotoFeld({ listingId, vorhanden, onGewechselt }: {
  listingId: string
  vorhanden: string | null
  onGewechselt: () => void
}) {
  const [url, setUrl] = useState(vorhanden)
  const [fehler, setFehler] = useState<string | null>(null)

  const hoch = useMutation({
    mutationFn: (datei: File) => adminApi.uploadPhoto(listingId, datei),
    onSuccess: (r) => { setUrl(r.photo_url); setFehler(null); onGewechselt() },
    onError: (e: unknown) => {
      const status = (e as { response?: { status?: number } })?.response?.status
      setFehler(
        status === 415 ? 'Nur JPG, PNG oder WebP.'
          : status === 413 ? 'Das Bild ist größer als 4 MB.'
            : 'Upload fehlgeschlagen.',
      )
    },
  })

  return (
    <div className="mb-4 flex items-center gap-4 border-b border-brand-border pb-4">
      {url ? (
        <img src={url} alt="" className="h-16 w-16 rounded-full border border-brand-border object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-brand-border text-[0.66rem] text-brand-muted">
          kein Bild
        </div>
      )}
      <div>
        <label className="inline-block cursor-pointer rounded-brand-sm border border-brand-border bg-white px-3 py-1.5 text-[0.78rem] font-medium text-navy hover:border-accent/50">
          {hoch.isPending ? 'Lädt hoch …' : url ? 'Bild ersetzen' : 'Bild hochladen'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            disabled={hoch.isPending}
            onChange={(e) => {
              const datei = e.target.files?.[0]
              // Zurücksetzen, damit dieselbe Datei nach einem Fehler erneut wählbar ist.
              e.target.value = ''
              if (datei) hoch.mutate(datei)
            }} />
        </label>
        <p className="mt-1 text-[0.72rem] text-brand-muted">JPG, PNG oder WebP, bis 4 MB.</p>
        {fehler && <p className="mt-1 text-[0.72rem] text-red-600">{fehler}</p>}
      </div>
    </div>
  )
}

function Chip({ ton, children }: { ton: 'gruen' | 'akzent' | 'navy'; children: React.ReactNode }) {
  const cls = {
    gruen: 'bg-green-100 text-green-800',
    akzent: 'bg-accent/15 text-accent',
    navy: 'bg-navy/10 text-navy',
  }[ton]
  return <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide ${cls}`}>{children}</span>
}
