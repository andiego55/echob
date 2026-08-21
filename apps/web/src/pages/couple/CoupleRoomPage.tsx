/**
 * /app/paar/:coupleId — Übersicht des Paarraums.
 *
 * Beantwortet die eine Frage, die zählt: was ist gerade dran. Alles Weitere liegt hinter
 * den Reitern, statt sich auf einer endlosen Seite zu stapeln.
 */
import { useParams } from 'react-router-dom'
import CoupleShell from '@/components/couple/CoupleShell'
import CoupleDashboard from '@/components/couple/CoupleDashboard'

export default function CoupleRoomPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()

  return (
    <CoupleShell subtitle="Was gerade dran ist – und was warten kann.">
      <div className="space-y-5">
        <CoupleDashboard coupleId={coupleId} />
      </div>
    </CoupleShell>
  )
}
