import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { instituteApi } from '@/api/institute'

export function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-accent" />
    </div>
  )
}

/** Rolle der eingeloggten Person: 200 = Ausbildungsinstitut, 404 → isError. */
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
  const { session, loading } = useAuth()
  const { data, isLoading, isError } = useInstitute()

  if (loading || (session && isLoading)) return <Spinner />
  if (!session) return <Navigate to="/auth" replace />
  if (isError || !data) return <Navigate to="/app" replace />
  return <>{children}</>
}
