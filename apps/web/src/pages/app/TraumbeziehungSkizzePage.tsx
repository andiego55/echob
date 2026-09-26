/**
 * /app/kompass/traumbeziehung/:art — die Skizze einer gewünschten Beziehung
 *
 * **Vier Schritte, und jeder macht etwas anderes mit derselben Frage.**
 *
 *   1. *Was zählt.* Antippen, zweistufig — erst die Familie, dann die genaueren Aspekte.
 *      Wer belastet ist, hat die Worte oft nicht; ein leeres Feld liefe bei genau diesen
 *      Menschen leer. Dieselbe Bewegung wie im Gefühlsbild.
 *   2. *Wie viel davon.* Nicht „wichtig ja/nein", sondern ein Maß. „So viel Nähe" ist eine
 *      andere Auskunft als „Nähe schon".
 *   3. *Die Abwägung.* Hier wird die Skizze ehrlich. Ein Ideal ohne Abwägungen ist eine
 *      Wunschliste: Wer viel gemeinsame Zeit UND viel eigenen Raum anhakt, hat nichts
 *      gesagt.
 *   4. *Die Reihenfolge.* Was geht im Zweifel vor? Ein Abschluss, nie ein Zugang — man
 *      ordnet, was schon benannt ist.
 *
 * Dazu, ohne Schritt zu sein: die eigenen Worte. Sie stehen am Ende und wiegen schwerer als
 * alles Angetippte.
 *
 * **Warum die Schritte nicht erzwungen sind.** Ein Assistent, der durch vier Seiten führt,
 * verlangt Ausdauer von jemandem, der gerade keine hat. Die Schritte stehen nebeneinander
 * und sind einzeln anspringbar; „Weiter" ist ein Angebot, kein Tor. Dieselbe Entscheidung
 * wie im Gefühlsbild, aus demselben Grund.
 *
 * **Und es wird laufend gespeichert.** Eine Skizze ist nichts, was man „abschickt" — sie
 * wächst. Ein Speichern-Knopf würde behaupten, es gäbe einen fertigen Zustand.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/app/AppShell'
import Fehlermeldung from '@/components/Fehlermeldung'
import { PageSkeleton } from '@/components/Skeleton'
import Reihung from '@/components/app/kompass/Reihung'
import Waage from '@/components/app/kompass/Waage'
import SkizzeVergleichen from '@/components/app/kompass/SkizzeVergleichen'
import DeineSkizze from '@/components/app/kompass/DeineSkizze'
import Vorwahl from '@/components/app/kompass/Vorwahl'
import { reihungsVorschlag, type Entwurf } from '@/lib/skizzenbild'
import { useBestaetigen } from '@/components/Bestaetigung'
import {
  idealApi,
  type IdealAspektFamilie,
  type IdealKatalog,
  type IdealSpeichern,
} from '@/api/kompassIdeal'

type Schritt = 'zaehlt' | 'wieviel' | 'abwaegung' | 'reihung'

const SCHRITTE: { key: Schritt; label: string; frage: string }[] = [
  { key: 'zaehlt', label: 'Was zählt', frage: 'Was müsste da sein, damit es dir gut geht?' },
  { key: 'wieviel', label: 'Wie viel', frage: 'Und wie viel davon?' },
  { key: 'abwaegung', label: 'Die Abwägung', frage: 'Was wiegt schwerer, wenn beides nicht geht?' },
  { key: 'reihung', label: 'Die Reihenfolge', frage: 'Was geht im Zweifel vor?' },
]

// Der Zustand der Skizze liegt jetzt in `lib/skizzenbild` — dort, wo die reinen Funktionen
// stehen, die ihn in ein Bild und einen Text verwandeln. Eine Seite, die einen Typ besitzt,
// den andere brauchen, zwingt sie, aus einer Seite zu importieren.

const LEER: Entwurf = { aspekte: [], reihung: [], abwaegungen: {}, eigenes: '' }

export default function TraumbeziehungSkizzePage() {
  const { art = '' } = useParams<{ art: string }>()
  const qc = useQueryClient()
  const bestaetigen = useBestaetigen()
  const [schritt, setSchritt] = useState<Schritt>(SCHRITTE[0].key)
  const [entwurf, setEntwurf] = useState<Entwurf | null>(null)
  const [vorwahlLaeuft, setVorwahlLaeuft] = useState(false)

  const katalog = useQuery({
    queryKey: ['ideal-katalog', art],
    queryFn: () => idealApi.katalog(art),
    enabled: !!art,
    staleTime: Infinity,
  })
  const gespeichert = useQuery({
    queryKey: ['ideal', art],
    queryFn: () => idealApi.holen(art),
    enabled: !!art,
  })

  // Der Entwurf entsteht einmal aus dem Gespeicherten. Danach gehört er der Seite: Ein
  // erneutes Laden im Hintergrund darf keine Eingabe überschreiben.
  useEffect(() => {
    if (entwurf !== null || gespeichert.data === undefined) return
    const d = gespeichert.data
    setEntwurf(d ? {
      aspekte: d.aspekte.map(a => ({ key: a.key, gewicht: a.gewicht })),
      reihung: d.reihung,
      abwaegungen: d.abwaegungen,
      eigenes: d.eigenes ?? '',
    } : LEER)
  }, [entwurf, gespeichert.data])

  const sichern = useMutation({
    mutationFn: (body: IdealSpeichern) => idealApi.speichern(art, body),
    onSuccess: d => {
      qc.setQueryData(['ideal', art], d)
      qc.invalidateQueries({ queryKey: ['ideale'] })
    },
  })

  const entfernen = useMutation({
    mutationFn: () => idealApi.loeschen(art),
    onSuccess: () => {
      qc.setQueryData(['ideal', art], null)
      qc.invalidateQueries({ queryKey: ['ideale'] })
      setEntwurf(LEER)
    },
  })

  /** Ändern heißt speichern. Es gibt keinen fertigen Zustand, den man abschicken könnte. */
  const aendern = (teil: Partial<Entwurf>) => {
    const neu = { ...(entwurf ?? LEER), ...teil }
    setEntwurf(neu)
    sichern.mutate({ ...neu, eigenes: neu.eigenes.trim() || null })
  }

  const artLabel = katalog.data?.arten.find(a => a.key === art)?.label ?? art
  const aktuell = useMemo(() => SCHRITTE.find(s => s.key === schritt)!, [schritt])

  if (katalog.isLoading || entwurf === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[780px] px-6 py-8"><PageSkeleton /></div>
      </AppShell>
    )
  }

  if (katalog.error || !katalog.data?.aspekt_familien.length) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[780px] px-6 py-8">
          <div className="card">
            <h1 className="page-title card-title">Diese Beziehungsart gibt es nicht</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Vielleicht ein alter Link. Im Raum stehen alle, die es gibt.
            </p>
            <Link to="/app/kompass/traumbeziehung" className="btn-quiet !py-2 !px-4 !text-sm mt-4 inline-block">
              Zurück
            </Link>
          </div>
          <Fehlermeldung error={katalog.error} />
        </div>
      </AppShell>
    )
  }

  const kat = katalog.data
  const hatEtwas = entwurf.aspekte.length > 0
    || Object.keys(entwurf.abwaegungen).length > 0
    || !!entwurf.eigenes.trim()

  return (
    <AppShell>
      <div className="mx-auto max-w-[780px] px-6 py-8">
        <Link to="/app/kompass/traumbeziehung" className="text-xs text-brand-muted hover:text-navy">
          ← Meine Traumbeziehung
        </Link>

        <span className="label mt-3 block">{artLabel}</span>
        <h1 className="page-title mt-1">
          {kat.arten.find(a => a.key === art)?.frage ?? 'Wie hättest du es gern?'}
        </h1>

        {/* Die Vorwahl steht GANZ OBEN, solange nichts dasteht — sie ist fuer die
            Menschen da, die sonst gar nicht anfangen. Wer schon etwas angetippt hat,
            braucht sie nicht mehr und bekommt sie deshalb auch nicht mehr angeboten:
            Ein zweiter Weg neben einem begonnenen Weg ist eine Frage, keine Hilfe. */}
        {vorwahlLaeuft ? (
          <div className="mt-6">
            <Vorwahl
              familien={kat.aspekt_familien}
              onAbbruch={() => setVorwahlLaeuft(false)}
              onFertig={v => {
                aendern({ aspekte: v.aspekte, reihung: v.reihung })
                setVorwahlLaeuft(false)
                setSchritt('zaehlt')
              }}
            />
          </div>
        ) : entwurf.aspekte.length === 0 && (
          <button
            type="button"
            onClick={() => setVorwahlLaeuft(true)}
            className="group mt-6 flex w-full flex-wrap items-center justify-between gap-3 rounded-brand-lg border border-accent/40 bg-accent/[0.04] p-5 text-left transition-all hover:border-accent hover:shadow-brand-sm"
          >
            <span className="min-w-0">
              <span className="block text-[1rem] font-bold text-navy transition-colors group-hover:text-accent">
                Du weisst nicht, wo du anfangen sollst?
              </span>
              <span className="mt-1 block max-w-[58ch] text-[0.85rem] leading-snug text-brand-muted">
                Dann lass dich fragen. {kat.aspekt_familien.length - 1} Mal zwei Karten,
                jeweils: Was fehlt dir mehr? Danach steht ein Anfang da, den du aendern
                kannst.
              </span>
            </span>
            <span className="shrink-0 text-[0.78rem] font-semibold text-accent">
              Los geht{"\u2019"}s →
            </span>
          </button>
        )}


        {/* Solange die Vorwahl laeuft, tritt der Arbeitsbereich zurueck. Zwei Wege
            nebeneinander sind kein Angebot, sondern eine zusaetzliche Entscheidung —
            und die zu treffen ist genau das, was hier gerade niemand kann. */}
        {!vorwahlLaeuft && (<>
        {/* ── Die Schritte ────────────────────────────────────────────── */}
        <nav className="mt-7 flex flex-wrap gap-1.5" aria-label="Schritte">
          {SCHRITTE.map((s, i) => {
            const an = s.key === schritt
            const gefuellt =
              (s.key === 'zaehlt' && entwurf.aspekte.length > 0)
              || (s.key === 'wieviel' && entwurf.aspekte.some(a => a.gewicht !== 50))
              || (s.key === 'abwaegung' && Object.keys(entwurf.abwaegungen).length > 0)
              || (s.key === 'reihung' && entwurf.reihung.length > 0)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSchritt(s.key)}
                aria-current={an ? 'step' : undefined}
                className={[
                  'rounded-brand border px-3.5 py-2 text-[0.84rem] font-medium transition-all',
                  an
                    ? 'border-accent bg-accent text-white'
                    : gefuellt
                      ? 'border-accent/40 bg-accent/[0.06] text-navy'
                      : 'border-brand-border bg-white text-brand-muted hover:border-accent/50',
                ].join(' ')}
              >
                <span className="mr-1.5 opacity-60">{i + 1}</span>{s.label}
              </button>
            )
          })}
        </nav>

        <section className="mt-5 rounded-brand-lg border border-brand-border bg-white p-6">
          <h2 className="text-[1.2rem] font-bold leading-snug text-navy">{aktuell.frage}</h2>

          <div className="mt-4">
            {schritt === 'zaehlt' && (
              <AspektWahl
                familien={kat.aspekt_familien}
                gewaehlt={entwurf.aspekte}
                max={kat.max_aspekte}
                onWahl={aspekte => aendern({
                  aspekte,
                  // Wer einen Aspekt wegnimmt, nimmt ihn auch aus der Reihenfolge: Eine
                  // Ordnung über Unsichtbares wäre keine Aussage.
                  reihung: entwurf.reihung.filter(k => aspekte.some(a => a.key === k)),
                })}
              />
            )}

            {schritt === 'wieviel' && (
              <GewichtsRegler
                familien={kat.aspekt_familien}
                gewaehlt={entwurf.aspekte}
                onAendern={aspekte => aendern({ aspekte })}
              />
            )}

            {schritt === 'abwaegung' && (
              <>
                <p className="mb-4 max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
                  Beide Seiten sind gut. Es geht nicht darum, was richtig ist, sondern
                  darum, was dir mehr fehlt, wenn du nicht beides haben kannst. Eine Frage
                  nach der anderen, und jede ist ein Tipp — du kannst jederzeit aufhören.
                </p>
                <Waage
                  paare={kat.abwaegungen}
                  werte={entwurf.abwaegungen}
                  onAendern={abwaegungen => aendern({ abwaegungen })}
                  bezug={familienDerWahl(entwurf, kat)}
                />
              </>
            )}

            {schritt === 'reihung' && (
              <Reihenfolge
                entwurf={entwurf}
                kat={kat}
                onAendern={reihung => aendern({ reihung })}
              />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-4">
            <button
              onClick={() => setSchritt(SCHRITTE[Math.max(0, SCHRITTE.findIndex(s => s.key === schritt) - 1)].key)}
              disabled={schritt === SCHRITTE[0].key}
              className="text-xs text-brand-muted hover:text-navy disabled:opacity-40"
            >
              ← Zurück
            </button>
            {schritt !== SCHRITTE[SCHRITTE.length - 1].key && (
              <button
                onClick={() => setSchritt(SCHRITTE[SCHRITTE.findIndex(s => s.key === schritt) + 1].key)}
                className="text-xs font-medium text-accent hover:underline"
              >
                Weiter →
              </button>
            )}
          </div>
        </section>

        {/* Der Spiegel steht UNTER den Schritten, und das ist beim Ansehen entschieden
            worden: Zuerst stand er oben, damit ein Wiederkommer gleich sieht, was dasteht.
            In der Attrappe war dann zu sehen, was das am Telefon anrichtet — er WAECHST
            beim Antippen, und damit schiebt sich die Karte, auf die man gerade tippt, nach
            unten weg. Etwas, das sich unter dem Finger bewegt, ist ein Fehler und kein
            Feature. Nach unten wachsen darf er. */}
        <DeineSkizze entwurf={entwurf} vokabular={kat} />

        {/* ── In eigenen Worten ───────────────────────────────────────── */}
        <section className="mt-5 rounded-brand-lg border border-brand-border bg-white p-6">
          <h2 className="text-[1.05rem] font-bold text-navy">In deinen eigenen Worten</h2>
          <p className="mt-1 max-w-[60ch] text-[0.86rem] leading-relaxed text-brand-muted">
            Das Angetippte ist ein Raster. Was du hier schreibst, wiegt schwerer — es ist das
            Einzige, das niemand für dich vorformuliert hat.
          </p>
          <textarea
            value={entwurf.eigenes}
            onChange={e => setEntwurf({ ...(entwurf), eigenes: e.target.value })}
            onBlur={() => aendern({})}
            rows={4}
            maxLength={kat.max_zeichen_eigenes}
            placeholder="z. B. „Ich möchte abends nach Hause kommen und nicht erst die Stimmung abtasten müssen.“"
            className="input mt-3 w-full resize-y !text-sm"
          />
        </section>

        <Fehlermeldung error={sichern.error ?? entfernen.error} className="mt-3" />

        {/* Ganz unten, und das ist eine Entscheidung über die Reihenfolge: Erst denkt
            jemand darüber nach, was er sich wünscht. Erst danach steht die Frage da, wie
            es tatsächlich ist. Umgekehrt wäre die Skizze von Anfang an eine Antwort auf
            einen Fall — und damit kein Wunsch mehr, sondern eine Beschwerde. */}
        <SkizzeVergleichen art={art} artLabel={artLabel} leer={!hatEtwas} />

        {hatEtwas && (
          <button
            onClick={async () => {
              const ok = await bestaetigen({
                titel: 'Diese Skizze verwerfen?',
                text: 'Alles, was du hier ausgewählt und geschrieben hast, ist danach weg. '
                  + 'Die anderen Beziehungsarten bleiben unberührt.',
                knopf: 'Verwerfen',
                gefahr: true,
              })
              if (ok) entfernen.mutate()
            }}
            className="mt-6 text-xs text-brand-muted hover:text-red-500"
          >
            Skizze verwerfen
          </button>
        )}
        </>)}
      </div>
    </AppShell>
  )
}

// ── Schritt 1: Was zählt ─────────────────────────────────────────────────────

function AspektWahl({ familien, gewaehlt, max, onWahl }: {
  familien: IdealAspektFamilie[]
  gewaehlt: { key: string; gewicht: number }[]
  max: number
  onWahl: (aspekte: { key: string; gewicht: number }[]) => void
}) {
  const [offen, setOffen] = useState<string | null>(familien[0]?.key ?? null)
  const keys = new Set(gewaehlt.map(a => a.key))

  const umschalten = (key: string) => {
    if (keys.has(key)) return onWahl(gewaehlt.filter(a => a.key !== key))
    if (gewaehlt.length >= max) return
    onWahl([...gewaehlt, { key, gewicht: 50 }])
  }

  const familie = familien.find(f => f.key === offen)

  return (
    <div>
      <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
        Tipp erst das grobe Wort an — dann kommen die genaueren. Höchstens {max}: Wer alles
        anhakt, hat nichts gesagt, und das Auswählen ist hier die eigentliche Arbeit.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {familien.map(f => {
          const auf = offen === f.key
          const darin = f.aspekte.filter(a => keys.has(a.key)).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setOffen(auf ? null : f.key)}
              aria-expanded={auf}
              className={[
                'rounded-full border px-4 py-2 text-[0.9rem] font-medium transition-all',
                auf
                  ? 'border-navy bg-navy text-white'
                  : darin > 0
                    ? 'border-accent/50 bg-accent/[0.08] text-navy'
                    : 'border-brand-border bg-white text-brand-text hover:border-accent/50',
              ].join(' ')}
            >
              {f.label}
              {darin > 0 && <span className="ml-1.5 text-accent">·{darin}</span>}
            </button>
          )
        })}
      </div>

      {familie && (
        <div className="mt-4 rounded-brand border border-brand-border bg-brand-bg p-5">
          <p className="text-[0.8rem] text-brand-muted">{familie.hinweis}</p>
          <div className="mt-3 space-y-2">
            {familie.aspekte.map(a => {
              const an = keys.has(a.key)
              const gesperrt = !an && gewaehlt.length >= max
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => umschalten(a.key)}
                  disabled={gesperrt}
                  aria-pressed={an}
                  className={[
                    'block w-full rounded-brand border px-3.5 py-2.5 text-left transition-all',
                    an
                      ? 'border-accent bg-accent text-white'
                      : 'border-brand-border bg-white hover:border-accent/60 disabled:opacity-40 disabled:hover:border-brand-border',
                  ].join(' ')}
                >
                  <span className="block text-sm font-medium leading-snug">{a.label}</span>
                  <span className={`mt-0.5 block text-[0.75rem] leading-snug ${
                    an ? 'text-white/80' : 'text-brand-muted'
                  }`}>
                    {a.hinweis}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-4 text-[0.78rem] text-brand-muted">
        {gewaehlt.length} von {max} gewählt
        {gewaehlt.length >= max && ' — nimm etwas weg, um Platz zu machen.'}
      </p>
    </div>
  )
}

// ── Schritt 2: Wie viel ──────────────────────────────────────────────────────

function GewichtsRegler({ familien, gewaehlt, onAendern }: {
  familien: IdealAspektFamilie[]
  gewaehlt: { key: string; gewicht: number }[]
  onAendern: (aspekte: { key: string; gewicht: number }[]) => void
}) {
  const label = (key: string) =>
    familien.flatMap(f => f.aspekte).find(a => a.key === key)?.label ?? key

  if (gewaehlt.length === 0) {
    return (
      <p className="text-sm text-brand-muted">
        Noch nichts ausgewählt. Der erste Schritt sammelt, dieser wiegt ab.
      </p>
    )
  }

  return (
    <div>
      <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
        Nicht „wichtig oder nicht" — das hast du im ersten Schritt entschieden. Hier geht es
        um das Maß: Ein bisschen Verlässlichkeit ist etwas anderes als sehr viel davon.
      </p>

      <ul className="mt-5 space-y-4">
        {gewaehlt.map(a => (
          <li key={a.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-navy">{label(a.key)}</span>
              <span className="shrink-0 text-[0.72rem] tabular-nums text-brand-muted">
                {a.gewicht <= 25 ? 'etwas' : a.gewicht <= 60 ? 'deutlich' : a.gewicht <= 85 ? 'viel' : 'sehr viel'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={a.gewicht}
              onChange={e => onAendern(gewaehlt.map(x =>
                x.key === a.key ? { ...x, gewicht: Number(e.target.value) } : x))}
              aria-label={`Wie viel ${label(a.key)}`}
              className="kompass-regler mt-1.5 w-full"
              style={{ ['--fuellung' as string]: `${a.gewicht}%` }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Schritt 4: die Reihenfolge ───────────────────────────────────────────────

// ── Schritt 4: die Reihenfolge ───────────────────────────────────────────────

/**
 * Die Familien, aus denen etwas gewählt wurde — daran richtet die Waage ihre Fragen aus.
 */
function familienDerWahl(entwurf: Entwurf, kat: IdealKatalog): string[] {
  const keys = new Set(entwurf.aspekte.map(a => a.key))
  return kat.aspekt_familien.filter(f => f.aspekte.some(a => keys.has(a.key))).map(f => f.key)
}

/**
 * „So hätte ich dich verstanden — stimmt die Reihenfolge?"
 *
 * **Vorher wurde hier zweimal dasselbe gefragt.** Schritt 2 will Gewichte, Schritt 4 wollte
 * eine Reihenfolge, die man von Hand aus Chips zusammensetzt — obwohl die Gewichte sie
 * längst gesagt haben. Wer „Sicherheit 90" und „Zärtlichkeit 40" gesetzt hat, soll nicht
 * noch einmal von vorn anfangen.
 *
 * **Der Vorschlag wird nicht gespeichert, bevor jemand ihn anfasst.** Er steht da,
 * erkennbar als Vorschlag, und die erste Bewegung — ein Pfeil oder „Stimmt so" — macht ihn
 * zur Aussage. Ein Gewicht sagt, wie viel man von etwas will; die Reihenfolge sagt, was im
 * Zweifel vorgeht, und das ist nicht dasselbe. Man kann von einer Sache wenig wollen und
 * trotzdem darauf bestehen.
 */
function Reihenfolge({ entwurf, kat, onAendern }: {
  entwurf: Entwurf
  kat: IdealKatalog
  onAendern: (reihung: string[]) => void
}) {
  const vorschlag = useMemo(
    () => reihungsVorschlag(entwurf, kat, kat.max_reihung),
    [entwurf, kat],
  )
  const istVorschlag = entwurf.reihung.length === 0 && vorschlag.length > 0
  const gezeigt = istVorschlag ? { ...entwurf, reihung: vorschlag } : entwurf

  return (
    <>
      <p className="mb-4 max-w-[60ch] text-[0.92rem] leading-relaxed text-brand-muted">
        Die {kat.max_reihung} wichtigsten, von oben nach unten. Nicht, weil der Rest egal
        wäre — sondern weil man in einer echten Beziehung irgendwann eines gegen das andere
        abwägen muss.
      </p>

      {istVorschlag && (
        <p className="mb-3 rounded-brand border border-accent/30 bg-accent/[0.05] px-4 py-3 text-[0.86rem] leading-snug text-navy">
          <strong className="font-semibold">So hätte ich dich verstanden</strong> — aus dem,
          wie viel du von jedem wolltest. Schieb um, was nicht stimmt.
        </p>
      )}

      <Reihung
        punkte={reihungsPunkte(gezeigt, kat)}
        onAendern={onAendern}
        leerText="Wähle erst ein paar Aspekte aus — ordnen kannst du sie danach."
      />

      {istVorschlag ? (
        <button
          type="button"
          onClick={() => onAendern(vorschlag)}
          className="btn-primary !py-2 !px-4 !text-sm mt-4"
        >
          Stimmt so
        </button>
      ) : entwurf.aspekte.length > entwurf.reihung.length && (
        <NochNichtGeordnet
          entwurf={entwurf}
          kat={kat}
          onDazu={key => onAendern([...entwurf.reihung, key])}
        />
      )}
    </>
  )
}

function reihungsPunkte(entwurf: Entwurf, kat: IdealKatalog) {
  const alle = kat.aspekt_familien.flatMap(f => f.aspekte)
  return entwurf.reihung
    .map(key => {
      const a = alle.find(x => x.key === key)
      return a ? { key, label: a.label } : null
    })
    .filter((x): x is { key: string; label: string } => x !== null)
}

function NochNichtGeordnet({ entwurf, kat, onDazu }: {
  entwurf: Entwurf
  kat: IdealKatalog
  onDazu: (key: string) => void
}) {
  const alle = kat.aspekt_familien.flatMap(f => f.aspekte)
  const offen = entwurf.aspekte
    .filter(a => !entwurf.reihung.includes(a.key))
    .map(a => alle.find(x => x.key === a.key))
    .filter((x): x is NonNullable<typeof x> => !!x)

  if (offen.length === 0) return null
  const voll = entwurf.reihung.length >= kat.max_reihung

  return (
    <div className="mt-5 border-t border-brand-border pt-4">
      <p className="text-[0.8rem] text-brand-muted">
        {voll
          ? `Die Reihenfolge ist voll (${kat.max_reihung}). Nimm oben etwas heraus, um zu tauschen.`
          : 'Noch nicht einsortiert — tippe an, was mit in die Reihenfolge soll:'}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {offen.map(a => (
          <button
            key={a.key}
            type="button"
            onClick={() => !voll && onDazu(a.key)}
            disabled={voll}
            className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs text-brand-text transition-colors hover:border-accent/50 disabled:opacity-40"
          >
            + {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
