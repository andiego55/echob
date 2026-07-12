import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'

/**
 * Zeigt ungelesene In-App-Benachrichtigungen der nutzenden Person (z. B. „Die
 * Fachperson hat die Verbindung beendet"). Jede lässt sich wegklicken; das
 * markiert sie serverseitig als gelesen.
 */
export default function NotificationsBanner() {
  const qc = useQueryClient()
  const { data: items = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  })
  const dismiss = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (items.length === 0) return null

  return (
    <div className="mt-6 space-y-2">
      {items.map(n => (
        <div key={n.id}
          className="flex items-start gap-3 rounded-brand border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="mt-0.5 shrink-0 text-amber-700" aria-hidden>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
            </svg>
          </span>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-amber-900">{n.body}</p>
          <button
            onClick={() => dismiss.mutate(n.id)}
            disabled={dismiss.isPending}
            className="shrink-0 rounded-brand border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            OK
          </button>
        </div>
      ))}
    </div>
  )
}
