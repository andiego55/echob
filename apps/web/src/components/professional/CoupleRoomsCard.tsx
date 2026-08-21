/**
 * Paarräume, die dieser Fachperson freigegeben wurden.
 *
 * Der Zugang steht **für sich**: Er hängt nicht daran, wessen Fall sie hat, sondern
 * daran, dass beide Personen ihr namentlich zugestimmt haben. Deshalb erscheint der Raum
 * hier auf der Übersicht — auch dann, wenn nur eine der beiden ihre Klientin ist.
 *
 * Ruhende Bitten stehen mit dabei: Hat die Fachperson selbst um Zugang gebeten, sieht sie,
 * dass die Bitte liegt und auf zwei Zustimmungen wartet.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { professionalRoomApi } from '@/api/professionalCoupleRoom'

export default function CoupleRoomsCard() {
  const { data = [] } = useQuery({
    queryKey: ['prof-rooms'],
    queryFn: professionalRoomApi.list,
    retry: false,
  })

  if (data.length === 0) return null

  return (
    <div className="mb-6 rounded-brand border border-brand-border bg-white p-4">
      <h2 className="text-sm font-semibold text-navy">Paarräume</h2>
      <p className="mt-0.5 text-xs text-brand-muted">
        Von beiden Personen gemeinsam freigegeben. Jede kann die Freigabe jederzeit allein
        beenden.
      </p>
      <div className="mt-3 space-y-2">
        {data.map(raum => {
          const namen = raum.members.map(m => m.name).join(' & ') || 'Paarraum'
          if (!raum.readable) {
            return (
              <div key={raum.id}
                className="rounded-brand border border-dashed border-brand-border px-3.5 py-2.5">
                <p className="text-sm font-medium text-navy">{namen}</p>
                <p className="mt-0.5 text-xs text-brand-muted">
                  {raum.status === 'pending'
                    ? 'Wartet auf die Zustimmung beider Personen.'
                    : 'Nicht mehr zugänglich.'}
                </p>
              </div>
            )
          }
          return (
            <Link
              key={raum.id}
              to={`/professional/paarraum/${raum.couple_id}`}
              className="flex items-center justify-between gap-3 rounded-brand border border-brand-border px-3.5 py-2.5 no-underline transition hover:border-accent/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy">{namen}</p>
                <p className="mt-0.5 text-xs text-brand-muted">
                  {raum.elements.length} {raum.elements.length === 1 ? 'Bereich' : 'Bereiche'} freigegeben
                </p>
              </div>
              <span className="shrink-0 text-xs text-accent">Öffnen →</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
