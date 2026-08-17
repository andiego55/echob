/**
 * Die Reiter-Seiten des Paarraums.
 *
 * Bewusst dünn: Jede Seite setzt den Rahmen, erklärt in einem Satz, wofür der Reiter da ist,
 * und zeigt die passende Karte. Die Arbeit steckt in den Karten, nicht hier — so bleibt die
 * Navigation eine reine Sortierfrage.
 */
import { useParams } from 'react-router-dom'
import CoupleShell from '@/components/couple/CoupleShell'
import SessionsCard from '@/components/couple/SessionsCard'
import TopicsCard from '@/components/couple/TopicsCard'
import TestsCard from '@/components/couple/TestsCard'
import AgreementsCard from '@/components/couple/AgreementsCard'
import ProgressCard from '@/components/couple/ProgressCard'
import IsolationNotice from '@/components/couple/IsolationNotice'
import CoupleSafetyNote from '@/components/couple/CoupleSafetyNote'
import EndRoomPanel from '@/components/couple/EndRoomPanel'
import { coupleApi } from '@/api/couple'
import { useQuery } from '@tanstack/react-query'

function useCoupleId() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  return coupleId
}

export function CoupleSessionsPage() {
  const coupleId = useCoupleId()
  return (
    <CoupleShell subtitle="Ein Gespräch, ein Thema, ein Ziel – begleitet von Echo.">
      <SessionsCard coupleId={coupleId} />
    </CoupleShell>
  )
}

export function CoupleTopicsPage() {
  const coupleId = useCoupleId()
  return (
    <CoupleShell subtitle="Für Themen, bei denen ihr feststeckt.">
      <div className="space-y-5">
        <TopicsCard coupleId={coupleId} />
        <div className="card bg-accent/[0.04] border-l-4 border-l-accent">
          <h2 className="text-sm font-bold text-navy">Wie eine Mediation abläuft</h2>
          <ol className="mt-2.5 space-y-1.5 text-sm text-brand-muted">
            <li>
              <span className="font-medium text-navy">1. Beide schreiben zweimal.</span> Eine
              offene Sicht, die ihr beide lest – und eine vertrauliche, die nur Echo kennt.
            </li>
            <li>
              <span className="font-medium text-navy">2. Echo erarbeitet Brücken.</span> Drei
              konkrete Vorschläge, die von beiden Seiten etwas verlangen.
            </li>
            <li>
              <span className="font-medium text-navy">3. Ihr verhandelt.</span> Übernehmen,
              ändern oder verwerfen – und darüber reden. Was trägt, wird zur Abmachung.
            </li>
          </ol>
        </div>
      </div>
    </CoupleShell>
  )
}

export function CoupleAgreementsPage() {
  const coupleId = useCoupleId()
  return (
    <CoupleShell subtitle="Das, was von euren Gesprächen bleibt.">
      <AgreementsCard coupleId={coupleId} />
    </CoupleShell>
  )
}

export function CoupleTestsPage() {
  const coupleId = useCoupleId()
  return (
    <CoupleShell subtitle="Beide ausfüllen, dann nebeneinanderlegen.">
      <TestsCard coupleId={coupleId} />
    </CoupleShell>
  )
}

export function CoupleProgressPage() {
  const coupleId = useCoupleId()
  return (
    <CoupleShell subtitle="Was ihr euch erarbeitet habt – gemeinsam, ohne Rangliste.">
      <ProgressCard coupleId={coupleId} />
    </CoupleShell>
  )
}

export function CoupleSettingsPage() {
  const coupleId = useCoupleId()
  const { data: room } = useQuery({
    queryKey: ['couple-link', coupleId],
    queryFn: () => coupleApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  return (
    <CoupleShell subtitle="Was privat bleibt, was gilt – und wie ihr wieder auseinandergeht.">
      <div className="space-y-5">
        <IsolationNotice />
        {room && <EndRoomPanel coupleId={coupleId} since={room.accepted_at ?? room.created_at} />}
        <CoupleSafetyNote />
        <p className="text-center text-[0.7rem] leading-relaxed text-brand-muted">
          EchoB ersetzt keine Paartherapie und keine Behandlung. Echo moderiert,
          stellt keine Diagnosen und spricht keine Schuld zu.
        </p>
      </div>
    </CoupleShell>
  )
}
