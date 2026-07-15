import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { studentApi } from '@/api/student'

export function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-accent" />
    </div>
  )
}

/** Rolle der eingeloggten Person: 200 = Student:in, 404 → isError. */
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
  const { session, loading } = useAuth()
  const { data, isLoading, isError } = useStudent()

  if (loading || (session && isLoading)) return <Spinner />
  if (!session) return <Navigate to="/auth" replace />
  if (isError || !data) return <Navigate to="/app" replace />
  return <>{children}</>
}
