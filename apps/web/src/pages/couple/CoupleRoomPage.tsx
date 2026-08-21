/**
 * /app/paar/:coupleId — Übersicht des Paarraums.
 *
 * Beantwortet die eine Frage, die zählt: was ist gerade dran. Alles Weitere liegt hinter
 * den Reitern, statt sich auf einer endlosen Seite zu stapeln.
 */
import { Link, useParams } from 'react-router-dom'
import CoupleShell from '@/components/couple/CoupleShell'
import CoupleDashboard from '@/components/couple/CoupleDashboard'

export default function CoupleRoomPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()

  return (
    <CoupleShell
      subtitle="Was gerade dran ist – und was warten kann."
      /* Der einzige Weg im Modul, der sofort erreichbar sein MUSS: Wer die App mitten im
         Streit oeffnet, soll nicht scannen muessen. Deshalb im Kopf und nicht nur als
         Karte weiter unten - dort steht er zusaetzlich, mit mehr Erklaerung. */
      aktion={
        <Link
          to={`/app/paar/${coupleId}/streit`}
          className="btn-quiet !py-2 !px-4 !text-sm"
          title="Erst runterkommen, dann sortieren. Nur für dich."
        >
          Gerade gestritten?
        </Link>
      }
    >
      <div className="space-y-5">
        <CoupleDashboard coupleId={coupleId} />
      </div>
    </CoupleShell>
  )
}
