/**
 * Der Impuls-Anreißer auf der Übersicht.
 *
 * Zeigt die Frage selbst, nicht nur die Einladung, eine zu suchen. Ein Kachel-Link mit
 * „Impulse ansehen" hätte kaum jemanden bewegt – eine konkrete Frage schon: Man beantwortet
 * sie im Kopf, noch bevor man geklickt hat, und dann ist der Klick nur noch die Formsache.
 *
 * Blendet sich aus, wenn der Katalog durch ist. Ein leerer Anreißer wäre eine Aufforderung
 * ohne Ziel.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coupleImpulsesApi } from '@/api/coupleImpulses'

export default function ImpulseTeaser({ coupleId }: { coupleId: string }) {
  const { data } = useQuery({
    queryKey: ['couple-impulses', coupleId],
    queryFn: () => coupleImpulsesApi.list(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const impuls = data?.impulses.find(i => i.slug === data.suggested)
  if (!data || !impuls) return null

  const wartetAufMich = impuls.entries.some(e => !e.is_own && e.done) && !impuls.own_done

  return (
    <Link
      to={`/app/paar/${coupleId}/impulse`}
      className={`block rounded-brand-lg border bg-white px-4 py-3.5 no-underline shadow-brand-sm transition hover:border-accent/50 ${
        wartetAufMich ? 'border-accent/40' : 'border-brand-border'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-navy">
          {wartetAufMich ? 'Ein Impuls wartet auf dich' : 'Impuls'}
          <span className="ml-2 text-[0.7rem] font-normal text-brand-muted">{impuls.title}</span>
        </p>
        <p className="text-[0.7rem] text-brand-muted">
          {impuls.duration}
          {data.done_count > 0 && ` · ${data.done_count} von ${data.total} gemacht`}
        </p>
      </div>
      <p className="mt-1.5 text-sm leading-snug text-brand-text">„{impuls.question}"</p>
      <p className="mt-1.5 text-[0.72rem] text-accent">
        {wartetAufMich
          ? 'Sie hat schon geantwortet – du siehst es, sobald du dran warst →'
          : 'Beide beantworten getrennt, danach nebeneinander ansehen →'}
      </p>
    </Link>
  )
}
