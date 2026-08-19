/**
 * Was seit deinem letzten Besuch im Paarraum passiert ist.
 *
 * Das Modul ist auf Züge gebaut – vorschlagen, annehmen, bestätigen, nachziehen. Ohne
 * diesen Hinweis erfährt man vom Zug der anderen Person nur zufällig.
 *
 * Technisch liegen die Meldungen im gemeinsamen Benachrichtigungskanal der App (dort sieht
 * man auch die aus dem Fachpersonenbereich). Hier zeigen wir bewusst nur die Paar-Meldungen
 * – gefiltert über das `couple_`-Präfix, ohne den geteilten Endpunkt anzufassen.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'

export default function CoupleNotices() {
  const qc = useQueryClient()
  const { data: alle = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    retry: false,
  })
  const dismiss = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const items = alle.filter(n => n.kind.startsWith('couple_'))
  if (items.length === 0) return null

  return (
    <div className="card bg-accent/[0.04]">
      <h2 className="text-sm font-bold text-navy">Neu für dich</h2>
      <div className="mt-3 space-y-2">
        {items.map(n => (
          <div
            key={n.id}
            className="flex items-start gap-3 rounded-brand border border-brand-border bg-white px-3.5 py-2.5"
          >
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-brand-text">{n.body}</p>
            <button
              onClick={() => dismiss.mutate(n.id)}
              disabled={dismiss.isPending}
              className="shrink-0 text-xs text-brand-muted hover:text-navy disabled:opacity-50"
              aria-label="Hinweis ausblenden"
            >
              Gelesen
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
