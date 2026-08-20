/**
 * Ladeskelette in der Form dessen, was gleich kommt.
 *
 * Vorher stand an sieben Stellen nur „Lade …", danach sprang der ganze Inhalt herein.
 * Ein Skelett nimmt den Sprung heraus und halbiert die *gefühlte* Ladezeit, ohne dass
 * irgendetwas schneller wird — es zeigt vorab, wo was landen wird.
 *
 * Die Formen sind bewusst grob. Ein Skelett, das den Inhalt zu genau nachbaut, wirkt
 * wie ein Fehler, sobald der echte Inhalt anders aussieht.
 */

/** Ein grauer Balken. `w` in Prozent, damit Zeilen unterschiedlich lang wirken. */
function Balken({ w = 100, h = 12 }: { w?: number; h?: number }) {
  return (
    <div
      className="rounded bg-brand-border/60"
      style={{ width: `${w}%`, height: h }}
    />
  )
}

function Karte({ children, hero = false }: { children: React.ReactNode; hero?: boolean }) {
  return (
    <div className={`card card-static ${hero ? 'card-hero' : ''}`} aria-hidden="true">
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

/** Gemeinsame Hülle: einmal `aria-busy`, damit Screenreader nicht die Balken vorlesen. */
function Huelle({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-5 animate-pulse" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** Übersicht: Kopf mit zwei Gesichtern, Barometer als Held, zwei Karten darunter. */
export function DashboardSkeleton() {
  return (
    <Huelle label="Paarraum wird geladen">
      <Karte>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            <div className="h-12 w-12 rounded-full bg-brand-border/60" />
            <div className="h-12 w-12 rounded-full bg-brand-border/60" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Balken w={42} h={16} />
            <Balken w={62} h={10} />
          </div>
        </div>
      </Karte>

      <Karte hero>
        <Balken w={54} h={18} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-3 rounded-brand border border-brand-border px-4 py-5">
            <div className="h-16 w-32 rounded-full bg-brand-border/50" />
            <Balken w={40} h={10} />
          </div>
          <div className="flex flex-col items-center gap-3 rounded-brand border border-brand-border px-4 py-5">
            <div className="h-16 w-32 rounded-full bg-brand-border/50" />
            <Balken w={40} h={10} />
          </div>
        </div>
      </Karte>

      <Karte><Balken w={34} h={14} /><Balken w={88} /><Balken w={64} /></Karte>
      <Karte><Balken w={28} h={14} /><Balken w={76} /></Karte>
    </Huelle>
  )
}

/** Sitzung: links der Verlauf, rechts die Vorbereitung. */
export function SessionSkeleton() {
  return (
    <Huelle label="Gespräch wird geladen">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Karte>
          <Balken w={46} h={18} />
          <div className="mt-2 flex flex-col gap-3">
            <div className="rounded-brand bg-brand-bg px-3.5 py-3"><Balken w={72} /></div>
            <div className="rounded-brand border border-accent/20 px-3.5 py-3">
              <Balken w={38} h={10} />
              <div className="mt-2 flex flex-col gap-2"><Balken w={92} /><Balken w={68} /></div>
            </div>
            <div className="rounded-brand bg-brand-bg px-3.5 py-3"><Balken w={56} /></div>
          </div>
          <div className="mt-3 h-20 rounded-brand border border-brand-border" />
        </Karte>
        <Karte><Balken w={52} h={14} /><Balken w={90} /><Balken w={74} /><Balken w={40} /></Karte>
      </div>
    </Huelle>
  )
}

/** Rückblick: Zahlenkacheln über Echos Text. */
export function RetrospectSkeleton() {
  return (
    <Huelle label="Rückblick wird geladen">
      <Karte>
        <Balken w={44} h={18} />
        <div className="h-16 rounded-brand border border-brand-border" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex flex-col gap-2 rounded-brand border border-brand-border px-3.5 py-3">
              <Balken w={70} h={9} /><Balken w={40} h={18} /><Balken w={86} h={9} />
            </div>
          ))}
        </div>
      </Karte>
      <Karte><Balken w={50} h={14} /><Balken w={94} /><Balken w={88} /><Balken w={52} /></Karte>
    </Huelle>
  )
}
