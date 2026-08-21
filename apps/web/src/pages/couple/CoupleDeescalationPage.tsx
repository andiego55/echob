/**
 * /app/paar/:coupleId/streit — „Wir haben uns gerade gestritten".
 *
 * Der häufigste Moment, in dem so eine App geöffnet wird, ist nicht „ich möchte ein Thema
 * anlegen", sondern der hier. Die Seite beginnt deshalb nicht bei einem Formular, sondern
 * beim Herunterkommen.
 *
 * Drei Schritte, in dieser Reihenfolge: **ankommen**, **sortieren**, **entscheiden**. Wer
 * noch im Adrenalin steckt, kann keine Lösung bauen — jeder gute Vorschlag zur falschen
 * Zeit wird als Druck erlebt.
 *
 * **Was sich geändert hat.** Vorher lag links eine 280 px breite Spalte mit früheren
 * Streits und dem Sicherheitshinweis; das Gespräch wurde dadurch schmal, ausgerechnet an
 * der Stelle, an der jemand aufgewühlt schreibt. Der Verlauf steckt jetzt in der Auswahl
 * über dem Dialog, der Hinweis in einer Zeile am Seitenende. Beides bleibt erreichbar,
 * beides kostet keine Spalte mehr.
 *
 * Technisch kein zweiter Chat-Mechanismus, sondern ein Begleiter-Faden der Art
 * `deescalation`: eigener Verlauf, eigener Prompt, dieselbe Maschinerie wie beim Begleiter.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import CoupleShell from '@/components/couple/CoupleShell'
import CoupleSafetyNote from '@/components/couple/CoupleSafetyNote'
import EchoChat from '@/components/couple/EchoChat'
import type { Impulsgruppe } from '@/components/couple/EchoChat'
import SceneFromChat from '@/components/couple/SceneFromChat'
import { coupleApi } from '@/api/couple'
import { coupleCompanionApi } from '@/api/coupleCompanion'
import { coupleMediationApi } from '@/api/coupleMediation'
import { apiErrorMessage } from '@/api/errors'

/** Einstiege für den Moment, in dem einem nichts einfällt außer Wut. */
const EINSTIEGE: Impulsgruppe[] = [
  {
    gruppe: 'Wo anfangen',
    eintraege: [
      { label: 'Ich weiß gar nicht, wo ich anfangen soll.',
        text: 'Ich weiß gar nicht, wo ich anfangen soll.' },
      { label: 'Ich bin noch richtig wütend.',
        text: 'Ich bin noch richtig wütend.' },
      { label: 'Es ging eigentlich um etwas ganz Kleines.',
        text: 'Es ging eigentlich um etwas ganz Kleines.' },
      { label: 'Wir hatten diesen Streit schon oft.',
        text: 'Wir hatten diesen Streit schon oft.' },
    ],
  },
  {
    gruppe: 'Ehrlich werden',
    eintraege: [
      { label: 'Ich glaube, ich war auch nicht fair.',
        text: 'Ich glaube, ich war auch nicht fair.' },
      { label: 'Ich fühle mich einfach nicht gesehen.',
        text: 'Ich fühle mich einfach nicht gesehen.' },
      { label: 'Ich habe Angst, dass das so bleibt.',
        text: 'Ich habe Angst, dass das bei uns so bleibt.' },
      { label: 'Ich weiß nicht, ob ich noch will.',
        text: 'Ich bin mir gerade nicht sicher, ob ich das noch will. Das macht mir selbst Angst.' },
    ],
  },
]

export default function CoupleDeescalationPage() {
  const { coupleId = '' } = useParams<{ coupleId: string }>()
  const [begonnen, setBegonnen] = useState(false)

  const link = useQuery({
    queryKey: ['couple-link', coupleId],
    queryFn: () => coupleApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  // Gleicher Schlüssel wie im Dialog — react-query bündelt das zu einer Anfrage. So weiß
  // die Seite, ob schon etwas gesagt wurde, ohne dass der Dialog es nach oben melden muss.
  const { data: gespraech } = useQuery({
    queryKey: ['couple-chat', coupleId, 'deescalation'],
    queryFn: () => coupleCompanionApi.current(coupleId, 'deescalation'),
    enabled: !!coupleId,
    retry: false,
  })

  const nachrichten = gespraech?.messages ?? []
  const laeuft = begonnen || nachrichten.length > 0

  // Einmal wahr, immer wahr - fuer diesen Besuch.
  //
  // Vorher haing das direkt an den Nachrichten des offenen Fadens. Das Zusammenfassen
  // schliesst den Faden aber, also lieferte die Abfrage danach einen leeren neuen - und die
  // Ausgaenge verschwanden ausgerechnet in dem Moment, in dem jemand sich entschieden hatte,
  // etwas zu tun. Der Riegel haelt sie stehen, bis die Seite verlassen wird.
  const [jeGeschrieben, setJeGeschrieben] = useState(false)
  useEffect(() => {
    if (nachrichten.some(m => m.role === 'user')) setJeGeschrieben(true)
  }, [nachrichten])
  const genugGesagt = jeGeschrieben

  return (
    <CoupleShell subtitle="Hier muss nichts gelöst werden. Dieser Raum gehört dir allein – die andere Person sieht nichts davon.">
      {!laeuft ? (
        <Ankommen onWeiter={() => setBegonnen(true)} />
      ) : (
        <>
          <EchoChat
            coupleId={coupleId}
            kind="deescalation"
            impulse={EINSTIEGE}
            leerTitel="Erzähl, was passiert ist"
            leerText="Nichts davon muss gut formuliert sein. Echo hört zu und ergreift für
              niemanden Partei – auch nicht für dich, denn hier liegt nur eine Seite vor."
            platzhalter="Was ist gerade passiert?"
            abschlussZuege={['abmachung', 'gespraech', 'thema']}
          />

          {genugGesagt && (
            <div className="mx-auto mt-5 max-w-[820px]">
              <div className="card card-static">
                <h2 className="card-title">Und jetzt?</h2>
                <p className="mt-1 text-xs text-brand-muted">
                  Nichts davon muss sein. Es für heute ruhen zu lassen ist auch eine Antwort.
                </p>
                <div className="mt-4 space-y-2.5">
                  <SceneFromChat
                    coupleId={coupleId}
                    caseId={link.data?.case_id ?? null}
                    genugGesagt={genugGesagt}
                  />
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <Ausgang
                      to={`/app/paar/${coupleId}`}
                      titel="Etwas dalassen"
                      text="Wenn die Verbindung gerade wichtiger ist als die Klärung."
                    />
                    <ThemaDaraus coupleId={coupleId} />
                    <Ausgang
                      to={`/app/paar/${coupleId}/gespraeche`}
                      titel="Gespräch vorschlagen"
                      text="Wenn ihr beide bereit seid, moderiert darüber zu reden."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <CoupleSafetyNote />
    </CoupleShell>
  )
}

/**
 * Schritt 1 — und der wichtigste.
 *
 * Wenn es gerade eben war, steckt der Körper im Alarm. Ein Eingabefeld an dieser Stelle
 * lädt dazu ein, im Affekt zu schreiben. Deshalb steht hier zuerst nichts zu tun.
 */
function Ankommen({ onWeiter }: { onWeiter: () => void }) {
  const [atem, setAtem] = useState(false)

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="card card-hero card-static text-center">
        <h1 className="card-title-lg">Erst ankommen</h1>
        <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-brand-text">
          Wenn es gerade eben war, ist dein Körper noch im Alarm. In dem Zustand klingt
          jeder Satz schärfer, als er gemeint ist – bei dir und bei ihr.
        </p>

        {/* Eine Atemfigur statt eines Ratschlags: Man macht es mit, statt es zu lesen. */}
        <div className="mt-6 flex flex-col items-center">
          <div className={`grid h-28 w-28 place-items-center rounded-full border-2 border-accent/30 ${
            atem ? 'atem-figur' : ''
          }`}>
            <div className="h-14 w-14 rounded-full bg-accent/20" />
          </div>
          <button
            onClick={() => setAtem(a => !a)}
            className="mt-3 text-xs text-accent hover:underline"
          >
            {atem ? 'Anhalten' : 'Vier Atemzüge mitmachen'}
          </button>
          {atem && (
            <p className="mt-1.5 text-xs text-brand-muted">
              Ausatmen länger als einatmen. Das ist der ganze Trick.
            </p>
          )}
        </div>

        <p className="mx-auto mt-6 max-w-[52ch] text-sm leading-relaxed text-brand-muted">
          <strong className="text-navy">Nichts muss heute entschieden werden.</strong>{' '}
          Kein Gespräch, keine Abmachung, keine Klärung. Wenn du kannst, geh kurz aus dem
          Raum – zwanzig Minuten sind keine Flucht, sondern das, was der Körper braucht.
        </p>

        <button onClick={onWeiter} className="btn-primary mt-6 !py-2.5 !px-6 !text-sm">
          Ich bin so weit
        </button>
        <p className="mt-2 text-xs text-brand-muted">
          Danach kannst du erzählen, was passiert ist.
        </p>
      </div>
    </div>
  )
}

function Ausgang({ to, titel, text }: { to: string; titel: string; text: string }) {
  return (
    <Link
      to={to}
      className="rounded-brand border border-brand-border px-3.5 py-3 no-underline transition hover:border-accent/50"
    >
      <p className="text-sm font-semibold text-navy">{titel}</p>
      <p className="mt-0.5 text-[0.72rem] leading-snug text-brand-muted">{text}</p>
    </Link>
  )
}

/** Wenn es nicht das erste Mal war, gehört es in die Mediation statt in ein Gespräch. */
function ThemaDaraus({ coupleId }: { coupleId: string }) {
  const navigate = useNavigate()
  const [titel, setTitel] = useState('')
  const [offen, setOffen] = useState(false)

  const anlegen = useMutation({
    mutationFn: () => coupleMediationApi.create(coupleId, { title: titel.trim() }),
    onSuccess: t => navigate(`/app/paar/thema/${t.id}`),
  })

  if (!offen) {
    return (
      <button
        onClick={() => setOffen(true)}
        className="rounded-brand border border-brand-border px-3.5 py-3 text-left transition hover:border-accent/50"
      >
        <p className="text-sm font-semibold text-navy">Thema daraus machen</p>
        <p className="mt-0.5 text-[0.72rem] leading-snug text-brand-muted">
          Wenn das nicht das erste Mal war.
        </p>
      </button>
    )
  }

  return (
    <div className="rounded-brand border border-accent/40 px-3.5 py-3 sm:col-span-3">
      <p className="text-sm font-semibold text-navy">Worum geht es im Kern?</p>
      <input
        value={titel}
        onChange={e => setTitel(e.target.value)}
        placeholder="z. B. „Wie wir Aufgaben im Haushalt verteilen“"
        className="input mt-2 !text-sm"
        autoFocus
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={() => anlegen.mutate()}
          disabled={!titel.trim() || anlegen.isPending}
          className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-50"
        >
          {anlegen.isPending ? 'Lege an …' : 'Thema anlegen'}
        </button>
        <button onClick={() => setOffen(false)} className="text-xs text-brand-muted hover:text-navy">
          Abbrechen
        </button>
      </div>
      {anlegen.isError && (
        <p className="mt-2 text-xs text-red-600">{apiErrorMessage(anlegen.error)}</p>
      )}
    </div>
  )
}
