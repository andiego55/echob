/**
 * Die Nachfrage: „Vor einer Woche habt ihr X vereinbart – wie lief das?"
 *
 * Ohne diese Frage ist eine Abmachung nur ein guter Vorsatz. Drei Antworten sind möglich:
 * hat geklappt (schließt ab), noch dran (fragt in einer Woche wieder), lassen wir
 * (verwirft ehrlich, statt es still verfallen zu lassen).
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coupleAgreementsApi } from '@/api/coupleAgreements'
import type { CoupleAgreement } from '@/api/coupleAgreements'
import { apiErrorMessage } from '@/api/errors'

export default function DueAgreementsCard({ coupleId }: { coupleId: string }) {
  const { data: faellig = [] } = useQuery({
    queryKey: ['couple-agreements-due', coupleId],
    queryFn: () => coupleAgreementsApi.listDue(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  if (faellig.length === 0) return null

  return (
    <div className="card border-l-4 border-l-green-400">
      <h2 className="text-sm font-bold text-navy">
        Wie lief es?
        {faellig.length > 1 && (
          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[0.65rem] font-semibold text-green-800">
            {faellig.length}
          </span>
        )}
      </h2>
      <p className="mt-1 text-xs text-brand-muted">
        Ihr habt euch etwas vorgenommen und einen Termin dafür gesetzt. Der ist jetzt da.
      </p>
      <div className="mt-4 space-y-3">
        {faellig.map(a => <DueRow key={a.id} agreement={a} coupleId={coupleId} />)}
      </div>
    </div>
  )
}

function DueRow({ agreement, coupleId }: { agreement: CoupleAgreement; coupleId: string }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [notizOffen, setNotizOffen] = useState(false)

  const review = useMutation({
    mutationFn: (outcome: 'kept' | 'again' | 'dropped') =>
      coupleAgreementsApi.review(agreement.id, { outcome, note: note.trim() || null }),
    onSuccess: () => {
      for (const key of [
        ['couple-agreements-due', coupleId],
        ['couple-agreements', coupleId],
        ['couple-dashboard', coupleId],
        ['couple-progress', coupleId],
      ]) qc.invalidateQueries({ queryKey: key })
    },
  })

  const seit = agreement.due_at
    ? new Date(agreement.due_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })
    : null

  return (
    <div className="rounded-brand border border-brand-border px-3.5 py-3">
      <p className="text-sm font-medium text-navy">{agreement.body}</p>
      {seit && <p className="mt-0.5 text-[0.7rem] text-brand-muted">Vereinbart bis {seit}</p>}

      {notizOffen && (
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={500}
          placeholder="Ein Satz dazu, wie es lief (optional)"
          className="input mt-2.5 !text-xs"
        />
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => review.mutate('kept')}
          disabled={review.isPending}
          className="btn-primary !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
        >
          Hat geklappt
        </button>
        <button
          onClick={() => review.mutate('again')}
          disabled={review.isPending}
          className="btn-outline !py-1.5 !px-3.5 !text-xs disabled:opacity-50"
        >
          Noch dran
        </button>
        <button
          onClick={() => review.mutate('dropped')}
          disabled={review.isPending}
          className="text-xs text-brand-muted hover:text-navy disabled:opacity-50"
        >
          Lassen wir
        </button>
        {!notizOffen && (
          <button
            onClick={() => setNotizOffen(true)}
            className="ml-auto text-xs text-accent hover:underline"
          >
            + Notiz
          </button>
        )}
      </div>

      {review.isError && (
        <p className="mt-2 text-xs text-red-600">{apiErrorMessage(review.error)}</p>
      )}
    </div>
  )
}
