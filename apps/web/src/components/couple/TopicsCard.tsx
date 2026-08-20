/**
 * Themen in Mediation – für alles, bei dem ihr feststeckt.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coupleMediationApi } from '@/api/coupleMediation'
import { apiErrorMessage } from '@/api/errors'
import Avatar from '@/components/Avatar'
import { useCoupleFaces } from './useCoupleFaces'
import { ArtBruecke } from './CoupleEmptyArt'

// ── Mediation ─────────────────────────────────────────────────────────────────

export default function TopicsCard({ coupleId }: { coupleId: string }) {
  const qc = useQueryClient()
  const { faceFor } = useCoupleFaces(coupleId)
  const [title, setTitle] = useState('')

  const { data: topics = [] } = useQuery({
    queryKey: ['couple-topics', coupleId],
    queryFn: () => coupleMediationApi.list(coupleId),
    enabled: !!coupleId,
  })

  const create = useMutation({
    mutationFn: () => coupleMediationApi.create(coupleId, { title: title.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-topics', coupleId] })
      setTitle('')
    },
  })

  return (
    <div className="card">
      <h2 className="text-sm font-bold text-navy">Mediation</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Für Themen, bei denen ihr feststeckt. Jede:r schreibt eine offene und eine
        vertrauliche Sicht – Echo erarbeitet daraus einen Vorschlag.
      </p>

      <form
        onSubmit={e => { e.preventDefault(); if (title.trim()) create.mutate() }}
        className="mt-4 flex flex-wrap gap-2"
      >
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Strittiges Thema, z. B. „Wie wir mit Geld umgehen“"
          className="input flex-1 min-w-[220px] !text-sm"
        />
        <button type="submit" disabled={!title.trim() || create.isPending} className="btn-outline !py-2 !px-4 !text-sm disabled:opacity-50">
          {create.isPending ? 'Lege an …' : 'Thema anlegen'}
        </button>
      </form>

      {create.isError && (
        <p className="mt-3 text-sm text-red-600">{apiErrorMessage(create.error)}</p>
      )}

      {topics.length === 0 ? (
        <div className="mt-4 rounded-brand border border-dashed border-brand-border px-4 py-6 text-center">
          <ArtBruecke />
          <p className="mt-4 text-sm font-semibold text-navy">Noch kein Thema in Mediation</p>
          <p className="mx-auto mt-1.5 max-w-[52ch] text-sm leading-relaxed text-brand-muted">
            Mediation ist für das, worüber ihr schon oft gesprochen habt, ohne weiterzukommen.
            Ihr schreibt erst getrennt – offen und vertraulich – und Echo erarbeitet daraus
            drei konkrete Brücken, über die ihr dann verhandelt.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {topics.map(t => (
            <Link
              key={t.id}
              to={`/app/paar/thema/${t.id}`}
              className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-3 no-underline transition hover:border-accent/50"
            >
              <Avatar value={faceFor(t.created_by).avatar} size="sm" />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">{t.title}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${
                t.status === 'resolved' ? 'bg-green-50 text-green-700' : 'bg-brand-bg text-brand-muted'
              }`}>
                {t.status === 'resolved' ? 'Geklärt' : 'Offen'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
