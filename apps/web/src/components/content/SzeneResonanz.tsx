/**
 * „Und bei dir?" — der interaktive Teil einer Beziehungsszene.
 *
 * **Der Entwurfsgedanke: eine Geste, dann freiwillig mehr.** Wer diese Szenen liest, liest
 * sie oft nachts und selten in Verfassung, ein Formular auszufüllen. Der erste Schritt ist
 * deshalb ein einziger Fingertipp, der nichts verlangt und nichts verspricht. Alles
 * Weitere — zwei Skalen, ein Textfeld, am Ende die eigene Szene — klappt danach auf und
 * darf ignoriert werden. Ein Pflichtfeld an dieser Stelle würde genau die Menschen
 * aussperren, für die das Wiedererkennen der einzige Zugang ist.
 *
 * **Ohne Konto passiert trotzdem etwas.** Die Reaktion zählt in eine anonyme Zahl, und
 * unter der Szene steht dann „147 Menschen kennen das". Bei diesem Material ist das keine
 * Spielerei: Der Satz, der solche Beziehungen zusammenhält, lautet *Ich bilde mir das
 * ein.* Eine Zahl widerspricht dem, ohne zu belehren.
 *
 * **Die Überschrift heißt „Und bei dir?" und nicht „Kommt dir das bekannt vor?".** Der
 * zweite Satz steht schon auf derselben Seite — als Überschrift der Echo-Einladung ein
 * Stück weiter unten. Zweimal dieselbe Frage untereinander liest sich wie ein Fehler und
 * nimmt der zweiten ihr Gewicht. Hier steht der kurze Satz, den man nach einer Geschichte
 * sagt; die Einladung zum Gespräch darf die ausführliche Frage behalten.
 *
 * Die Seiten werden vorgerendert — alle Browser-Zugriffe liegen deshalb in Effekten, und
 * die Zählerabfrage läuft erst im Browser.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  MAX_NOTIZ,
  NOTIZ_FRAGE,
  NOTIZ_HINWEIS,
  REAKTIONS_INFOS,
  SKALEN,
  anonymLesen,
  anonymMerken,
  andereWiedererkennen,
  istWiedererkannt,
  nennerSatz,
  zaehlerSatz,
  type Reaktion,
  type Zaehler,
} from '@/lib/resonanz'
import { oeffentlicheResonanzApi, resonanzApi } from '@/api/resonanz'

// ── Die vier Marken ─────────────────────────────────────────────────────────
// Gezeichnet statt Emoji: Ein 🙋 neben einer Szene über Erschöpfung trifft den Ton nicht,
// und Emoji als Abzeichen sind hier ohnehin nicht die Sprache des Hauses.
//
// Die Formen erzählen die Bedeutung: voller Punkt = jetzt, gestrichelter Ring = vorbei,
// gespiegelte Hälfte = die andere Seite, leerer Ring = kenne ich nicht.
function Marke({ art }: { art: Reaktion }) {
  const gemeinsam = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true">
      {art === 'kenne_ich' && (
        <>
          <circle cx="10" cy="10" r="7.4" {...gemeinsam} />
          <circle cx="10" cy="10" r="3.4" fill="currentColor" />
        </>
      )}
      {art === 'kannte_ich' && (
        <>
          <circle cx="10" cy="10" r="7.4" {...gemeinsam} strokeDasharray="2.2 2" />
          <circle cx="10" cy="10" r="3.4" fill="currentColor" opacity="0.45" />
        </>
      )}
      {art === 'andere_seite' && (
        <>
          <circle cx="10" cy="10" r="7.4" {...gemeinsam} />
          <path d="M10 2.6 A7.4 7.4 0 0 1 10 17.4 Z" fill="currentColor" opacity="0.9" />
        </>
      )}
      {art === 'nicht_meins' && <circle cx="10" cy="10" r="7.4" {...gemeinsam} />}
    </svg>
  )
}

// ── Eine Skala ──────────────────────────────────────────────────────────────
function Skalenreihe({
  frage, punkte, wert, onWahl,
}: {
  frage: string
  punkte: readonly string[]
  wert: number | null
  onWahl: (n: number) => void
}) {
  return (
    <div>
      <p className="text-[0.9rem] font-medium text-navy">{frage}</p>
      <div className="mt-2.5 flex items-stretch gap-1.5" role="group" aria-label={frage}>
        {punkte.map((wort, i) => {
          const n = i + 1
          const gewaehlt = wert === n
          return (
            <button
              key={wort}
              type="button"
              onClick={() => onWahl(n)}
              aria-pressed={gewaehlt}
              className={[
                'flex-1 rounded-brand border px-1 py-2 text-center transition-all',
                gewaehlt
                  ? 'border-accent bg-accent text-white shadow-brand'
                  : 'border-brand-border bg-white text-brand-muted hover:border-accent/50 hover:text-navy',
              ].join(' ')}
            >
              <span className="block text-[0.95rem] font-bold leading-none">{n}</span>
              <span className="mt-1 block text-[0.62rem] leading-tight">{wort}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function SzeneResonanz({ slug, titel }: { slug: string; titel: string }) {
  const { session, loading: authLaedt } = useAuth()
  const angemeldet = !!session
  const qc = useQueryClient()

  const [anonymeWahl, setAnonymeWahl] = useState<Reaktion | null>(null)
  const [notiz, setNotiz] = useState('')
  const [notizGesichert, setNotizGesichert] = useState(false)
  const [uebernommen, setUebernommen] = useState<number | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  // Was dieser Browser ohne Konto schon markiert hat. Erst im Effekt: Beim Vorrendern
  // gibt es kein localStorage.
  useEffect(() => {
    if (!angemeldet) setAnonymeWahl(anonymLesen()[slug] ?? null)
  }, [slug, angemeldet])

  const zaehlerAbfrage = useQuery({
    queryKey: ['szene-resonanz-zaehler', slug],
    queryFn: () => oeffentlicheResonanzApi.zaehler([slug]),
    enabled: typeof window !== 'undefined',
    staleTime: 60_000,
  })

  const eigeneAbfrage = useQuery({
    queryKey: ['resonanz-ueberblick'],
    queryFn: () => resonanzApi.ueberblick(),
    enabled: angemeldet,
    staleTime: 30_000,
  })

  const eigener = useMemo(
    () => eigeneAbfrage.data?.eintraege.find(e => e.scene_slug === slug) ?? null,
    [eigeneAbfrage.data, slug],
  )

  useEffect(() => {
    if (eigener) {
      setNotiz(eigener.note ?? '')
      setNotizGesichert(false)
    }
  }, [eigener?.id, eigener?.note])

  const gewaehlt: Reaktion | null = angemeldet ? (eigener?.reaction ?? null) : anonymeWahl
  const zaehler: Zaehler = zaehlerAbfrage.data?.[slug] ?? {}

  // ── Schreiben ─────────────────────────────────────────────────────────────
  const speichern = useMutation({
    mutationFn: (eingabe: Parameters<typeof resonanzApi.setzen>[1]) =>
      resonanzApi.setzen(slug, eingabe),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resonanz-ueberblick'] })
      qc.invalidateQueries({ queryKey: ['szene-resonanz-zaehler', slug] })
      setFehler(null)
    },
    onError: () => setFehler('Konnte nicht gespeichert werden. Versuch es gleich noch einmal.'),
  })

  const anonymSenden = useMutation({
    mutationFn: (reaction: Reaktion) => oeffentlicheResonanzApi.reagieren(slug, reaction),
    onSuccess: (neu, reaction) => {
      qc.setQueryData(['szene-resonanz-zaehler', slug], { [slug]: neu })
      anonymMerken(slug, reaction)
      setFehler(null)
    },
    onError: () => setFehler('Konnte gerade nicht gezählt werden.'),
  })

  function reagieren(r: Reaktion) {
    if (angemeldet) {
      speichern.mutate({
        reaction: r,
        // Beim Wechsel auf „Nicht mein Thema" verschwinden Skalen und Notiz aus der
        // Ansicht - sie muessen dann auch weg sein. Sonst stuende im Fallkontext eine
        // Belastung zu einer Szene, die die Person gerade verneint hat.
        frequency: istWiedererkannt(r) ? eigener?.frequency ?? null : null,
        distress: istWiedererkannt(r) ? eigener?.distress ?? null : null,
        note: istWiedererkannt(r) ? eigener?.note ?? null : null,
      })
    } else {
      setAnonymeWahl(r)
      anonymSenden.mutate(r)
    }
  }

  function skalaSetzen(key: 'frequency' | 'distress', n: number) {
    if (!gewaehlt) return
    speichern.mutate({
      reaction: gewaehlt,
      frequency: key === 'frequency' ? n : eigener?.frequency ?? null,
      distress: key === 'distress' ? n : eigener?.distress ?? null,
      note: eigener?.note ?? null,
    })
  }

  function notizSichern() {
    if (!gewaehlt || notiz === (eigener?.note ?? '')) return
    speichern.mutate(
      {
        reaction: gewaehlt,
        frequency: eigener?.frequency ?? null,
        distress: eigener?.distress ?? null,
        note: notiz.trim() || null,
      },
      { onSuccess: () => setNotizGesichert(true) },
    )
  }

  const zuSzene = useMutation({
    mutationFn: () => resonanzApi.zuSzeneMachen(slug),
    onSuccess: (d) => {
      setUebernommen(d.scene_no)
      qc.invalidateQueries({ queryKey: ['resonanz-ueberblick'] })
    },
    onError: () => setFehler('Das hat gerade nicht geklappt.'),
  })

  const satz = zaehlerSatz(zaehler, gewaehlt)
  const offen = istWiedererkannt(gewaehlt)

  return (
    <section
      className="mt-14 rounded-brand-lg border border-brand-border bg-white px-6 py-7 sm:px-7"
      aria-labelledby={`resonanz-${slug}`}
    >
      <h2 id={`resonanz-${slug}`} className="text-[1.15rem] font-bold leading-snug text-navy">
        Und bei dir?
      </h2>
      <p className="mt-1.5 text-[0.9rem] leading-relaxed text-brand-muted">
        Ein Tipp genügt. Du musst nichts erklären, und niemand außer dir sieht deine Antwort.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {REAKTIONS_INFOS.map(info => {
          const aktiv = gewaehlt === info.key
          return (
            <button
              key={info.key}
              type="button"
              onClick={() => reagieren(info.key)}
              aria-pressed={aktiv}
              disabled={authLaedt}
              className={[
                'flex items-start gap-3 rounded-brand border px-4 py-3 text-left transition-all',
                aktiv
                  ? 'border-accent bg-accent/[0.07] shadow-brand'
                  : 'border-brand-border bg-white hover:-translate-y-px hover:border-accent/50 hover:shadow-brand',
              ].join(' ')}
            >
              <span className={`mt-0.5 ${aktiv ? 'text-accent' : 'text-brand-muted'}`}>
                <Marke art={info.key} />
              </span>
              <span className="min-w-0">
                <span className={`block text-[0.94rem] font-semibold ${aktiv ? 'text-navy' : 'text-brand-text'}`}>
                  {info.label}
                </span>
                <span className="mt-0.5 block text-[0.78rem] leading-snug text-brand-muted">
                  {info.hinweis}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {satz && (
        <p className="mt-4 text-[0.84rem] text-brand-muted">
          {satz}
          {nennerSatz(zaehler) && (
            <span className="text-brand-muted/70"> · {nennerSatz(zaehler)}</span>
          )}
        </p>
      )}

      {fehler && <p className="mt-3 text-[0.84rem] text-red-600">{fehler}</p>}

      {/* ── Ohne Konto: was jetzt möglich wäre ────────────────────────────── */}
      {!angemeldet && gewaehlt && (
        <div className="mt-5 rounded-brand border border-accent/25 bg-accent/[0.04] px-5 py-4">
          <p className="text-[0.9rem] font-semibold text-navy">
            {!istWiedererkannt(gewaehlt)
              ? 'Notiert.'
              : andereWiedererkennen(zaehler, gewaehlt) > 0
                ? 'Du bist damit nicht allein.'
                : 'Du bist die erste Person, die diese Szene markiert hat.'}
          </p>
          <p className="mt-1.5 text-[0.86rem] leading-relaxed text-brand-muted">
            Gemerkt ist das bisher nur auf diesem Gerät. Mit einem Konto kannst du
            dazuschreiben, wie es bei dir war, alle wiedererkannten Szenen an einem Ort
            sehen — und mit Echo darüber sprechen.
          </p>
          <Link
            to="/auth"
            state={{ defaultTab: 'signup' }}
            className="mt-3 inline-block text-[0.86rem] font-semibold text-accent hover:underline"
          >
            Kostenlos starten →
          </Link>
        </div>
      )}

      {/* ── Angemeldet: die Vertiefung ────────────────────────────────────── */}
      {angemeldet && offen && (
        <div className="mt-6 space-y-5 border-t border-brand-border pt-6">
          {SKALEN.map(s => (
            <Skalenreihe
              key={s.key}
              frage={s.frage}
              punkte={s.punkte}
              wert={(eigener?.[s.key] as number | null) ?? null}
              onWahl={n => skalaSetzen(s.key, n)}
            />
          ))}

          <div>
            <label htmlFor={`notiz-${slug}`} className="text-[0.9rem] font-medium text-navy">
              {NOTIZ_FRAGE}
            </label>
            <p className="mt-1 text-[0.78rem] leading-snug text-brand-muted">{NOTIZ_HINWEIS}</p>
            <textarea
              id={`notiz-${slug}`}
              value={notiz}
              maxLength={MAX_NOTIZ}
              onChange={e => { setNotiz(e.target.value); setNotizGesichert(false) }}
              onBlur={notizSichern}
              rows={4}
              placeholder="Bei mir war es …"
              className="mt-2 w-full rounded-brand border border-brand-border px-3.5 py-2.5 text-[0.92rem] leading-relaxed text-brand-text placeholder:text-brand-muted/60 focus:border-accent focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={notizSichern}
                disabled={speichern.isPending || notiz === (eigener?.note ?? '')}
                className="btn-primary !px-5 !py-2 !text-[0.86rem] disabled:opacity-40"
              >
                {speichern.isPending ? 'Wird gespeichert …' : 'Speichern'}
              </button>
              {notizGesichert && notiz === (eigener?.note ?? '') && (
                <span className="text-[0.82rem] text-green-700">Gespeichert ✓</span>
              )}
            </div>
          </div>

          {/* Der eigentliche Zug: aus drei Sätzen wird eigenes Material. */}
          {eigener?.note && !eigener.promoted_scene_id && uebernommen === null && (
            <div className="rounded-brand border border-accent/25 bg-accent/[0.04] px-5 py-4">
              <p className="text-[0.88rem] leading-relaxed text-brand-text">
                Das, was du gerade geschrieben hast, ist eine eigene Szene. Wenn du magst,
                übernehmen wir sie in deinen Fall — dann kann Echo damit arbeiten.
              </p>
              <button
                type="button"
                onClick={() => zuSzene.mutate()}
                disabled={zuSzene.isPending}
                className="mt-3 text-[0.88rem] font-semibold text-accent hover:underline disabled:opacity-50"
              >
                {zuSzene.isPending ? 'Wird übernommen …' : 'Daraus eine eigene Szene machen →'}
              </button>
            </div>
          )}

          {(uebernommen !== null || eigener?.promoted_scene_id) && (
            <p className="rounded-brand bg-green-50 px-5 py-3 text-[0.88rem] text-green-900">
              Übernommen{uebernommen !== null ? ` als Szene ${uebernommen}` : ''}. Du findest
              sie bei deinen Szenen.
            </p>
          )}

          <p className="text-[0.78rem] leading-relaxed text-brand-muted/80">
            Deine Einordnung gehört zu dir. Echo sieht sie als Hinweis — nicht als Bericht
            darüber, was passiert ist. Die erfundene Szene „{titel}" bleibt erfunden.
          </p>
        </div>
      )}
    </section>
  )
}
