/**
 * „Was hättest du in dem Moment gebraucht?" — von einer Szene zu einem Wunsch.
 *
 * **Der umgekehrte Weg, und für viele der einzige.** Die Traumbeziehung fragt: Was wünschst
 * du dir? Das ist für die Menschen, die hierher kommen, die schwerste Frage überhaupt. An
 * einer Szene ist dieselbe Frage plötzlich leicht: Man weiß sehr genau, was an *diesem*
 * Abend gefehlt hat. Menschen merken, was sie wollen, wenn etwas schiefgeht — in jeder
 * misslungenen Szene steckt ein Wunsch, und hier wird er eingesammelt.
 *
 * **Höchstens drei, und die Szene bleibt, wo sie ist.** Kein Wechsel auf eine andere Seite,
 * kein Formular: drei Tipps, fertig. Wer gerade eine schwere Szene aufgeschrieben hat, hat
 * keine Ausdauer für einen zweiten Vorgang.
 *
 * **Was gewählt wird, kommt in die Skizze — und ändert dort nichts, was schon dasteht.**
 * Das Gewicht ist die unangetastete Mitte (50), und die Reihenfolge bleibt unberührt: Ein
 * Wunsch, der aus einem schlechten Abend kommt, ist deshalb nicht der wichtigste. Was
 * schon in der Skizze steht, wird nicht angerührt.
 *
 * **Nicht angeboten wird er**, wenn zu dieser Beziehungsart kein Katalog existiert (etwa
 * bei „Sonstiges"), und nicht, solange eine blinde Neufassung läuft — dann würde hier in
 * eine Skizze geschrieben, die die Person gerade absichtlich nicht sieht.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Fehlermeldung from '@/components/Fehlermeldung'
import AspektWahl from '@/components/app/kompass/AspektWahl'
import { idealApi } from '@/api/kompassIdeal'

/** Höchstens so viele je Szene. Drei Tipps sind ein Nebenbei, zehn sind ein Vorgang. */
const MAX_JE_SZENE = 3

/**
 * Die bestehenden Aspekte und die neuen — und wie viele nicht mehr hineinpassen.
 *
 * **Warum das eine eigene Funktion ist.** Die Skizze hat eine Obergrenze, und der Server
 * schneidet ab. Steht das Bestehende vorn (und das muss es, sonst verlöre jemand seine
 * Skizze an einen schlechten Abend), fallen genau die NEUEN heraus — lautlos. Die Person
 * tippt, drückt, und nichts passiert. Hier wird gezählt, damit die Oberfläche es sagen kann.
 *
 * Das Gewicht der Neuen ist die unangetastete Mitte: Ein Wunsch, der aus einer misslungenen
 * Szene kommt, ist deshalb nicht der wichtigste.
 */
export function zusammenfuehren(
  alt: { key: string; gewicht: number }[],
  neu: { key: string }[],
  max: number,
): { aspekte: { key: string; gewicht: number }[]; passtNicht: number } {
  const vorhanden = new Set(alt.map(a => a.key))
  const dazu = neu.filter(n => !vorhanden.has(n.key)).map(n => ({ key: n.key, gewicht: 50 }))
  const platz = Math.max(0, max - alt.length)
  return {
    aspekte: [...alt, ...dazu.slice(0, platz)],
    passtNicht: Math.max(0, dazu.length - platz),
  }
}

export default function WasGebraucht({ art }: { art: string | undefined }) {
  const qc = useQueryClient()
  const [offen, setOffen] = useState(false)
  const [wahl, setWahl] = useState<{ key: string; gewicht: number }[]>([])
  const [fertig, setFertig] = useState(false)

  const katalog = useQuery({
    queryKey: ['ideal-katalog', art],
    queryFn: () => idealApi.katalog(art),
    enabled: !!art && offen,
    staleTime: Infinity,
  })
  const skizze = useQuery({
    queryKey: ['ideal', art],
    queryFn: () => idealApi.holen(art!),
    enabled: !!art && offen,
  })

  const uebernehmen = useMutation({
    mutationFn: () => {
      const alt = skizze.data
      return idealApi.speichern(art!, {
        // Die bestehenden zuerst und unverändert — das Neue kommt dazu, nicht davor.
        aspekte: zusammenfuehren(
          (alt?.aspekte ?? []).map(a => ({ key: a.key, gewicht: a.gewicht })),
          wahl, katalog.data?.max_aspekte ?? 10,
        ).aspekte,
        reihung: alt?.reihung ?? [],
        abwaegungen: alt?.abwaegungen ?? {},
        eigenes: alt?.eigenes ?? null,
      })
    },
    onSuccess: d => {
      qc.setQueryData(['ideal', art], d)
      qc.invalidateQueries({ queryKey: ['ideale'] })
      setFertig(true)
      setOffen(false)
      setWahl([])
    },
  })

  if (!art) return null

  // Eine laufende Neufassung: hier nichts anbieten. Sonst schriebe dieser Knopf in eine
  // Skizze, die die Person gerade absichtlich nicht sieht.
  if (skizze.data?.entwurf) return null

  if (fertig) {
    return (
      <p className="mt-4 rounded-brand border border-accent/30 bg-accent/[0.05] px-4 py-3 text-[0.86rem] leading-relaxed text-navy">
        Steht jetzt in{' '}
        <Link to={`/app/kompass/traumbeziehung/${art}`}
          className="font-semibold text-accent no-underline hover:underline">
          deiner Traumbeziehung
        </Link>
        {' '}— dort kannst du gewichten und ordnen.
      </p>
    )
  }

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="group mt-4 flex w-full flex-wrap items-center justify-between gap-3 rounded-brand border border-brand-border bg-white px-5 py-4 text-left transition-all hover:border-accent/60 hover:shadow-brand-sm"
      >
        <span className="min-w-0">
          <span className="block text-[0.95rem] font-bold text-navy transition-colors group-hover:text-accent">
            Was hättest du in dem Moment gebraucht?
          </span>
          <span className="mt-1 block max-w-[58ch] text-[0.83rem] leading-snug text-brand-muted">
            Drei Tipps, und es steht in deiner Traumbeziehung. Was man sich wünscht, merkt
            man meistens dann, wenn es gefehlt hat.
          </span>
        </span>
        <span className="shrink-0 text-[0.78rem] font-semibold text-accent">Öffnen →</span>
      </button>
    )
  }

  const familien = katalog.data?.aspekt_familien ?? []
  if (katalog.isLoading || skizze.isLoading) {
    return <p className="mt-4 text-sm text-brand-muted">Einen Moment …</p>
  }
  // Zu dieser Beziehungsart gibt es keinen Katalog — dann gibt es auch nichts zu fragen.
  if (familien.length === 0) return null

  const schon = new Set((skizze.data?.aspekte ?? []).map(a => a.key))
  const { passtNicht } = zusammenfuehren(
    (skizze.data?.aspekte ?? []).map(a => ({ key: a.key, gewicht: a.gewicht })),
    wahl, katalog.data?.max_aspekte ?? 10,
  )

  return (
    <section className="mt-4 rounded-brand-lg border border-accent/30 bg-accent/[0.03] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[1rem] font-bold text-navy">
          Was hättest du in dem Moment gebraucht?
        </h2>
        <button type="button" onClick={() => { setOffen(false); setWahl([]) }}
          className="shrink-0 text-xs text-brand-muted hover:text-navy">
          Zumachen
        </button>
      </div>

      <div className="mt-3">
        <AspektWahl
          familien={familien}
          gewaehlt={wahl}
          max={MAX_JE_SZENE}
          onWahl={setWahl}
        />
      </div>

      {wahl.some(w => schon.has(w.key)) && (
        // Nicht sperren, nur sagen: Dass einem dasselbe hier noch einmal einfällt, ist
        // eine Auskunft — nur eben keine, die die Skizze verändert.
        <p className="mt-3 text-[0.78rem] leading-snug text-brand-muted">
          Etwas davon steht schon in deiner Skizze. Es kommt nicht doppelt hinein.
        </p>
      )}

      {passtNicht > 0 && (
        // Sonst tippt jemand, drückt — und nichts passiert. Der Server schneidet ab, und
        // abgeschnitten wird ausgerechnet das Neue.
        <p role="alert" className="mt-3 text-[0.82rem] leading-snug text-red-600">
          Deine Skizze ist voll ({katalog.data?.max_aspekte} Aspekte).{' '}
          {passtNicht === 1 ? 'Einer davon passt' : `${passtNicht} davon passen`} nicht mehr
          hinein — nimm in der Skizze etwas weg, um Platz zu machen.
        </p>
      )}

      <Fehlermeldung error={uebernehmen.error} className="mt-3" />

      <button
        type="button"
        onClick={() => uebernehmen.mutate()}
        disabled={wahl.length === 0 || uebernehmen.isPending}
        className="btn-primary !py-2 !px-4 !text-sm mt-4 disabled:opacity-40"
      >
        {uebernehmen.isPending ? 'Einen Moment …' : 'In meine Traumbeziehung übernehmen'}
      </button>
    </section>
  )
}
