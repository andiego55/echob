import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import RollenTor, { Spinner } from '@/components/auth/RollenTor'
import { professionalApi } from '@/api/professional'


/**
 * Rolle der eingeloggten Person: 200 = Fachperson, sonst 403 „Kein
 * Fachpersonen-Zugang.“ Was aus welcher Antwort folgt, entscheidet
 * <RollenTor> — hier steht nur die Abfrage.
 */
export function useProfessional() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['professional-me'],
    queryFn: professionalApi.me,
    enabled: !!session,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

/** Guard für /professional/* — nur für registrierte Fachpersonen. */
export default function ProfessionalRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useProfessional()

  // Der AVV sperrt den Bereich NICHT. Er stand frueher zwischen dem ersten Login und
  // allem anderen - drei Huerden vor dem ersten Blick sind drei Gelegenheiten, den
  // Reiter zu schliessen. Die Grenze liegt im Server: Ohne Vertrag liefern die Listen
  // nur die Spielwiese, ein echter Fall bleibt gesperrt (require_active_share).
  // Sichtbar gemacht wird das durch <AvvBanner /> in der Schale.
  return (
    <RollenTor rolle="der Fachpersonenbereich" data={data} isLoading={isLoading} error={error}>
      {children}
    </RollenTor>
  )
}

export { Spinner }
