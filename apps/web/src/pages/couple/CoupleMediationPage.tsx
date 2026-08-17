/**
 * /app/paar/thema/:topicId — AI-Mediation zu einem strittigen Thema (Caucus-Modell).
 *
 * Jede Person schreibt zwei Beiträge: einen offenen, den beide lesen, und einen
 * vertraulichen, den nur Echo kennt. Aus beidem erarbeitet Echo einen Vorschlag, den
 * wieder beide lesen – ohne die vertraulichen Beiträge preiszugeben.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import MarkdownMessage from '@/components/app/MarkdownMessage'
import { coupleMediationApi } from '@/api/coupleMediation'
import { apiErrorMessage } from '@/api/errors'
import type { CoupleTopicDetail } from '@/api/coupleMediation'

export default function CoupleMediationPage() {
  const { topicId = '' } = useParams<{ topicId: string }>()
  const qc = useQueryClient()
  const [open, setOpen] = useState('')
  const [priv, setPriv] = useState('')
  const [touched, setTouched] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['couple-topic', topicId],
    queryFn: () => coupleMediationApi.get(topicId),
    enabled: !!topicId,
    retry: false,
    refetchInterval: 10000,
  })

  const own = data?.perspectives.find(p => p.is_own)
  const other = data?.perspectives.find(p => !p.is_own)

  useEffect(() => {
    if (!own || touched) return
    setOpen(own.open_text ?? '')
    setPriv(own.private_text ?? '')
  }, [own, touched])

  const apply = (d: CoupleTopicDetail) => qc.setQueryData(['couple-topic', topicId], d)

  const save = useMutation({
    mutationFn: () => coupleMediationApi.savePerspective(topicId, {
      open_text: open.trim() || null, private_text: priv.trim() || null,
    }),
    onSuccess: d => { apply(d); setTouched(false) },
  })
  const mediate = useMutation({
    mutationFn: () => coupleMediationApi.mediate(topicId),
    onSuccess: apply,
  })
  const resolve = useMutation({
    mutationFn: () => coupleMediationApi.setStatus(topicId, 'resolved'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-topic', topicId] }),
  })

  if (isLoading) {
    return <AppShell><div className="mx-auto max-w-[1000px] px-6 py-8 text-sm text-brand-muted">Lade …</div></AppShell>
  }
  if (isError || !data) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1000px] px-6 py-8">
          <div className="card">
            <h1 className="text-sm font-bold text-navy">Thema nicht gefunden</h1>
            <Link to="/app/paar" className="btn-outline !py-2 !px-4 !text-sm mt-4 inline-block">Zur Übersicht</Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const { topic, mediations, both_sides_ready } = data

  return (
    <AppShell>
      <div className="mx-auto max-w-[1000px] px-6 py-8">
        <div className="mb-5">
          <Link to={`/app/paar/${topic.couple_id}`} className="text-xs text-brand-muted hover:text-navy">← Paarraum</Link>
          <span className="label mt-2 block">Mediation</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">{topic.title}</h1>
          {topic.description && (
            <p className="mt-2 text-sm text-brand-muted">{topic.description}</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Eigene Beiträge ──────────────────────────────────── */}
          <div className="card">
            <h2 className="text-sm font-bold text-navy">Deine Sicht</h2>

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-navy">Offen – das liest deine Partnerperson</span>
              <textarea
                value={open}
                onChange={e => { setOpen(e.target.value); setTouched(true) }}
                rows={6}
                placeholder="Worum geht es dir bei diesem Thema? Was brauchst du?"
                className="input mt-1.5 w-full resize-y !text-sm"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-navy">Vertraulich – das liest nur Echo</span>
              <textarea
                value={priv}
                onChange={e => { setPriv(e.target.value); setTouched(true) }}
                rows={5}
                placeholder="Was du der anderen Person (noch) nicht sagen willst, das Echo aber kennen sollte."
                className="input mt-1.5 w-full resize-y !text-sm"
              />
              <span className="mt-1.5 block text-[0.7rem] leading-relaxed text-brand-muted">
                Wie im Einzelgespräch einer Mediation: Echo nutzt das, um den Vorschlag
                tragfähig zu machen, gibt es aber nicht weiter. Deine Partnerperson sieht auch
                nicht, ob du hier etwas geschrieben hast. Schreib trotzdem nichts hinein, dessen
                Bekanntwerden für dich untragbar wäre.
              </span>
            </label>

            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || (!open.trim() && !priv.trim())}
              className="btn-primary !py-2 !px-5 !text-sm mt-4 disabled:opacity-50"
            >
              {save.isPending ? 'Speichere …' : 'Speichern'}
            </button>
            {save.isError && (
              <p className="mt-3 text-sm text-red-600">{apiErrorMessage(save.error)}</p>
            )}
          </div>

          {/* ── Sicht der anderen Person ─────────────────────────── */}
          <div className="card">
            <h2 className="text-sm font-bold text-navy">
              {other ? `Sicht von ${other.name}` : 'Sicht deiner Partnerperson'}
            </h2>
            {other?.open_text ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-brand-text">{other.open_text}</p>
            ) : (
              <p className="mt-3 text-sm text-brand-muted">
                Noch nichts geschrieben. Die Mediation startet, sobald ihr beide eure offene
                Sicht hinterlegt habt.
              </p>
            )}
          </div>
        </div>

        {/* ── Mediation ──────────────────────────────────────────── */}
        <div className="card mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-navy">Echos Vorschlag</h2>
              <p className="mt-1 text-xs text-brand-muted">
                Gemeinsame Interessen, beide Innensichten, drei konkrete Brücken – und ein
                fairer Weg, falls keine trägt.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <button
                onClick={() => mediate.mutate()}
                disabled={!both_sides_ready || mediate.isPending}
                className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
              >
                {mediate.isPending
                  ? 'Echo arbeitet …'
                  : mediations.length ? 'Neu erarbeiten' : 'Mediation starten'}
              </button>
              {topic.status === 'open' && mediations.length > 0 && (
                <button
                  onClick={() => resolve.mutate()}
                  disabled={resolve.isPending}
                  className="btn-outline !py-2 !px-4 !text-sm disabled:opacity-50"
                >
                  Thema geklärt
                </button>
              )}
            </div>
          </div>

          {mediate.isError && (
            <p className="mt-3 text-sm text-red-600">{apiErrorMessage(mediate.error)}</p>
          )}

          {!both_sides_ready && (
            <p className="mt-3 rounded-brand bg-brand-bg px-3.5 py-2.5 text-xs text-brand-muted">
              Die Mediation braucht beide Seiten – so wird sie nicht einseitig.
            </p>
          )}

          {mediations.length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">Noch kein Vorschlag.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {mediations.map(m => (
                <div key={m.id} className="rounded-brand border border-brand-border px-4 py-3.5">
                  <p className="text-[0.65rem] text-brand-muted">
                    {new Date(m.created_at).toLocaleString('de-DE')}
                  </p>
                  <div className="mt-2 text-sm text-brand-text">
                    <MarkdownMessage content={m.body} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
