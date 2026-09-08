/**
 * Fall-FAQ — das Fragenpaket, das die Klient:in ausgelöst hat.
 *
 * **Wer hier was tut.** Die Klient:in hakt bei der Freigabe ein Kästchen an; EchoB stellt
 * daraufhin vierzig feststehende Fragen und legt die Antworten hier ab. Die Fachperson
 * liest. Es gibt in diesem Panel bewusst keinen Knopf, der etwas auslöst oder neu erzeugt
 * — der Unterschied zwischen Lesen und Fragen ist für Berufsgeheimnisträger:innen der
 * Unterschied zwischen Empfangen und Offenbaren (§ 203 StGB).
 *
 * **Warum so viel Aufwand um die Belege.** Das Material stammt von einer Seite. Die
 * beschriebene Person hat nichts eingereicht und weiß meist nichts davon. Eine Zahl oder
 * ein Satz ohne Fundstelle wäre in dieser Lage keine Auskunft, sondern eine Behauptung mit
 * fremder Autorität. Deshalb hängt an jeder Aussage ihre Quelle, an jeder Achse ihre
 * Belegdichte — und eine Achse mit weniger als zwei Belegen zeigt gar keine Zahl.
 *
 * **Die drei Dinge, die diese Oberfläche nicht tun darf:**
 * 1. eine Zahl ohne ihre Belege zeigen,
 * 2. „nicht beurteilbar" wie einen Fehler aussehen lassen — es ist ein Ergebnis,
 * 3. eine Hypothese wie einen Befund setzen.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fallFaqApi } from '@/api/fallFaq'
import Fehlermeldung from '@/components/Fehlermeldung'
import { BELEGDICHTE_TEXT, auffaelligkeit, belegdichteStufe } from '@/lib/fallFaq'
import type { FaqAchse, FaqBeleg, FaqClusterAnteil, FaqFrage, FaqKategorie, SharedCaseBundle } from '@/types'

/**
 * Kategorie-Marke → Zeichen. Rein dekorativ, deshalb aria-hidden am Einsatzort.
 *
 * Die Formen müssen sich auf einen Blick unterscheiden. In der ersten Fassung war
 * „Persönlichkeitsnahe Anhaltspunkte" ein Dreieck und „Sicherheit & Grenzen" ebenfalls —
 * der Persönlichkeitsabschnitt sah aus wie eine Warnung, und das ist genau die Lesart,
 * gegen die das ganze Feature gebaut ist.
 */
const MARKEN: Record<string, string> = {
  anker: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 15a3 3 0 100-6 3 3 0 000 6',   // Ziel
  welle: 'M3 12c3-4 6 4 9 0s6-4 9 0',                                          // Zyklus
  zeit: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',                       // Uhr
  prisma: 'M12 2l7 10-7 10-7-10z',                                             // Raute
  faden: 'M9 7a4 4 0 118 0v10a4 4 0 11-8 0',                                   // Schlaufe
  spiegel: 'M12 3v18M8 8l4-4 4 4M8 16l4 4 4-4',                                // Spiegelachse
  wurzel: 'M12 21V9M12 9c0-3 2-5 5-5M12 13c0-3-2-5-5-5',                       // Trieb
  warnung: 'M12 3l8 3v6c0 4.5-3.3 8.2-8 9-4.7-.8-8-4.5-8-9V6z',                // Schild
  netz: 'M12 5a2 2 0 100 4 2 2 0 000-4M5 17a2 2 0 100 4 2 2 0 000-4M19 17a2 2 0 100 4 2 2 0 000-4M10.5 8.5L6.5 15M13.5 8.5l4 6.5M7 19h10',
}

export default function FallFaqPanel({ caseId, bundle }: {
  caseId: string
  bundle: SharedCaseBundle | undefined
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['fall-faq', caseId],
    queryFn: () => fallFaqApi.get(caseId),
    // Während der Erzeugung nachfassen: Der Lauf läuft im Hintergrund, und niemand soll
    // die Seite neu laden müssen, um zu sehen, dass er fertig ist.
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s === 'offen' || s === 'laeuft' ? 4000 : false
    },
  })

  /** Szenennummer → Titel, für die Belegkarten. Kommt aus dem ohnehin geladenen Bündel. */
  const szenen = useMemo(() => {
    const m = new Map<number, string>()
    for (const s of bundle?.scenes ?? []) if (s.scene_no) m.set(s.scene_no, s.title)
    return m
  }, [bundle])

  if (isLoading) return <div className="card"><div className="h-40 animate-pulse rounded-brand bg-brand-bg" /></div>
  if (error) return <div className="card"><Fehlermeldung error={error} /></div>
  if (!data) return null

  if (data.status === 'nicht_angefordert') return <NichtAngefordert kategorien={data.kategorien} />
  if (data.status === 'fehler') return <Fehlgeschlagen />
  if (data.status === 'offen' || data.status === 'laeuft') {
    return <WirdErstellt fertig={data.fragen_beantwortet ?? 0} gesamt={data.fragen_geplant ?? 40} />
  }

  const beantwortet = data.kategorien.reduce((n, k) => n + k.beantwortet, 0)

  return (
    <div className="space-y-5">
      <Kopf faq={data} />
      {/* Null Antworten ist kein Fehler, sondern eine Auskunft über die Freigabe — aber
          eine, die man nicht aus vierzig grauen Zeilen herauslesen können muss. */}
      {beantwortet === 0 && <NichtsAuswertbares />}
      {data.auswertung && <Merkmalsbild auswertung={data.auswertung} szenen={szenen} />}
      <Fragenteil kategorien={data.kategorien} szenen={szenen} />
    </div>
  )
}

function NichtsAuswertbares() {
  return (
    <div className="card border-l-2 border-accent/40">
      <h2 className="card-title mb-2">Keine der Fragen war beantwortbar</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-brand-muted">
        Das Fragenpaket wurde erstellt, aber im freigegebenen Material fand sich nichts,
        worauf sich die Fragen stützen könnten — typischerweise, wenn weder Szenen noch
        der erste Fragebogen freigegeben sind. Das ist kein Fehler und sagt nichts über
        den Fall: Es sagt etwas über den Umfang der Freigabe.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-muted">
        Unten steht, welche Frage woran gescheitert ist. Erweitert die Klient:in die
        Freigabe und löst das Paket erneut aus, füllt es sich.
      </p>
    </div>
  )
}

// ── Leerzustände ─────────────────────────────────────────────────────────────

/**
 * Kein Lauf — aber der Katalog steht trotzdem da.
 *
 * Die Fachperson kann das Paket nicht auslösen. Also soll sie wenigstens sehen, was darin
 * steht: Nur so lässt es sich einer Klient:in gegenüber konkret benennen, statt sie um
 * etwas zu bitten, das man selbst nicht beschreiben kann.
 */
function NichtAngefordert({ kategorien }: { kategorien: FaqKategorie[] }) {
  const anzahl = kategorien.reduce((n, k) => n + k.fragen.length, 0)
  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="card-title mb-2">Fall-FAQ</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-brand-muted">
          Für diesen Fall liegt kein Fragenpaket vor. Es entsteht nur, wenn die Klient:in es
          beim Freigeben ausdrücklich auslöst — von hier aus lässt es sich nicht anfordern,
          und das ist Absicht: Ausgelöst wird die Übermittlung von ihr, nicht von Ihnen.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-muted">
          Unten stehen die {anzahl} Fragen, die EchoB dann beantworten würde — falls Sie
          das Thema ansprechen möchten. Beim nächsten Bearbeiten der Freigabe findet sie
          das Kästchen dort.
        </p>
      </div>
      <Fragenteil kategorien={kategorien} szenen={new Map()} vorschau />
    </div>
  )
}

function Fehlgeschlagen() {
  return (
    <div className="card">
      <h2 className="card-title mb-2">Fall-FAQ</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-brand-muted">
        Das Fragenpaket konnte nicht erstellt werden. Die Klient:in kann es auslösen, indem
        sie die Freigabe erneut speichert.
      </p>
    </div>
  )
}

function WirdErstellt({ fertig, gesamt }: { fertig: number; gesamt: number }) {
  const anteil = gesamt > 0 ? Math.round((fertig / gesamt) * 100) : 0
  return (
    <div className="card">
      <h2 className="card-title mb-2">Fall-FAQ wird erstellt</h2>
      <p className="mb-4 max-w-2xl text-sm text-brand-muted">
        EchoB beantwortet gerade {gesamt} Fragen zum freigegebenen Material. Das dauert
        ein paar Minuten — die Seite aktualisiert sich von selbst.
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-bg">
        <div className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${Math.max(4, anteil)}%` }} />
      </div>
      <p className="mt-2 text-xs text-brand-muted">{fertig} von {gesamt} beantwortet</p>
    </div>
  )
}

// ── Kopf ─────────────────────────────────────────────────────────────────────

function Kopf({ faq }: { faq: { fragen_beantwortet?: number; fragen_geplant?: number; fertig_am?: string | null } }) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="label">Von der Klient:in ausgelöst</span>
          <h2 className="page-title mt-1 !text-2xl">Fall-FAQ</h2>
          <p className="mt-1 text-xs text-brand-muted">
            {faq.fragen_beantwortet ?? 0} von {faq.fragen_geplant ?? 40} Fragen beantwortet
            {faq.fertig_am && ` · erstellt am ${new Date(faq.fertig_am).toLocaleDateString('de-DE')}`}
          </p>
        </div>
      </div>

      {/* Steht oben und nicht im Kleingedruckten: Es ist die Voraussetzung, unter der
          alles Folgende zu lesen ist — nicht ein Haftungssatz. */}
      <div className="mt-4 rounded-brand border-l-2 border-navy/25 bg-brand-bg/60 px-4 py-3">
        <p className="text-xs leading-relaxed text-brand-text">
          <strong className="text-navy">Eine Seite, keine zweite.</strong>{' '}
          Alles hier stammt aus dem, was die Klient:in geschildert und freigegeben hat. Die
          beschriebene Person hat nichts eingereicht, nichts richtiggestellt und weiß in
          aller Regel nichts davon. Die Antworten sagen zuverlässig etwas über die
          Schilderung — über die geschilderte Person nur mit Vorbehalt. Diagnosen lassen
          sich daraus nicht ableiten und sind nicht gemeint.
        </p>
      </div>
    </div>
  )
}

// ── Merkmalsbild ─────────────────────────────────────────────────────────────

function Merkmalsbild({ auswertung, szenen }: {
  auswertung: { achsen: FaqAchse[]; cluster: FaqClusterAnteil[]; materiallage: Record<string, string | undefined> }
  szenen: Map<number, string>
}) {
  const [offen, setOffen] = useState<string | null>(null)
  // Welcher Cluster-Anteil gerade betrachtet wird. Er färbt die Achsenliste darunter ein
  // — das ist die eigentliche Aussage des Merkmalsbilds: WELCHE Beobachtungen zu welchem
  // Anteil gerechnet werden. Stünde sie nur im aufgeklappten Kärtchen, wäre der
  // interessanteste Teil der hinter einem Klick versteckte.
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const anteil = auswertung.cluster.find(c => c.id === gewaehlt) ?? null

  const nachId = useMemo(
    () => new Map(auswertung.achsen.map(a => [a.achse_id, a])), [auswertung.achsen])
  // Absteigend, aber positiv gepolte Achsen nach ihrem Auffälligkeitsgrad: Bei „Reue"
  // ist ein NIEDRIGER Wert das Bemerkenswerte. Sortierte man stumpf nach der Zahl,
  // stünde eine unauffällige Achse oben und eine auffällige unten.
  const sortiert = useMemo(
    () => [...auswertung.achsen].sort(
      (a, b) => auffaelligkeit(b) - auffaelligkeit(a)), [auswertung.achsen])

  const rolle = (id: string): 'traegt' | 'entlastet' | 'unbeteiligt' | null => {
    if (!anteil) return null
    if (anteil.achsen.includes(id)) return 'traegt'
    if (anteil.gegenachsen.includes(id)) return 'entlastet'
    return 'unbeteiligt'
  }

  return (
    <div className="card">
      <h2 className="card-title mb-1">Merkmalsbild</h2>
      <p className="mb-5 max-w-2xl text-xs leading-relaxed text-brand-muted">
        Die Zahlen messen, wie dicht und wie deutlich ein Muster <em>im vorliegenden
        Material</em> belegt ist — nicht den Schweregrad und nicht die Abweichung von einer
        Norm. Farbig ist, worauf zu schauen wäre; die Länge zeigt den gemessenen Wert. Jede
        Achse lässt sich aufklappen; darunter stehen die Stellen, auf die sie sich stützt,
        und die, die dagegen sprechen.
      </p>

      {/* Cluster-Anteile: zuerst, weil sie das Zusammengesetzte sind. Ein Klick zeigt
          unten, aus welchen Beobachtungen sie zusammengesetzt sind. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {auswertung.cluster.map(c => (
          <AnteilKarte
            key={c.id}
            anteil={c}
            achsen={nachId}
            gewaehlt={gewaehlt === c.id}
            waehlen={() => setGewaehlt(gewaehlt === c.id ? null : c.id)}
          />
        ))}
      </div>

      {anteil && (
        <p className="mt-4 rounded-brand border-l-2 border-accent/40 bg-brand-bg/60 px-4 py-2.5 text-xs leading-relaxed text-brand-text">
          <strong className="text-navy">{anteil.name}</strong> — hervorgehoben sind die
          Beobachtungen, aus denen sich der Anteil rechnet. <span className="text-brand-muted">
            Mit <em>+</em> markiert, was dafür spricht, mit <em>−</em>, was dagegen spricht;
            die übrigen Achsen gehen nicht ein.
          </span>
        </p>
      )}

      <div className="mt-6 space-y-1.5">
        {sortiert.map(a => (
          <AchsenZeile
            key={a.achse_id}
            achse={a}
            offen={offen === a.achse_id}
            aufklappen={() => setOffen(offen === a.achse_id ? null : a.achse_id)}
            szenen={szenen}
            rolle={rolle(a.achse_id)}
          />
        ))}
      </div>

      {(auswertung.materiallage?.umfang || auswertung.materiallage?.luecken) && (
        <dl className="mt-6 grid gap-2 border-t border-brand-border pt-4 text-xs leading-relaxed text-brand-muted sm:grid-cols-3">
          {([['umfang', 'Woraus'], ['luecken', 'Was fehlt'], ['einseitigkeit', 'Was daraus folgt']] as const)
            .filter(([k]) => auswertung.materiallage?.[k])
            .map(([k, label]) => (
              <div key={k}>
                <dt className="mb-0.5 font-medium text-brand-text">{label}</dt>
                <dd>{auswertung.materiallage[k]}</dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  )
}

function AnteilKarte({ anteil, achsen, gewaehlt, waehlen }: {
  anteil: FaqClusterAnteil
  achsen: Map<string, FaqAchse>
  gewaehlt: boolean
  waehlen: () => void
}) {
  const beurteilbar = anteil.wert !== null

  // `flex flex-col` statt Block: Ein <button> zentriert seinen Inhalt senkrecht, und die
  // vier Karten sind unterschiedlich hoch — die Ringe standen dann auf verschiedenen Höhen.
  // `mt-auto` an der letzten Zeile hält die Aufforderung unten bündig.
  return (
    <button
      onClick={waehlen}
      aria-pressed={gewaehlt}
      className={`flex flex-col rounded-brand border px-4 py-4 text-left transition-all ${
        gewaehlt
          ? 'border-accent bg-accent/[0.04] shadow-brand-sm'
          : beurteilbar
            ? 'border-brand-border bg-white hover:border-brand-muted/40'
            : 'border-dashed border-brand-border bg-brand-bg/40 hover:border-brand-muted/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <Ring wert={anteil.wert} />
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-snug text-navy">{anteil.name}</p>
          <p className="mt-0.5 text-[11px] text-brand-muted">
            {beurteilbar ? 'Anteile im Material' : 'nicht beurteilbar'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-brand-muted">{anteil.beschreibung}</p>

      {/* Warum keine Zahl dasteht. Ohne diesen Satz sähe „nicht beurteilbar" aus wie ein
          Fehler, statt wie das Ergebnis, das es ist. */}
      {!beurteilbar && (
        <p className="mt-2 text-[11px] leading-relaxed text-brand-text">
          Kein Wert, weil {anteil.fehlende_achsen.length === 1 ? 'eine tragende Achse' : 'tragende Achsen'}{' '}
          zu dünn belegt {anteil.fehlende_achsen.length === 1 ? 'ist' : 'sind'}:{' '}
          {anteil.fehlende_achsen.map(id => achsen.get(id)?.name ?? id).join(', ')}. Ein Wert
          aus den übrigen Achsen sähe genauso aus wie ein vollständiger — und wäre etwas
          anderes.
        </p>
      )}

      <span className="mt-auto block pt-3 text-[11px] text-accent">
        {gewaehlt ? 'Hervorhebung aufheben' : 'Woraus sich das ergibt'}
      </span>
    </button>
  )
}

/** Kreisring als Anzeige. Ohne Wert bleibt der Ring offen — sichtbar leer, nicht null. */
function Ring({ wert }: { wert: number | null }) {
  const umfang = 2 * Math.PI * 20
  const anteil = wert === null ? 0 : (wert / 100) * umfang
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor"
        className="text-brand-border" strokeWidth="4" />
      {wert !== null && (
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor"
          className="text-accent" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${anteil} ${umfang}`} />
      )}
      <text x="24" y="24" transform="rotate(90 24 24)" textAnchor="middle" dominantBaseline="central"
        className="fill-navy text-[13px] font-bold [font-family:inherit]">
        {wert === null ? '–' : wert}
      </text>
    </svg>
  )
}

function AchsenZeile({ achse, offen, aufklappen, szenen, rolle }: {
  achse: FaqAchse; offen: boolean; aufklappen: () => void; szenen: Map<number, string>
  /** Rolle im gerade gewählten Cluster-Anteil. ``null`` = keiner gewählt. */
  rolle: 'traegt' | 'entlastet' | 'unbeteiligt' | null
}) {
  const hat = achse.belege.length + achse.gegenbelege.length > 0
  // Farbe bedeutet „worauf zu schauen wäre", nicht „welche Polung die Achse hat". Vorher
  // richtete sie sich nach der Polung — dann stand ein oranger Balken bei 31 neben einem
  // grauen bei 38, und die Farbe sah willkürlich aus.
  const bemerkenswert = auffaelligkeit(achse) >= 50

  return (
    <div className={`rounded-brand border border-transparent transition-all hover:border-brand-border ${
      rolle === 'unbeteiligt' ? 'opacity-35' : ''
    }`}>
      <button
        onClick={aufklappen}
        disabled={!hat}
        aria-expanded={offen}
        className="flex w-full items-center gap-3 px-2 py-2 text-left disabled:cursor-default"
      >
        <span className="flex w-52 shrink-0 items-center gap-1.5">
          {rolle === 'traegt' && (
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent/15 text-[10px] font-bold leading-none text-accent"
              title="spricht für den gewählten Anteil">+</span>
          )}
          {rolle === 'entlastet' && (
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-navy/10 text-[10px] font-bold leading-none text-navy"
              title="spricht gegen den gewählten Anteil">−</span>
          )}
          <span className="min-w-0 truncate text-xs font-medium text-brand-text">{achse.name}</span>
        </span>

        <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-bg">
          {achse.belastbar && (
            <span
              className={`block h-full rounded-full ${bemerkenswert ? 'bg-accent/70' : 'bg-navy/25'}`}
              style={{ width: `${achse.wert}%` }}
            />
          )}
        </span>

        <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-navy">
          {achse.belastbar ? achse.wert : '–'}
        </span>
        <Belegdichte stufe={achse.belegdichte} />
      </button>

      {offen && (
        <div className="space-y-3 border-t border-brand-border px-2 pb-3 pt-3">
          <p className="text-[11px] text-brand-muted">
            <span className="font-medium text-brand-text">Skala:</span>{' '}
            0 = {achse.pol_niedrig} · 100 = {achse.pol_hoch}
          </p>
          {achse.begruendung && (
            <p className="text-xs leading-relaxed text-brand-text">{achse.begruendung}</p>
          )}
          {!achse.belastbar && (
            <p className="text-[11px] leading-relaxed text-brand-muted">
              Kein Wert angezeigt: Mit weniger als zwei Belegen wäre das eine Episode und
              kein Muster.
            </p>
          )}
          <Belegblock belege={achse.belege} gegenbelege={achse.gegenbelege} szenen={szenen} />
        </div>
      )}
    </div>
  )
}

function Belegdichte({ stufe }: { stufe: FaqAchse['belegdichte'] }) {
  const hoehe = belegdichteStufe(stufe)
  const titel = BELEGDICHTE_TEXT[stufe]
  return (
    <span className="flex w-8 shrink-0 items-end gap-0.5" title={titel} aria-label={titel}>
      {[0, 1, 2].map(i => (
        <span key={i}
          className={`w-1.5 rounded-sm ${i < hoehe ? 'bg-navy/45' : 'bg-brand-border'}`}
          style={{ height: `${4 + i * 3}px` }} />
      ))}
    </span>
  )
}

// ── Fragen ───────────────────────────────────────────────────────────────────

function Fragenteil({ kategorien, szenen, vorschau = false }: {
  kategorien: FaqKategorie[]; szenen: Map<number, string>; vorschau?: boolean
}) {
  // Offen ist die erste Kategorie mit Antworten - in der Vorschau schlicht die erste,
  // sonst stuende dort eine Reihe zugeklappter Kaesten ohne erkennbaren Inhalt.
  const [offen, setOffen] = useState<string | null>(
    kategorien.find(k => k.beantwortet > 0)?.id ?? (vorschau ? kategorien[0]?.id ?? null : null))

  return (
    <div className="space-y-3">
      {kategorien.map(k => (
        <KategorieKarte
          key={k.id}
          kategorie={k}
          offen={offen === k.id}
          umschalten={() => setOffen(offen === k.id ? null : k.id)}
          szenen={szenen}
          vorschau={vorschau}
        />
      ))}
    </div>
  )
}

function KategorieKarte({ kategorie, offen, umschalten, szenen, vorschau }: {
  kategorie: FaqKategorie; offen: boolean; umschalten: () => void
  szenen: Map<number, string>; vorschau: boolean
}) {
  const leer = !vorschau && kategorie.beantwortet === 0
  return (
    <div className={`card !p-0 overflow-hidden ${leer ? 'opacity-70' : ''}`}>
      <button
        onClick={umschalten}
        aria-expanded={offen}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-brand-bg/50"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-brand-sm bg-brand-bg text-navy">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
            strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={MARKEN[kategorie.marke] ?? MARKEN.netz} />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-navy">{kategorie.titel}</span>
          <span className="block text-xs text-brand-muted">{kategorie.untertitel}</span>
        </span>

        <span className="shrink-0 text-xs tabular-nums text-brand-muted">
          {vorschau ? `${kategorie.fragen.length} Fragen` : `${kategorie.beantwortet}/${kategorie.fragen.length}`}
        </span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-brand-muted transition-transform ${offen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {offen && (
        <div className="border-t border-brand-border">
          {kategorie.fragen.map(f => (
            <FrageZeile key={f.frage_id} frage={f} szenen={szenen} vorschau={vorschau} />
          ))}
        </div>
      )}
    </div>
  )
}

function FrageZeile({ frage, szenen, vorschau }: {
  frage: FaqFrage; szenen: Map<number, string>; vorschau: boolean
}) {
  const [offen, setOffen] = useState(false)
  const hat = !!frage.antwort

  return (
    <div className="border-b border-brand-border last:border-b-0">
      <button
        onClick={() => hat && setOffen(o => !o)}
        disabled={!hat}
        aria-expanded={offen}
        className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-bg/40 disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span className="min-w-0 flex-1">
          <span className={`block text-sm leading-snug ${hat ? 'text-brand-text' : 'text-brand-muted'}`}>
            {frage.frage}
          </span>
          {!hat && !vorschau && (
            <span className="mt-0.5 block text-[11px] text-brand-muted">
              {/* Nicht gestellt heißt: Das nötige Material war nicht freigegeben. Das ist
                  etwas anderes als „gestellt und ohne Ergebnis" — im ersten Fall fehlt
                  eine Freigabe, im zweiten das Material. */}
              {frage.gestellt
                ? 'gestellt, aber im Material nicht beantwortbar'
                : 'nicht gestellt — das nötige Material war nicht freigegeben'}
            </span>
          )}
        </span>
        {hat && <Lagepunkt lage={frage.materiallage} />}
      </button>

      {offen && frage.antwort && (
        <div className="space-y-3 bg-brand-bg/30 px-5 pb-4 pt-1">
          {frage.heikel && (
            <p className="rounded-brand-sm border-l-2 border-accent/40 bg-white px-3 py-2 text-[11px] leading-relaxed text-brand-muted">
              Tastend gemeint. Was hier steht, sind Anhaltspunkte aus einer einseitigen
              Schilderung — keine Feststellung über einen Menschen.
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{frage.antwort}</p>
          <Belegblock belege={frage.belege} gegenbelege={frage.gegenbelege} szenen={szenen} />
        </div>
      )}
    </div>
  )
}

function Lagepunkt({ lage }: { lage: FaqFrage['materiallage'] }) {
  const text = { gut: 'gut belegt', duenn: 'dünn belegt', keine: 'ohne Belege' }[lage]
  const farbe = { gut: 'bg-navy/40', duenn: 'bg-accent/60', keine: 'bg-brand-border' }[lage]
  return (
    <span className="mt-1 flex shrink-0 items-center gap-1.5 text-[11px] text-brand-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${farbe}`} aria-hidden="true" />
      {text}
    </span>
  )
}

// ── Belege ───────────────────────────────────────────────────────────────────

function Belegblock({ belege, gegenbelege, szenen }: {
  belege: FaqBeleg[]; gegenbelege: FaqBeleg[]; szenen: Map<number, string>
}) {
  if (belege.length === 0 && gegenbelege.length === 0) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <BelegSpalte titel="Belege" belege={belege} szenen={szenen} />
      {/* Die Gegenbelege stehen gleichrangig daneben, nicht darunter und nicht kleiner.
          Eine Antwort, die nur in eine Richtung zeigt, ist meist ein Auswahlfehler — die
          Spalte daneben ist der Ort, an dem das sichtbar wird. */}
      <BelegSpalte titel="Spricht dagegen" belege={gegenbelege} szenen={szenen} leerText="nichts gefunden" />
    </div>
  )
}

function BelegSpalte({ titel, belege, szenen, leerText }: {
  titel: string; belege: FaqBeleg[]; szenen: Map<number, string>; leerText?: string
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-muted">{titel}</p>
      {belege.length === 0
        ? <p className="text-[11px] italic text-brand-muted">{leerText ?? '—'}</p>
        : (
          <ul className="space-y-1.5">
            {belege.map((b, i) => (
              <li key={`${b.szene_nr}-${i}`}
                className="rounded-brand-sm border border-brand-border bg-white px-3 py-2">
                <a href={`#szene-${b.szene_nr}`}
                  className="text-[10px] font-semibold uppercase tracking-wide text-accent no-underline hover:underline">
                  Szene {b.szene_nr}
                </a>
                {szenen.get(b.szene_nr) && (
                  <span className="ml-1.5 text-[10px] text-brand-muted">{szenen.get(b.szene_nr)}</span>
                )}
                <p className="mt-1 text-[11px] italic leading-relaxed text-brand-text">„{b.zitat}"</p>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
