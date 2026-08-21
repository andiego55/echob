/**
 * Dialogvorschlag und -einladung.
 *
 * Wer das Gespräch vorbereitet hat, schlägt es vor; die andere Person nimmt an oder legt es
 * zurück in die Vorbereitung. Danach lässt sich ein Zeitpunkt verabreden. Ein „Nein" ist
 * hier bewusst kein Abbruch, sondern ein „noch nicht".
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { coupleSessionsApi } from '@/api/coupleSessions'
import type { CoupleSession } from '@/api/coupleSessions'

export default function ProposalBar({ session }: { session: CoupleSession }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [when, setWhen] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['couple-session', session.id] })

  const propose = useMutation({ mutationFn: () => coupleSessionsApi.propose(session.id), onSuccess: refresh })
  const respond = useMutation({
    mutationFn: (accept: boolean) => coupleSessionsApi.respond(session.id, accept),
    onSuccess: refresh,
  })
  const schedule = useMutation({
    mutationFn: (value: string | null) => coupleSessionsApi.schedule(session.id, value),
    onSuccess: refresh,
  })

  const mine = user?.id === session.created_by
  const accepted = !!session.accepted_at

  if (session.status === 'closed' || session.status === 'open') {
    return session.scheduled_for ? (
      <p className="text-xs text-brand-muted">
        Verabredet für {new Date(session.scheduled_for).toLocaleString('de-DE')}
      </p>
    ) : null
  }

  return (
    <div className="card bg-brand-bg/60">
      {session.status === 'draft' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy">
              {session.declined_at ? 'Gerade passt es nicht' : 'Noch in Vorbereitung'}
            </p>
            <p className="mt-0.5 text-xs text-brand-muted">
              {session.declined_at
                ? 'Die andere Person möchte noch nicht. Du kannst es später erneut vorschlagen.'
                : 'Nur du siehst dieses Gespräch. Schlag es vor, wenn du so weit bist.'}
            </p>
          </div>
          {mine && (
            <button
              onClick={() => propose.mutate()}
              disabled={propose.isPending}
              className="btn-primary !py-2 !px-4 !text-sm shrink-0 disabled:opacity-50"
            >
              {propose.isPending ? 'Schlage vor …' : 'Gespräch vorschlagen'}
            </button>
          )}
        </div>
      )}

      {session.status === 'proposed' && !accepted && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy">
              {mine ? 'Vorgeschlagen' : 'Du bist eingeladen'}
            </p>
            <p className="mt-0.5 text-xs text-brand-muted">
              {mine
                ? 'Warte auf die Antwort der anderen Person.'
                : 'Möchtest du dieses Gespräch führen? Du kannst auch später zusagen.'}
            </p>
          </div>
          {!mine && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => respond.mutate(true)}
                disabled={respond.isPending}
                className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
              >
                Ja, gern
              </button>
              <button
                onClick={() => respond.mutate(false)}
                disabled={respond.isPending}
                className="btn-quiet !py-2 !px-4 !text-sm disabled:opacity-50"
              >
                Noch nicht
              </button>
            </div>
          )}
        </div>
      )}

      {accepted && (
        <div>
          <p className="text-sm font-semibold text-navy">Ihr seid euch einig</p>
          <p className="mt-0.5 text-xs text-brand-muted">
            {session.scheduled_for
              ? `Verabredet für ${new Date(session.scheduled_for).toLocaleString('de-DE')}.`
              : 'Verabredet euch auf einen Zeitpunkt – oder legt einfach los.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={when}
              onChange={e => setWhen(e.target.value)}
              className="input !text-xs !py-1.5 w-auto"
            />
            <button
              onClick={() => schedule.mutate(when ? new Date(when).toISOString() : null)}
              disabled={schedule.isPending}
              className="btn-quiet !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
            >
              {session.scheduled_for ? 'Termin ändern' : 'Termin setzen'}
            </button>
            {session.scheduled_for && (
              <button
                onClick={() => { setWhen(''); schedule.mutate(null) }}
                disabled={schedule.isPending}
                className="text-xs text-brand-muted hover:text-navy disabled:opacity-50"
              >
                Termin entfernen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
