import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { professionalApi } from '@/api/professional'

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-accent" />
    </div>
  )
}

/** Rolle der eingeloggten Person: 200 = Fachperson, 404 → isError. */
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
  const { session, loading } = useAuth()
  const { data, isLoading, isError } = useProfessional()

  if (loading || (session && isLoading)) return <Spinner />
  if (!session) return <Navigate to="/auth" replace />
  if (isError || !data) return <Navigate to="/app" replace />
  return <>{children}</>
}

export { Spinner }
