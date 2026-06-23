import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  clientInvitesApi, formatInviteCode, inviteLink, type ClientInvite,
} from '@/api/clientInvites'

/**
 * „Klient:in einladen" – Button + Modal. Die Fachperson erzeugt einen
 * persönlichen Link + Code, kopiert eine fertige Nachricht und verschickt sie
 * selbst. Die Einladung stellt nur die Verbindung her (kostenlos); ein Sitz
 * wird erst beim Aktivieren eines Falls fällig.
 */
export default function ClientInviteButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className={className || 'btn-primary'}>
        + Klient:in einladen
      </button>
      {open && <InviteModal onClose={() => setOpen(false)} />}
    </>
  )
}

function CopyButton({ value, label = 'Kopieren' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch { /* Clipboard nicht verfügbar */ }
      }}
      className="shrink-0 rounded-brand border border-brand-border px-3 py-2 text-xs font-medium text-brand-text transition-colors hover:border-accent/50 hover:text-accent"
    >
      {copied ? '✓ Kopiert' : label}
    </button>
  )
}

function buildMessage(inv: ClientInvite): string {
  return (
    `Hallo,\n\n` +
    `ich arbeite mit EchoB – einem Werkzeug, mit dem Sie Ihre Beziehungssituation in Ruhe ` +
    `strukturieren und gezielt mit mir teilen können.\n\n` +
    `So kommen Sie rein:\n` +
    `1. Diesen Link öffnen: ${inviteLink(inv.token)}\n` +
    `2. Kostenlos registrieren\n` +
    `   (alternativ bei der Registrierung den Code ${formatInviteCode(inv.code)} eingeben)\n\n` +
    `Ihre Daten bleiben bei Ihnen – Sie entscheiden selbst, was Sie mit mir teilen.`
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [created, setCreated] = useState<ClientInvite | null>(null)

  const { data: invites } = useQuery({
    queryKey: ['client-invites'], queryFn: clientInvitesApi.list,
  })

  const createM = useMutation({
    mutationFn: () => clientInvitesApi.create(label || null),
    onSuccess: (inv) => {
      setCreated(inv)
      setLabel('')
      qc.invalidateQueries({ queryKey: ['client-invites'] })
    },
  })
  const revokeM = useMutation({
    mutationFn: (id: string) => clientInvitesApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-invites'] }),
  })

  const pending = (invites ?? []).filter(i => i.status === 'pending')
  const accepted = (invites ?? []).filter(i => i.status === 'accepted')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}>
      <div className="my-auto w-full max-w-lg rounded-[1.25rem] bg-white p-6 shadow-xl sm:p-8"
        onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-navy">Klient:in zu EchoB einladen</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Erzeugen Sie einen persönlichen Link + Code und geben Sie ihn weiter – per E-Mail,
              Messenger oder in der Sitzung. Sobald die Person beitritt, ist sie mit Ihnen verbunden
              und kann ihren Fall freigeben. Kostenlos; ein Sitz wird erst beim Aktivieren eines
              Falls fällig.
            </p>
          </div>
          <button onClick={onClose} aria-label="Schließen"
            className="shrink-0 rounded-full p-1 text-brand-muted hover:bg-brand-bg hover:text-navy">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Erstellen */}
        {!created && (
          <div className="rounded-brand border border-brand-border bg-brand-bg/40 p-4">
            <label htmlFor="ci-label" className="mb-1.5 block text-sm font-medium text-brand-text">
              Interner Merker <span className="font-normal text-brand-muted">(optional, nur für Sie)</span>
            </label>
            <input id="ci-label" type="text" value={label} maxLength={120}
              onChange={e => setLabel(e.target.value)} placeholder="z. B. Frau M., Erstkontakt Di."
              className="mb-3 w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            <button onClick={() => createM.mutate()} disabled={createM.isPending}
              className="btn-primary w-full">
              {createM.isPending ? 'Wird erstellt…' : 'Einladung erstellen'}
            </button>
          </div>
        )}

        {/* Ergebnis der frisch erstellten Einladung */}
        {created && (
          <div className="rounded-brand border border-accent/40 bg-accent/[0.04] p-4">
            <p className="mb-3 text-sm font-semibold text-navy">
              ✓ Einladung erstellt{created.label ? ` · ${created.label}` : ''}
            </p>
            <Field label="Einladungslink">
              <input readOnly value={inviteLink(created.token)} onFocus={e => e.target.select()}
                className="min-w-0 flex-1 rounded-brand border border-brand-border bg-white px-3 py-2 text-xs text-brand-text outline-none" />
              <CopyButton value={inviteLink(created.token)} label="Link" />
            </Field>
            <Field label="Code (für die Registrierung)">
              <span className="flex-1 rounded-brand border border-brand-border bg-white px-3 py-2 font-mono text-sm tracking-wider text-navy">
                {formatInviteCode(created.code)}
              </span>
              <CopyButton value={formatInviteCode(created.code)} label="Code" />
            </Field>
            <Field label="Fertige Nachricht">
              <textarea readOnly rows={6} value={buildMessage(created)}
                className="min-w-0 flex-1 resize-none rounded-brand border border-brand-border bg-white px-3 py-2 text-xs leading-relaxed text-brand-text outline-none" />
            </Field>
            <div className="mt-1 flex gap-2">
              <CopyButton value={buildMessage(created)} label="Nachricht kopieren" />
              <button onClick={() => setCreated(null)}
                className="rounded-brand px-3 py-2 text-xs font-medium text-brand-muted hover:text-navy">
                Weitere Einladung erstellen
              </button>
            </div>
          </div>
        )}

        {/* Offene + angenommene Einladungen */}
        {(pending.length > 0 || accepted.length > 0) && (
          <div className="mt-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Ihre Einladungen
            </h3>
            <div className="space-y-1.5">
              {pending.map(inv => (
                <div key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-navy">
                      {inv.label || 'Ohne Merker'}{' '}
                      <span className="font-mono text-xs text-brand-muted">{formatInviteCode(inv.code)}</span>
                    </p>
                    <p className="text-[11px] text-brand-muted">Offen · wartet auf Beitritt</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CopyButton value={inviteLink(inv.token)} label="Link" />
                    <button onClick={() => revokeM.mutate(inv.id)} disabled={revokeM.isPending}
                      className="rounded-brand px-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                      Zurückziehen
                    </button>
                  </div>
                </div>
              ))}
              {accepted.map(inv => (
                <div key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-brand border border-brand-border bg-brand-bg/30 px-3 py-2">
                  <p className="truncate text-sm text-brand-muted">
                    {inv.label || 'Ohne Merker'}
                  </p>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    ✓ Beigetreten
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-medium text-brand-muted">{label}</p>
      <div className="flex items-start gap-2">{children}</div>
    </div>
  )
}
