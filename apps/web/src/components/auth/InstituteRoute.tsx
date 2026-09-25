import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import RollenTor, { Spinner } from '@/components/auth/RollenTor'
import { instituteApi } from '@/api/institute'


/**
 * Rolle der eingeloggten Person: 200 = Ausbildungsinstitut, sonst 403. Was aus
 * welcher Antwort folgt, entscheidet <RollenTor>.
 */
export function useInstitute() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['institute-me'],
    queryFn: instituteApi.me,
    enabled: !!session,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

/** Guard für /institute/* — nur für registrierte Ausbildungsinstitute. */
export default function InstituteRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useInstitute()

  return (
    <RollenTor rolle="der Institutsbereich" data={data} isLoading={isLoading} error={error}>
      {children}
    </RollenTor>
  )
}

export { Spinner }
