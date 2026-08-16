/**
 * /app/paar/:coupleId — der gemeinsame Paarraum.
 *
 * Fundament (Phase 1): Raum-Kopf, Vertrauens-Hinweis, Verbindung lösen. Die Sitzungen,
 * die Vorbereitung und die Moderation durch Echo bauen in den Folgephasen darauf auf.
 */
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import { coupleApi } from '@/api/couple'
import IsolationNotice from '@/components/couple/IsolationNotice'

export default function CoupleRoomPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: room, isLoading, isError } = useQuery({
    queryKey: ['couple-link', coupleId],
    queryFn: () => coupleApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const end = useMutation({
    mutationFn: () => coupleApi.end(coupleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-links'] })
      navigate('/app/paar')
    },
  })

  if (isLoading) {
    return <AppShell><div className="mx-auto max-w-[900px] px-6 py-8 text-sm text-brand-muted">Lade …</div></AppShell>
  }

  if (isError || !room) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[900px] px-6 py-8">
          <div className="card">
            <h1 className="text-sm font-bold text-navy">Paarraum nicht gefunden</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Dieser Raum existiert nicht oder wurde beendet.
            </p>
            <Link to="/app/paar" className="btn-outline !py-2 !px-4 !text-sm mt-4 inline-block">
              Zur Übersicht
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const partner = room.partner_display_name || 'deiner Partnerperson'

  return (
    <AppShell>
      <div className="mx-auto max-w-[900px] px-6 py-8 space-y-6">
        <div>
          <Link to="/app/paar" className="text-xs text-brand-muted hover:text-navy">← Paarräume</Link>
          <span className="label mt-2 block">Gemeinsamer Raum</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">Mit {partner}</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Hier bereitet ihr Gespräche vor und führt sie – begleitet von Echo als
            allparteilicher Moderation.
          </p>
        </div>

        <IsolationNotice />

        <div className="card">
          <h2 className="text-sm font-bold text-navy">Verbindung</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Ihr seid seit {new Date(room.accepted_at ?? room.created_at).toLocaleDateString('de-DE')} verbunden.
          </p>
          <button
            onClick={() => {
              if (confirm('Verbindung wirklich beenden? Der gemeinsame Raum wird für euch beide geschlossen.')) end.mutate()
            }}
            disabled={end.isPending}
            className="mt-3 text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            {end.isPending ? 'Beende …' : 'Verbindung beenden'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
