/**
 * Das Studio — hier wird eine Folge bestellt.
 *
 * **Die Reihenfolge der Fragen ist die Reihenfolge der Entscheidungen.** Zuerst das Format,
 * weil es alles andere bestimmt: welche Kapitel es gibt, welche Regler überhaupt erscheinen,
 * welche Ansprache möglich ist. Erst danach lohnt es, Regler und Stimmen zu zeigen — vorher
 * wären es fünf Listen auf Vorrat, von denen die Hälfte gleich wieder verschwindet.
 *
 * **Die Kapitelstruktur steht sichtbar daneben, nicht hinter einem Aufklapper.** Sie ist die
 * eigentliche Auskunft darüber, was man bekommt: „Der ganze Fall“ sagt wenig, „Wie es
 * angefangen hat · Wer die andere Person ist · Was immer wieder passiert" sagt alles. Und
 * weil sie sichtbar ist, kann man ein Kapitel abwählen — ein Format ist ein Vorschlag, keine
 * Schablone.
 *
 * **Was ein Format nicht verträgt, steht gar nicht erst da.** Bei „Für jemanden, dem ich es
 * erklären will" fehlen Muster, Hypothesen und Personenprofil — nicht ausgegraut, sondern
 * abwesend. Ein Regler, den man nicht bewegen darf, ist eine Aufforderung, es zu versuchen.
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Fehlermeldung from '@/components/Fehlermeldung'
import { podcastApi, type PodcastBestellung } from '@/api/podcast'

export default function Studio({ caseId, laeuft, fehler, onBestellen, onAbbruch }: {
  caseId: string
  laeuft: boolean
  /**
   * Was beim Bestellen schiefging — **hier unten, nicht am Seitenkopf.**
   *
   * Dasselbe Versehen zweimal: Zuerst stand der Wartehinweis oben und war bei diesem langen
   * Formular außerhalb des Bildes. Die Fehlermeldung stand daneben und blieb dort, als der
   * Hinweis umzog. Ein Nutzer sah deshalb nur das Rad kurz aufblitzen und hielt es für „es
   * passiert nichts" — die Erklärung lag anderthalb Bildschirme höher.
   */
  fehler: unknown
  onBestellen: (b: PodcastBestellung) => void
  onAbbruch: () => void
}) {
  const [formatKey, setFormatKey] = useState<string | null>(null)
  const [laenge, setLaenge] = useState('mittel')
  const [stimme, setStimme] = useState('sage')
  const [ansprache, setAnsprache] = useState<string | null>(null)
  const [gewichte, setGewichte] = useState<Record<string, string>>({})
  const [ohneKapitel, setOhneKapitel] = useState<string[]>([])
  // Welche Hoerprobe gerade spielt. Im Elternteil, damit eine neue die vorige anhaelt:
  // Wer zwei Stimmen vergleicht, tippt schnell hin und her, und dann sollen nicht zwei
  // gleichzeitig reden.
  const [probeLaeuft, setProbeLaeuft] = useState<string | null>(null)

  const formate = useQuery({
    queryKey: ['podcast-katalog', caseId],
    queryFn: () => podcastApi.katalog(caseId),
    staleTime: Infinity,
  })
  const zuschnitt = useQuery({
    queryKey: ['podcast-katalog', caseId, formatKey],
    queryFn: () => podcastApi.katalog(caseId, formatKey!),
    enabled: !!formatKey,
    staleTime: Infinity,
  })

  // Beim Formatwechsel wird zurückgesetzt, was zum neuen Format nicht mehr passt. Eine
  // Ansprache, die es dort nicht gibt, würde sonst beim Bestellen mit 422 abgewiesen — und
  // niemand sähe der Oberfläche an, woran es lag.
  useEffect(() => {
    const k = zuschnitt.data
    if (!k?.format) return
    setAnsprache(a => (a && k.format!.ansprachen.includes(a) ? a : k.format!.ansprachen[0]))
    setGewichte(g => Object.fromEntries(
      k.format!.elemente.map(e => [e, g[e] ?? 'normal'])))
    setOhneKapitel([])
  }, [zuschnitt.data])

  const k = zuschnitt.data
  const format = k?.format

  if (formate.error) return <Fehlermeldung error={formate.error} className="mt-4" />

  // ── Schritt 1: Was für eine Folge? ─────────────────────────────────────────
  if (!formatKey) {
    return (
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[1.2rem] font-bold leading-snug text-navy">
            Was für eine Folge soll es werden?
          </h2>
          <button type="button" onClick={onAbbruch}
            className="shrink-0 text-xs text-brand-muted hover:text-navy">
            Abbrechen
          </button>
        </div>
        <p className="mt-1.5 max-w-[62ch] text-[0.88rem] leading-relaxed text-brand-muted">
          Jedes Format ist ein anderer Aufbau und ein anderer Ton. Du siehst gleich, aus
          welchen Kapiteln es besteht — und kannst jedes einzeln abwählen.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(formate.data?.formate ?? []).map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFormatKey(f.key)}
              className="group rounded-brand border border-brand-border bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-brand motion-reduce:hover:translate-y-0"
            >
              <span className="block text-[1rem] font-bold leading-snug text-navy transition-colors group-hover:text-accent">
                {f.label}
              </span>
              <span className="mt-1.5 block text-[0.83rem] leading-snug text-brand-muted">
                {f.beschreibung}
              </span>
              <span className="mt-3 block text-[0.74rem] text-brand-muted/80">
                {f.kapitel.map(x => x.titel).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  if (zuschnitt.isLoading || !k || !format) {
    return <p className="text-sm text-brand-muted">Einen Moment …</p>
  }

  const bestellen = () => onBestellen({
    format: format.key,
    laenge,
    stimme,
    ansprache: ansprache ?? format.ansprachen[0],
    gewichte,
    ohne_kapitel: ohneKapitel,
  })

  const alleAus = ohneKapitel.length >= format.kapitel.length

  // ── Schritt 2: der Zuschnitt ───────────────────────────────────────────────
  return (
    <section className="space-y-6" aria-busy={laeuft}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <span className="label">Format</span>
          <h2 className="text-[1.2rem] font-bold leading-snug text-navy">{format.label}</h2>
        </div>
        {/* Waehrend das Skript entsteht, keine Formatwahl: Wer jetzt umstellt, sieht
            hinterher etwas anderes, als er bekommen hat. */}
        {!laeuft && (
          <button type="button" onClick={() => setFormatKey(null)}
            className="shrink-0 text-xs text-brand-muted hover:text-navy">
            Anderes Format
          </button>
        )}
      </div>

      {/* ── Die Kapitel ─────────────────────────────────────────────────── */}
      <Block titel="Die Kapitel"
        hinweis="So ist die Folge aufgebaut. Tipp eines an, wenn es nicht vorkommen soll.">
        <ul className="space-y-2">
          {format.kapitel.map((kap, i) => {
            const aus = ohneKapitel.includes(kap.key)
            return (
              <li key={kap.key}>
                <button
                  type="button"
                  onClick={() => setOhneKapitel(l =>
                    aus ? l.filter(x => x !== kap.key) : [...l, kap.key])}
                  aria-pressed={!aus}
                  className={`flex w-full items-center gap-3 rounded-brand border px-4 py-2.5 text-left transition-colors ${
                    aus
                      ? 'border-brand-border bg-brand-bg text-brand-muted'
                      : 'border-accent/30 bg-accent/[0.04] text-navy'
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.72rem] font-bold tabular-nums ${
                    aus ? 'bg-brand-border text-brand-muted' : 'bg-accent/15 text-accent'
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`min-w-0 flex-1 text-[0.88rem] leading-snug ${aus ? 'line-through' : 'font-medium'}`}>
                    {kap.titel}
                  </span>
                  <span className="shrink-0 text-[0.7rem] text-brand-muted">
                    {aus ? 'kommt nicht vor' : 'dabei'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {alleAus && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            Du hast alle Kapitel abgewählt — dann gibt es nichts zu erzählen.
          </p>
        )}
      </Block>

      {/* ── Die Regler ──────────────────────────────────────────────────── */}
      <Block titel="Woraus soll sie entstehen?"
        hinweis="Was auf „gar nicht“ steht, wird nicht einmal geladen — es kommt in der Folge nirgends vor.">
        <ul className="space-y-4">
          {(k.elemente ?? []).map(e => (
            <li key={e.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.88rem] font-medium text-navy">{e.label}</span>
                <span className="shrink-0 text-[0.7rem] text-brand-muted">{e.hinweis}</span>
              </div>
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                {(k.gewichtungen ?? []).map(g => {
                  const an = (gewichte[e.key] ?? 'normal') === g.key
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setGewichte(w => ({ ...w, [e.key]: g.key }))}
                      aria-pressed={an}
                      className={`rounded-brand-sm border px-2 py-1.5 text-[0.72rem] leading-tight transition-colors ${
                        an
                          ? 'border-accent bg-accent text-white'
                          : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
                      }`}
                    >
                      {g.label}
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      </Block>

      {/* ── Länge, Stimme, Ansprache ────────────────────────────────────── */}
      <Block titel="Wie lang, wie gesprochen?">
        <Wahl titel="Länge" wert={laenge} setzen={setLaenge}
          optionen={(k.laengen ?? []).map(l => ({
            key: l.key, label: `${l.label} · ${l.minuten} Min`, hinweis: l.hinweis }))} />

        <Wahl titel="Stimme" wert={stimme} setzen={setStimme}
          optionen={(k.stimmen ?? []).map(s => ({
            key: s.key, label: s.label, hinweis: s.hinweis }))}
          zusatz={key => (
            <Hoerprobe
              stimme={key}
              laeuftHier={probeLaeuft === key}
              onStart={() => setProbeLaeuft(key)}
              onEnde={() => setProbeLaeuft(p => (p === key ? null : p))}
            />
          )} />

        {(k.ansprachen ?? []).length > 1 && (
          <Wahl titel="Ansprache" wert={ansprache ?? ''} setzen={setAnsprache}
            optionen={(k.ansprachen ?? []).map(a => ({
              key: a.key, label: a.label, hinweis: a.hinweis }))} />
        )}
      </Block>

      {/* **Die Rueckmeldung steht hier, nicht am Seitenkopf.**
          Ein Nutzer hat mehrmals geklickt, weil er nicht sah, ob etwas passiert - und
          jeder Klick legte eine Folge an. Ein Hinweis oben am Rand ist bei einem langen
          Formular ausserhalb des Bildes: Man klickt unten und sieht nichts. Also steht er
          an derselben Stelle wie der Knopf, mit einem Rad, das sich dreht - ein
          ausgegrauter Knopf mit anderer Beschriftung ist zu still fuer eine Minute
          Wartezeit. */}
      <div className="border-t border-brand-border pt-5">
        {laeuft ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-brand border border-accent/40 bg-accent/[0.06] px-5 py-4"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
            />
            <span className="min-w-0 text-[0.86rem] leading-relaxed text-navy">
              <strong className="font-semibold">Das Skript entsteht.</strong> Das dauert
              meistens zwanzig bis sechzig Sekunden — bei einer langen Folge etwas mehr.
              Lass die Seite offen; du musst nicht noch einmal klicken.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Fehlermeldung error={fehler} className="w-full !mt-0" />
            <button
              type="button"
              onClick={bestellen}
              disabled={alleAus}
              className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-40"
            >
              {fehler ? 'Noch einmal versuchen' : 'Skript schreiben'}
            </button>
            <span className="text-[0.78rem] leading-snug text-brand-muted">
              Erst der Text, dann die Stimme. Das Skript kostet nichts von deinem
              Kontingent — du kannst es lesen und verwerfen.
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Der Abspielknopf an einer Stimme.
 *
 * **Warum die Bytes durch den API-Client gehen und nicht in ein `<audio src>`.** Der Endpunkt
 * verlangt eine Anmeldung; ein `src`-Attribut kann sich nicht anmelden. Also holen, eine
 * Objekt-URL machen, abspielen — und die URL behalten, damit ein zweites Anhoeren nichts
 * mehr kostet.
 *
 * Der Knopf ist ein GESCHWISTER der Stimmkarte, nicht ihr Kind: Ein Knopf in einem Knopf ist
 * ungueltiges HTML, und der Klick kaeme womoeglich nie an.
 *
 * Jede Probe hat ihr EIGENES Audio-Element. Ein gemeinsames waere weniger Code und schlechter:
 * Wer zwei Stimmen vergleicht, tippt schnell hin und her, und dann soll die eine aufhoeren,
 * wenn die andere anfaengt — aber der Fortschritt der einen soll nicht am Knopf der anderen
 * erscheinen. Das Umschalten uebernimmt daher der Elternteil ueber `laeuftHier`.
 */
function Hoerprobe({ stimme, laeuftHier, onStart, onEnde }: {
  stimme: string
  laeuftHier: boolean
  onStart: () => void
  onEnde: () => void
}) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const url = useRef<string | null>(null)
  const [holt, setHolt] = useState(false)
  const [fehler, setFehler] = useState(false)

  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current) }, [])

  // Spielt eine andere Probe, haelt diese an. Ohne das reden zwei Stimmen gleichzeitig.
  useEffect(() => {
    if (!laeuftHier && audio.current) {
      audio.current.pause()
      audio.current.currentTime = 0
    }
  }, [laeuftHier])

  const spielen = async () => {
    if (laeuftHier) { audio.current?.pause(); onEnde(); return }

    setFehler(false)
    onStart()
    try {
      if (!url.current) {
        setHolt(true)
        const blob = await podcastApi.stimmprobe(stimme)
        url.current = URL.createObjectURL(blob)
      }
      if (!audio.current) audio.current = new Audio()
      audio.current.src = url.current
      audio.current.onended = onEnde
      await audio.current.play()
    } catch {
      setFehler(true)
      onEnde()
    } finally {
      setHolt(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void spielen()}
      aria-label={laeuftHier ? 'Hoerprobe anhalten' : 'Hoerprobe abspielen'}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-current px-2.5 py-1 text-[0.7rem] font-medium text-brand-muted transition-colors hover:text-accent"
    >
      {holt ? (
        <span aria-hidden="true"
          className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
      ) : laeuftHier ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      )}
      {fehler ? 'geht gerade nicht' : laeuftHier ? 'laeuft' : 'anhoeren'}
    </button>
  )
}

function Block({ titel, hinweis, children }: {
  titel: string
  hinweis?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-brand-lg border border-brand-border bg-white p-5">
      <h3 className="text-[0.95rem] font-bold text-navy">{titel}</h3>
      {hinweis && (
        <p className="mt-1 max-w-[62ch] text-[0.8rem] leading-relaxed text-brand-muted">
          {hinweis}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  )
}

/**
 * Eine Reihe gleichrangiger Karten. Keine sieht wie die empfohlene aus.
 *
 * `zusatz` haengt etwas unter eine Karte — bei den Stimmen die Hoerprobe. Als eigener
 * Parameter und nicht fest eingebaut, weil Laenge und Ansprache keinen brauchen und eine
 * Karte mit leerem Fuss darunter schief aussieht.
 */
function Wahl({ titel, wert, setzen, optionen, zusatz }: {
  titel: string
  wert: string
  setzen: (k: string) => void
  optionen: { key: string; label: string; hinweis: string }[]
  zusatz?: (key: string) => React.ReactNode
}) {
  return (
    <div className="mb-5 last:mb-0">
      <span className="label">{titel}</span>
      {/* **Der Rahmen sitzt am umgebenden div, nicht am Knopf.**
          Die Hoerprobe ist selbst ein Knopf, und ein Knopf in einem Knopf ist ungueltiges
          HTML: Browser behandeln das unterschiedlich, und im schlechtesten Fall kommt der
          Klick auf die Probe nie an. Also zwei Geschwister in einem Rahmen - der obere
          waehlt, der untere spielt. */}
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {optionen.map(o => {
          const an = wert === o.key
          return (
            <div
              key={o.key}
              className={`rounded-brand border px-3.5 py-3 transition-all ${
                an
                  ? 'border-accent bg-accent/[0.06] shadow-brand-sm'
                  : 'border-brand-border bg-white hover:border-accent/50'
              }`}
            >
              <button
                type="button"
                onClick={() => setzen(o.key)}
                aria-pressed={an}
                className="block w-full text-left"
              >
                <span className={`block text-[0.86rem] font-semibold leading-snug ${
                  an ? 'text-accent' : 'text-navy'
                }`}>
                  {o.label}
                </span>
                <span className="mt-0.5 block text-[0.74rem] leading-snug text-brand-muted">
                  {o.hinweis}
                </span>
              </button>
              {zusatz?.(o.key)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
