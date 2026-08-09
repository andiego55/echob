import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  directoryAdminApi,
  type AdminListingCreate,
  type AdminListingRow,
} from '@/api/directory'
import { PROFESSIONS, professionLabel } from '@/directory/taxonomy'

const FILTERS = [
  { key: '', label: 'Alle' },
  { key: 'researched', label: 'Recherchiert' },
  { key: 'invited', label: 'Eingeladen' },
  { key: 'published', label: 'Veröffentlicht' },
]

const TIER_OPTIONS = [
  { value: 'researched', label: 'Recherchiert' },
  { value: 'basic', label: 'Gelistet' },
  { value: 'profile', label: 'Profil' },
  { value: 'partner', label: 'Partner' },
]

export default function AdminDirectoryPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-directory', filter],
    queryFn: () => directoryAdminApi.list(filter || undefined),
    retry: false,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-directory'] })
  const denied = (error as { response?: { status?: number } })?.response?.status === 403

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-navy px-6">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between">
          <span className="font-bold text-white">Echo<span className="text-accent">B</span> · Verzeichnis-Admin</span>
          <Link to="/fachpersonen" className="text-[0.82rem] text-white/60 no-underline hover:text-white">Zum Verzeichnis ↗</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-6 py-8">
        {denied ? (
          <div className="rounded-brand-lg border border-brand-border bg-white px-6 py-16 text-center">
            <h1 className="text-lg font-bold text-navy">Kein Admin-Zugriff</h1>
            <p className="mt-2 text-sm text-brand-muted">Dieser Bereich ist dem EchoB-Team vorbehalten.</p>
          </div>
        ) : (
          <>
            <AddForm onCreated={invalidate} />

            <div className="mb-4 mt-8 flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors ${filter === f.key ? 'border-accent bg-accent text-white' : 'border-brand-border bg-white text-navy hover:border-accent/50'}`}>
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-[0.82rem] text-brand-muted">{data?.length ?? 0} Einträge</span>
            </div>

            {isLoading ? (
              <p className="py-12 text-center text-brand-muted">Lädt …</p>
            ) : (
              <div className="space-y-2.5">
                {(data ?? []).map((row) => <Row key={row.id} row={row} onChange={invalidate} />)}
                {data?.length === 0 && <p className="py-12 text-center text-sm text-brand-muted">Keine Einträge in dieser Ansicht.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AddForm({ onCreated }: { onCreated: () => void }) {
  const empty: AdminListingCreate = { display_name: '', profession: '', city: '' }
  const [f, setF] = useState<AdminListingCreate>(empty)
  const [open, setOpen] = useState(false)
  const create = useMutation({
    mutationFn: () => directoryAdminApi.create(f),
    onSuccess: () => { setF(empty); onCreated() },
  })
  const valid = f.display_name.trim() && f.profession && f.city.trim()

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">+ Fachperson hinzufügen</button>
    )
  }
  return (
    <div className="rounded-brand-lg border border-brand-border bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-navy">Fachperson recherchieren & anlegen</h2>
        <button onClick={() => setOpen(false)} className="text-sm text-brand-muted hover:text-navy">Schließen</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Name / Praxis *" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
        <select className="input" value={f.profession} onChange={(e) => setF({ ...f, profession: e.target.value })}>
          <option value="">Fachrichtung wählen *</option>
          {PROFESSIONS.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
        </select>
        <input className="input" placeholder="Ort *" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        <input className="input" placeholder="PLZ" value={f.postal_code ?? ''} onChange={(e) => setF({ ...f, postal_code: e.target.value })} />
        <input className="input" placeholder="E-Mail (für Einladung)" value={f.contact_email ?? ''} onChange={(e) => setF({ ...f, contact_email: e.target.value })} />
        <input className="input" placeholder="Telefon" value={f.phone ?? ''} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="input sm:col-span-2" placeholder="Website (https://…)" value={f.website ?? ''} onChange={(e) => setF({ ...f, website: e.target.value })} />
        <input className="input sm:col-span-2" placeholder="Berufsbezeichnung (optional)" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <button onClick={() => valid && create.mutate()} disabled={!valid || create.isPending} className="btn-primary mt-4 disabled:opacity-50">
        {create.isPending ? 'Legt an …' : 'Anlegen'}
      </button>
      {create.isError && <span className="ml-3 text-sm text-red-600">Fehler beim Anlegen.</span>}
    </div>
  )
}

function Row({ row, onChange }: { row: AdminListingRow; onChange: () => void }) {
  const [invited, setInvited] = useState<string | null>(null)
  const update = useMutation({ mutationFn: (patch: Parameters<typeof directoryAdminApi.update>[1]) => directoryAdminApi.update(row.id, patch), onSuccess: onChange })
  const remove = useMutation({ mutationFn: () => directoryAdminApi.remove(row.id), onSuccess: onChange })
  const invite = useMutation({
    mutationFn: (email?: string) => directoryAdminApi.invite(row.id, email),
    onSuccess: (r) => { setInvited(r.ok ? `Eingeladen: ${r.email}` : (r.detail ?? 'Fehlgeschlagen')); onChange() },
  })

  const doInvite = () => {
    let email = row.contact_email ?? ''
    if (!email) email = window.prompt('E-Mail der Fachperson für die Einladung:') ?? ''
    if (email.trim()) invite.mutate(email.trim())
  }

  return (
    <div className="rounded-brand border border-brand-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/fachpersonen/${row.slug}`} className="font-bold text-navy no-underline hover:text-accent">{row.display_name}</Link>
            {row.published && <Chip tone="green">Sichtbar</Chip>}
            {row.claimed && <Chip tone="accent">{row.claim_sent_at ? 'Eingeladen' : 'Beansprucht'}</Chip>}
            {row.verified && <Chip tone="navy">Verifiziert</Chip>}
          </div>
          <p className="mt-0.5 text-[0.8rem] text-brand-muted">
            {professionLabel(row.profession)} · {row.city}
            {row.contact_email && <> · {row.contact_email}</>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={row.tier} onChange={(e) => update.mutate({ tier: e.target.value })}
            className="rounded-brand-sm border border-brand-border bg-white px-2 py-1.5 text-[0.78rem] text-navy">
            {TIER_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[0.78rem] text-navy">
            <input type="checkbox" checked={row.published} onChange={(e) => update.mutate({ published: e.target.checked })} className="accent-accent" />
            Sichtbar
          </label>
          <button onClick={doInvite} disabled={invite.isPending}
            className="rounded-brand-sm bg-accent px-3 py-1.5 text-[0.78rem] font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
            {invite.isPending ? '…' : row.claim_sent_at ? 'Erneut einladen' : 'Einladen'}
          </button>
          <button onClick={() => { if (window.confirm(`„${row.display_name}" löschen?`)) remove.mutate() }}
            className="rounded-brand-sm border border-brand-border px-2.5 py-1.5 text-[0.78rem] text-brand-muted hover:border-red-300 hover:text-red-600">
            Löschen
          </button>
        </div>
      </div>
      {invited && <p className="mt-2 text-[0.76rem] text-brand-muted">{invited}</p>}
    </div>
  )
}

function Chip({ tone, children }: { tone: 'green' | 'accent' | 'navy'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-green-100 text-green-800',
    accent: 'bg-accent/15 text-accent',
    navy: 'bg-navy/10 text-navy',
  }[tone]
  return <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide ${cls}`}>{children}</span>
}
