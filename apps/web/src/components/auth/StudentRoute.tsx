import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import RollenTor, { Spinner } from '@/components/auth/RollenTor'
import { studentApi } from '@/api/student'


/**
 * Rolle der eingeloggten Person: 200 = Student:in, sonst 403. Was aus welcher
 * Antwort folgt, entscheidet <RollenTor>.
 */
export function useStudent() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['student-me'],
    queryFn: studentApi.me,
    enabled: !!session,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

/** Guard für /student/* — nur für registrierte Studierende. */
export default function StudentRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useStudent()

  return (
    <RollenTor rolle="der Studierendenbereich" data={data} isLoading={isLoading} error={error}>
      {children}
    </RollenTor>
  )
}

export { Spinner }
