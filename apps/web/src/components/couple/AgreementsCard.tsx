/**
 * Abmachungen des Paarraums – das, was von den Gesprächen bleibt.
 *
 * Eine Person schlägt vor, die andere stimmt zu. Erst dann gilt eine Abmachung. Danach
 * lässt sich festhalten, ob sie gehalten hat.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { coupleAgreementsApi } from '@/api/coupleAgreements'
import Avatar from '@/components/Avatar'
import { useCoupleFaces } from './useCoupleFaces'
import type { CoupleAgreement } from '@/api/coupleAgreements'
import Fehlermeldung from '@/components/Fehlermeldung'

const STATUS_CHIP: Record<CoupleAgreement['status'], { label: string; cls: string }> = {
  proposed: { label: 'Wartet auf Zustimmung', cls: 'bg-brand-bg text-brand-muted' },
  active:   { label: 'Gilt',                  cls: 'bg-accent/10 text-accent' },
  kept:     { label: 'Gehalten',              cls: 'bg-green-50 text-green-700' },
  dropped:  { label: 'Verworfen',             cls: 'bg-brand-bg text-brand-muted' },
}

export default function AgreementsCard({
  coupleId, sessionId = null,
}: { coupleId: string; sessionId?: string | null }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { faceFor } = useCoupleFaces(coupleId)
  const [body, setBody] = useState('')

  const { data: agreements = [] } = useQuery({
    queryKey: ['couple-agreements', coupleId],
    queryFn: () => coupleAgreementsApi.list(coupleId),
    enabled: !!coupleId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['couple-agreements', coupleId] })

  const propose = useMutation({
    mutationFn: () => coupleAgreementsApi.propose(coupleId, { body: body.trim(), session_id: sessionId }),
    onSuccess: () => { invalidate(); setBody('') },
  })
  // Zuruecknehmen ist etwas anderes als verwerfen: Es loescht einen Vorschlag, dem niemand
  // zugestimmt hat, statt ihn als "Verworfen" stehen zu lassen. Fuer einen Vertipper ist
  // "wir haben es versucht und aufgegeben" die falsche Geschichte.
  const withdraw = useMutation({
    mutationFn: (id: string) => coupleAgreementsApi.withdraw(id),
    onSuccess: invalidate,
  })
  const accept = useMutation({
    mutationFn: (id: string) => coupleAgreementsApi.accept(id),
    onSuccess: invalidate,
  })
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: 'kept' | 'dropped' }) =>
      coupleAgreementsApi.setStatus(v.id, v.status),
    onSuccess: invalidate,
  })

  const open = agreements.filter(a => a.status === 'proposed' || a.status === 'active')
  const done = agreements.filter(a => a.status === 'kept' || a.status === 'dropped')

  return (
    <div className="card">
      <h2 className="card-title">Eure Abmachungen</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Klein genug, um sie wirklich einzuhalten. Sie gilt, sobald ihr beide zugestimmt habt.
      </p>

      <form
        onSubmit={e => { e.preventDefault(); if (body.trim()) propose.mutate() }}
        className="mt-4 flex flex-wrap gap-2"
      >
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="z. B. „Wir reden sonntags 20 Minuten über die Woche.“"
          className="input flex-1 min-w-[220px] !text-sm"
        />
        <button type="submit" disabled={!body.trim() || propose.isPending} className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50">
          {propose.isPending ? 'Schlage vor …' : 'Vorschlagen'}
        </button>
      </form>

      <Fehlermeldung error={propose.error ?? accept.error ?? setStatus.error ?? withdraw.error} className="mt-3" />

      {agreements.length === 0 ? (
        <p className="mt-4 text-sm text-brand-muted">Noch keine Abmachung.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {[...open, ...done].map(a => {
            const chip = STATUS_CHIP[a.status]
            const mine = user?.id === a.proposed_by
            return (
              <div key={a.id} className="rounded-brand border border-brand-border px-3.5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Avatar value={faceFor(a.proposed_by).avatar} size="sm" className="mt-0.5" />
                  <p className="min-w-0 flex-1 text-sm text-brand-text">{a.body}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${chip.cls}`}>
                    {chip.label}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {a.status === 'proposed' && (mine
                    ? <>
                        <span className="text-xs text-brand-muted">
                          Warte auf die Zustimmung der anderen Person.
                        </span>
                        <button
                          onClick={() => withdraw.mutate(a.id)}
                          disabled={withdraw.isPending}
                          className="text-xs text-brand-muted hover:text-navy disabled:opacity-50"
                          title="Löscht den Vorschlag, statt ihn als „verworfen“ stehen zu lassen."
                        >
                          Zurücknehmen
                        </button>
                      </>
                    : <button
                        onClick={() => accept.mutate(a.id)}
                        disabled={accept.isPending}
                        className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                      >
                        Zustimmen
                      </button>
                  )}
                  {a.status === 'active' && (
                    <button
                      onClick={() => setStatus.mutate({ id: a.id, status: 'kept' })}
                      disabled={setStatus.isPending}
                      className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      Hat gehalten
                    </button>
                  )}
                  {(a.status === 'active' || (a.status === 'proposed' && !mine)) && (
                    <button
                      onClick={() => setStatus.mutate({ id: a.id, status: 'dropped' })}
                      disabled={setStatus.isPending}
                      className="text-xs text-brand-muted hover:text-navy disabled:opacity-50"
                    >
                      Verwerfen
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
