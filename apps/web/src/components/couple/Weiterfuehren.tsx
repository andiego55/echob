/**
 * „Und daraus?" — der Übergabeblock, der am Ende jeder Station steht.
 *
 * **Das Problem, das er löst.** Der Paarraum konnte fast alles, aber er hörte überall mit
 * einem Text auf: Echo fasst ein Gespräch zusammen, vergleicht zwei Testergebnisse, schreibt
 * einen Rückblick — und dann steht man davor und nichts führt weiter. Genau ein Weg war
 * richtig gebaut (Mediation → Brücke → Abmachung → Nachfrage), und dieser eine Weg fühlte
 * sich auch so an: als käme man voran. Alle anderen endeten in Prosa.
 *
 * Dieser Block ist die Verallgemeinerung davon. Er bietet überall dieselben drei Züge an —
 * **festhalten**, **besprechen**, **klären** — und übernimmt, wo Echo konkrete Abmachungen
 * vorgeschlagen hat, jeden Vorschlag mit einem Klick. Aus einem Text wird damit ein Gegenstand,
 * der einen Termin, eine Zusage und später eine Nachfrage hat.
 *
 * **Warum drei und nicht mehr.** Mehr Auswahl heißt an dieser Stelle weniger Handlung. Die
 * drei decken ab, was nach einer Einsicht überhaupt passieren kann: etwas zusagen, gemeinsam
 * darüber reden, oder es als festgefahrenes Thema angehen. Alles andere ist Nichtstun — und
 * dafür braucht es keinen Knopf.
 *
 * Rein aufsetzend: Der Block ruft nur bestehende Endpunkte auf und kennt keine eigenen Daten.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { coupleAgreementsApi } from '@/api/coupleAgreements'
import { coupleSessionsApi } from '@/api/coupleSessions'
import { coupleMediationApi } from '@/api/coupleMediation'
import { titelVorschlag } from './abmachungsvorschlaege'
import Fehlermeldung from '@/components/Fehlermeldung'

export type Zug = 'abmachung' | 'gespraech' | 'thema'

interface Props {
  coupleId: string
  /** Von Echo vorgeschlagene Abmachungen — je eine Zeile, per Klick übernehmbar. */
  vorschlaege?: string[]
  /** Text, aus dem Titel vorbefüllt werden (Zusammenfassung, Vergleich, Wunsch …). */
  saat?: string | null
  /** Sitzung, aus der das stammt — die Abmachung merkt sich ihre Herkunft. */
  sessionId?: string | null
  /**
   * Vorbelegung für das Abmachungsfeld. Beim Check-in etwa der eigene Wunsch: Aus
   * „mehr gemeinsame Abende" wird mit zwei Handgriffen eine Abmachung, statt aus dem Nichts.
   */
  abmachungSaat?: string | null
  titel?: string
  hinweis?: string
  zuege?: Zug[]
}

export default function Weiterfuehren({
  coupleId, vorschlaege = [], saat = null, sessionId = null, abmachungSaat = null,
  titel = 'Und daraus?',
  hinweis = 'Ein Gedanke hält sich besser, wenn er einen Ort bekommt.',
  zuege = ['abmachung', 'gespraech', 'thema'],
}: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [offen, setOffen] = useState<Zug | null>(null)
  const [uebernommen, setUebernommen] = useState<Set<number>>(new Set())

  const frischen = () => {
    for (const key of [
      ['couple-agreements', coupleId],
      ['couple-agreements-due', coupleId],
      ['couple-dashboard', coupleId],
      ['couple-progress', coupleId],
    ]) qc.invalidateQueries({ queryKey: key })
  }

  const uebernehmen = useMutation({
    mutationFn: ({ text }: { text: string; index: number }) =>
      coupleAgreementsApi.propose(coupleId, { body: text, session_id: sessionId }),
    onSuccess: (_d, v) => {
      setUebernommen(s => new Set(s).add(v.index))
      frischen()
    },
  })

  const offeneVorschlaege = vorschlaege.length > 0

  return (
    <div className="card card-quiet border-l-4 border-l-accent/60">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="card-title">{titel}</h2>
        <p className="text-xs text-brand-muted">{hinweis}</p>
      </div>

      {/* ── Echos Vorschläge: ein Klick, und daraus wird eine echte Abmachung ── */}
      {offeneVorschlaege && (
        <div className="mt-4">
          <p className="section-label">Vorgeschlagen</p>
          <div className="mt-2 space-y-2">
            {vorschlaege.map((v, i) => (
              <VorschlagZeile
                key={i}
                text={v}
                fertig={uebernommen.has(i)}
                laeuft={uebernehmen.isPending && uebernehmen.variables?.index === i}
                coupleId={coupleId}
                onUebernehmen={() => uebernehmen.mutate({ text: v, index: i })}
              />
            ))}
          </div>
          <Fehlermeldung error={uebernehmen.error} />
        </div>
      )}

      {/* ── Die drei Züge ─────────────────────────────────────────────────── */}
      <div className="mt-4">
        {offeneVorschlaege && <p className="section-label">Oder selbst</p>}
        <div className={`mt-2 grid gap-2.5 ${zuege.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {zuege.map(z => (
            <ZugKachel
              key={z}
              zug={z}
              aktiv={offen === z}
              onClick={() => setOffen(o => (o === z ? null : z))}
            />
          ))}
        </div>
      </div>

      {offen === 'abmachung' && (
        <Formular
          key="abmachung"
          label="Was nehmt ihr euch vor?"
          platzhalter="z. B. „Wir reden sonntags 20 Minuten über die Woche.“"
          vorbelegt={abmachungSaat ?? ''}
          knopf="Als Abmachung festhalten"
          fuss="Die andere Person bestätigt sie. Nach einer Woche fragt Echo nach, wie es lief."
          aktion={text => coupleAgreementsApi.propose(coupleId, { body: text, session_id: sessionId })}
          danach={() => { frischen(); setOffen(null) }}
          erfolg={
            <>Liegt jetzt bei euren <Link to={`/app/paar/${coupleId}/abmachungen`} className="text-accent hover:underline">Abmachungen</Link>.</>
          }
        />
      )}

      {offen === 'gespraech' && (
        <Formular
          key="gespraech"
          label="Worüber wollt ihr sprechen?"
          platzhalter="Ein Satz genügt"
          vorbelegt={titelVorschlag(saat)}
          knopf="Gespräch anlegen"
          fuss="Moderiert von Echo. Die andere Person bekommt eine Einladung."
          aktion={text => coupleSessionsApi.create(coupleId, { title: text })}
          danach={s => { frischen(); navigate(`/app/paar/sitzung/${(s as { id: string }).id}`) }}
        />
      )}

      {offen === 'thema' && (
        <Formular
          key="thema"
          label="Worum geht es im Kern?"
          platzhalter="z. B. „Wie wir Aufgaben im Haushalt verteilen“"
          vorbelegt={titelVorschlag(saat)}
          knopf="Thema anlegen"
          fuss="Erst schreibt ihr getrennt, dann baut Echo eine Brücke."
          aktion={text => coupleMediationApi.create(coupleId, { title: text })}
          danach={t => { frischen(); navigate(`/app/paar/thema/${(t as { id: string }).id}`) }}
        />
      )}
    </div>
  )
}

/** Ein Vorschlag von Echo — davor ein Knopf, danach eine Bestätigung. */
function VorschlagZeile({
  text, fertig, laeuft, coupleId, onUebernehmen,
}: {
  text: string; fertig: boolean; laeuft: boolean; coupleId: string; onUebernehmen: () => void
}) {
  if (fertig) {
    return (
      <div className="flex items-start gap-2.5 rounded-brand border border-green-200 bg-green-50/60 px-3.5 py-2.5">
        <span aria-hidden className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-green-500 text-[0.6rem] font-bold text-white">
          ✓
        </span>
        <div className="min-w-0">
          <p className="text-sm text-brand-text line-through decoration-green-600/40">{text}</p>
          <p className="mt-0.5 text-[0.7rem] text-green-800">
            Festgehalten – liegt bei euren{' '}
            <Link to={`/app/paar/${coupleId}/abmachungen`} className="underline">Abmachungen</Link>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-brand border border-brand-border px-3.5 py-2.5 transition hover:border-accent/50 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 text-sm leading-snug text-brand-text">{text}</p>
      <button
        onClick={onUebernehmen}
        disabled={laeuft}
        className="btn-primary shrink-0 self-start !py-1.5 !px-3.5 !text-xs disabled:opacity-50 sm:self-auto"
      >
        {laeuft ? 'Übernehme …' : 'Übernehmen'}
      </button>
    </div>
  )
}

const ZUEGE: Record<Zug, { titel: string; text: string; pfad: string }> = {
  abmachung: {
    titel: 'Festhalten',
    text: 'Etwas Konkretes zusagen – mit Nachfrage in einer Woche.',
    pfad: 'M5 12.5l4.2 4.2L19 7',
  },
  gespraech: {
    titel: 'Darüber reden',
    text: 'Ein moderiertes Gespräch zu zweit.',
    pfad: 'M4 5h16v10H8l-4 4V5z',
  },
  thema: {
    titel: 'Als Thema klären',
    text: 'Wenn ihr an dieser Stelle schon länger feststeckt.',
    pfad: 'M4 17l5-5-5-5M13 17h7',
  },
}

function ZugKachel({ zug, aktiv, onClick }: { zug: Zug; aktiv: boolean; onClick: () => void }) {
  const z = ZUEGE[zug]
  return (
    <button
      onClick={onClick}
      className={`group rounded-brand border px-3.5 py-3 text-left transition-all ${
        aktiv
          ? 'border-accent bg-accent/[0.06]'
          : 'border-brand-border bg-white hover:-translate-y-0.5 hover:border-accent/50'
      }`}
    >
      <span className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden
          className={`h-4 w-4 shrink-0 ${aktiv ? 'text-accent' : 'text-brand-muted'}`}>
          <path d={z.pfad} />
        </svg>
        <span className="text-sm font-semibold text-navy">{z.titel}</span>
      </span>
      <span className="mt-1 block text-[0.72rem] leading-snug text-brand-muted">{z.text}</span>
    </button>
  )
}

/**
 * Das ausklappbare Formular hinter einem Zug.
 *
 * Vorbefüllt, wo es geht: Ein Titelvorschlag aus dem, was gerade besprochen wurde, ist
 * schneller korrigiert als ein leeres Feld gefüllt.
 */
function Formular({
  label, platzhalter, vorbelegt, knopf, fuss, aktion, danach, erfolg,
}: {
  label: string
  platzhalter: string
  vorbelegt: string
  knopf: string
  fuss: string
  aktion: (text: string) => Promise<unknown>
  danach: (ergebnis: unknown) => void
  erfolg?: React.ReactNode
}) {
  const [text, setText] = useState(vorbelegt)
  const [fertig, setFertig] = useState(false)

  const senden = useMutation({
    mutationFn: () => aktion(text.trim()),
    onSuccess: e => {
      if (erfolg) { setFertig(true); setText('') }
      danach(e)
    },
  })

  if (fertig && erfolg) {
    return (
      <div className="mt-3 rounded-brand border border-green-200 bg-green-50/60 px-3.5 py-3">
        <p className="text-sm text-green-900">{erfolg}</p>
        <button onClick={() => setFertig(false)} className="mt-1.5 text-xs text-accent hover:underline">
          Noch etwas festhalten
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (text.trim()) senden.mutate() }}
      className="mt-3 rounded-brand border border-accent/40 bg-white px-3.5 py-3"
    >
      <label className="text-sm font-semibold text-navy">{label}</label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) senden.mutate() }
        }}
        rows={2}
        maxLength={500}
        placeholder={platzhalter}
        autoFocus
        className="input mt-1.5 w-full resize-y !text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!text.trim() || senden.isPending}
          className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-50"
        >
          {senden.isPending ? 'Einen Moment …' : knopf}
        </button>
        <p className="text-[0.7rem] text-brand-muted">{fuss}</p>
      </div>
      <Fehlermeldung error={senden.error} />
    </form>
  )
}
