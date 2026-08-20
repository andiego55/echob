/**
 * Wer war das? – Avatar und Name zu einer Nutzer-ID im Paarraum.
 *
 * Der ganze Bereich existiert für zwei Menschen, aber in Abmachungen, Themen und
 * Sitzungslisten stand bisher „vorgeschlagen von" als Text. Ein Gesicht liest sich
 * schneller als ein Satz — und macht in jeder Liste sichtbar, dass hier zwei sind.
 *
 * In einem Paarraum gibt es genau zwei Personen. Deshalb genügt „bin ich das?" — eine
 * Zuordnungstabelle vom Server braucht es dafür nicht.
 */
import { useQuery } from '@tanstack/react-query'
import { coupleApi } from '@/api/couple'
import { profileApi } from '@/api/profile'

export interface CoupleFace {
  avatar: string | null
  name: string
  isOwn: boolean
}

export function useCoupleFaces(coupleId: string) {
  const { data: profil } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const { data: link } = useQuery({
    queryKey: ['couple-link', coupleId],
    queryFn: () => coupleApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const own: CoupleFace = {
    avatar: profil?.avatar ?? null,
    name: profil?.display_name || 'Du',
    isOwn: true,
  }
  const partner: CoupleFace = {
    avatar: link?.partner_avatar ?? null,
    name: link?.partner_display_name || 'Partnerperson',
    isOwn: false,
  }

  /** Null-sichere Zuordnung: Alles, was nicht ich bin, ist die andere Person. */
  const faceFor = (userId: string | null | undefined): CoupleFace => {
    if (!userId) return partner
    return userId === profil?.user_id ? own : partner
  }

  return { own, partner, faceFor }
}
