/**
 * /app/paar — Übersicht der Paarräume.
 *
 * Einstieg in die Paartherapie: Partner:in einladen (Kopplungscode) oder einen Code
 * einlösen. Eine Kopplung ist bewusst KEINE Freigabe — sie öffnet nur den gemeinsamen
 * Raum und gibt keinen Blick in den eigenen Fall frei.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { casesApi } from '@/api/cases'
import { coupleApi, coupleInviteLink, formatCoupleCode } from '@/api/couple'
import type { CoupleLink } from '@/api/couple'
import IsolationNotice from '@/components/couple/IsolationNotice'

export default function CoupleOverviewPage() {
  const { data: links = [], isLoading } = useQuery({ queryKey: ['couple-links'], queryFn: coupleApi.list })

  const rooms = links.filter(l => l.status === 'active')
  const pending = links.filter(l => l.status === 'pending')

  return (
    <AppShell>
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-6">
        <div>
          <span className="label">Zu zweit</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">Paartherapie</h1>
          <p className="mt-2 text-sm text-brand-muted max-w-2xl">
            Verbinde dich mit deiner Partnerin oder deinem Partner zu einem gemeinsamen Raum.
            Dort begleitet Echo eure Gespräche als allparteiliche Moderation – vorbereitet,
            strukturiert und in eurem Tempo.
          </p>
        </div>

        <IsolationNotice />

        {isLoading ? (
          <div className="card text-sm text-brand-muted">Lade …</div>
        ) : (
          <>
            {rooms.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-navy">Eure Paarräume</h2>
                {rooms.map(room => <RoomCard key={room.id} room={room} />)}
              </div>
            )}

            {pending.map(link => <PendingInviteCard key={link.id} link={link} />)}

            {rooms.length === 0 && pending.length === 0 && <EmptyState />}
          </>
        )}

        <InviteCard hasPending={pending.length > 0} />
        <JoinCard />
      </div>
    </AppShell>
  )
}

// ── Bausteine ─────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy">Noch kein Paarraum</h2>
      <p className="mt-2 text-sm text-brand-muted">
        Ihr braucht beide ein eigenes EchoB-Konto. Eine:r von euch lädt ein, die andere Person
        löst den Kopplungscode ein – danach steht euer gemeinsamer Raum.
      </p>
    </div>
  )
}

function RoomCard({ room }: { room: CoupleLink }) {
  return (
    <Link
      to={`/app/paar/${room.id}`}
      className="card block transition hover:shadow-brand"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">
            Gemeinsamer Raum mit {room.partner_display_name || 'deiner Partnerperson'}
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            Verbunden seit {new Date(room.accepted_at ?? room.created_at).toLocaleDateString('de-DE')}
          </p>
        </div>
        <span className="text-accent text-sm shrink-0">Öffnen →</span>
      </div>
    </Link>
  )
}

function PendingInviteCard({ link }: { link: CoupleLink }) {
  const qc = useQueryClient()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const withdraw = useMutation({
    mutationFn: () => coupleApi.end(link.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-links'] }),
  })

  const code = link.invite_code ?? ''

  async function copy(what: 'code' | 'link') {
    await navigator.clipboard.writeText(what === 'code' ? formatCoupleCode(code) : coupleInviteLink(code))
    setCopied(what)
    setTimeout(() => setCopied(null), 2000)
  }

  if (link.role !== 'initiator') {
    return (
      <div className="card text-sm text-brand-muted">Deine Einladung wartet noch auf Bestätigung.</div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy">Einladung wartet</h2>
      <p className="mt-2 text-sm text-brand-muted">
        Gib diesen Code an die Person weiter, mit der du den Raum teilen möchtest.
        Sobald sie ihn einlöst, ist euer Raum offen.
      </p>

      <div className="mt-4 rounded-brand border border-brand-border bg-white px-4 py-3 text-center">
        <p className="text-xl font-bold tracking-[0.2em] text-navy">{formatCoupleCode(code)}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => copy('code')} className="btn-outline !py-2 !px-4 !text-sm">
          {copied === 'code' ? 'Kopiert ✓' : 'Code kopieren'}
        </button>
        <button onClick={() => copy('link')} className="btn-outline !py-2 !px-4 !text-sm">
          {copied === 'link' ? 'Kopiert ✓' : 'Einladungslink kopieren'}
        </button>
        <button
          onClick={() => { if (confirm('Einladung wirklich zurückziehen?')) withdraw.mutate() }}
          disabled={withdraw.isPending}
          className="ml-auto text-xs text-red-600 hover:underline disabled:opacity-50"
        >
          Zurückziehen
        </button>
      </div>
    </div>
  )
}

function InviteCard({ hasPending }: { hasPending: boolean }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['cases'], queryFn: casesApi.list })
  const cases = (data?.cases ?? []).filter(c => !c.archived_at)
  const [caseId, setCaseId] = useState('')

  const create = useMutation({
    mutationFn: () => coupleApi.create(caseId || null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-links'] }),
  })

  if (hasPending) return null

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy">Partner:in einladen</h2>
      <p className="mt-2 text-sm text-brand-muted">
        Du bekommst einen Kopplungscode zum Weitergeben.
      </p>

      {cases.length > 0 && (
        <label className="mt-4 block">
          <span className="text-xs font-medium text-navy">Bezug zu einem Fall (optional)</span>
          <select value={caseId} onChange={e => setCaseId(e.target.value)} className="input mt-1">
            <option value="">Ohne Fallbezug</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.person_name || c.main_concern || 'Fall'}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-brand-muted">
            Der Fallbezug hilft dir später beim Vorbereiten. Deine Partnerperson bekommt dadurch
            keinen Einblick in diesen Fall.
          </span>
        </label>
      )}

      <button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="btn-primary !py-2 !px-5 !text-sm mt-4 disabled:opacity-50"
      >
        {create.isPending ? 'Erstelle …' : 'Kopplungscode erstellen'}
      </button>
    </div>
  )
}

function JoinCard() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy">Code einlösen</h2>
      <p className="mt-2 text-sm text-brand-muted">
        Du hast einen Kopplungscode bekommen? Gib ihn hier ein.
      </p>
      <form
        onSubmit={e => { e.preventDefault(); if (code.trim()) navigate(`/app/paar/beitreten/${code.trim()}`) }}
        className="mt-3 flex flex-wrap gap-2"
      >
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="ABCD-2345"
          className="input flex-1 min-w-[180px] tracking-[0.15em] uppercase"
        />
        <button type="submit" disabled={!code.trim()} className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50">
          Weiter
        </button>
      </form>
    </div>
  )
}
