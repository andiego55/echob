import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { professionalApi } from '@/api/professional'
import ProfessionalAvvGate from '@/components/professional/ProfessionalAvvGate'

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
  // Art. 28: Bis der AVV abgeschlossen ist, blockiert das Gate den gesamten Bereich.
  // Fail-open (wie das Einwilligungs-Gate): nur bei explizitem false sperren – fehlt das
  // Feld (z. B. Backend noch nicht deployt), wird NICHT gesperrt, um Aussperren zu vermeiden.
  if (data.avv_accepted === false) return <ProfessionalAvvGate />
  return <>{children}</>
}

export { Spinner }
