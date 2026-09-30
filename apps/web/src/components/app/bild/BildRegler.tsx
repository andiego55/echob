/**
 * Die Regler der Bildwerkstatt.
 *
 * **Alle wirken sofort.** Kein „Erzeugen"-Knopf, kein Warten — man zieht, und das Bild folgt.
 * Das ist der Unterschied zwischen einem Werkzeug und einem Automaten, und er ist nur zu
 * haben, weil gerechnet und nicht erfunden wird.
 *
 * **Was es im Fall nicht gibt, steht gar nicht da.** Kein ausgegrauter Schalter, der zum
 * Probieren einlädt: Wer kein Gefühlsbild hat, sieht keinen Regler dafür. Ein Schalter, der
 * nichts tut, lässt die Person glauben, das Element sei berücksichtigt.
 */
import { PALETTEN, type Anordnung, type BildWerte, type Dichte, type Schicht } from '@/lib/lagebild'

const ANORDNUNGEN: { key: Anordnung; label: string; hinweis: string }[] = [
  { key: 'zeit', label: 'Zeitachse', hinweis: 'Verlauf: Wird es dichter oder dünner?' },
  { key: 'spirale', label: 'Spirale', hinweis: 'Wiederkehr: gleicher Monat, andere Jahre' },
  { key: 'feld', label: 'Feld', hinweis: 'Ohne Zeit — nur Menge und Nähe' },
  { key: 'zwei_seiten', label: 'Zwei Seiten', hinweis: 'Links, was ist. Rechts, was fehlt' },
]

const DICHTEN: { key: Dichte; label: string }[] = [
  { key: 'karg', label: 'Karg' },
  { key: 'wenig', label: 'Wenig' },
  { key: 'normal', label: 'Normal' },
  { key: 'alles', label: 'Alles' },
]

/**
 * Die Schichten — und die Bedingung, unter der es sie gibt.
 *
 * `vorhanden` entscheidet, ob der Regler überhaupt erscheint. Die Prüfung steht hier und
 * nicht in der Seite, damit es eine Stelle gibt, an der man nachlesen kann, was eine Schicht
 * braucht.
 */
const SCHICHTEN: {
  key: Schicht
  label: string
  hinweis: string
  vorhanden: (w: BildWerte) => boolean
}[] = [
  {
    key: 'szenen', label: 'Deine Szenen',
    hinweis: 'Je Moment eine Form. Größe = wie viel du geschrieben hast',
    vorhanden: w => w.szenen.length > 0,
  },
  {
    key: 'grundton', label: 'Dein Gefühlsbild',
    hinweis: 'Der Untergrund — wie Wetter',
    vorhanden: w => w.grundton !== null,
  },
  {
    key: 'durchgaenge', label: 'Die Muster',
    hinweis: 'Linien, die durch alles hindurchlaufen',
    vorhanden: w => w.durchgaenge.some(d => d.wert > 0.25),
  },
  {
    key: 'lichter', label: 'Deine Erkenntnisse',
    hinweis: 'Die einzigen hellen Punkte im Bild',
    vorhanden: w => w.lichter.length > 0,
  },
  {
    key: 'leerstellen', label: 'Was du dir wünschst',
    hinweis: 'Als Leerstelle — was fehlt, bleibt leer',
    vorhanden: w => w.leerstellen.length > 0,
  },
  {
    key: 'druck', label: 'Die andere Person',
    hinweis: 'Nur als Druck von einer Seite, nie als Gestalt',
    vorhanden: w => w.druck !== null,
  },
]

export default function BildRegler({
  werte, palette, anordnung, dichte, schichten,
  setPalette, setAnordnung, setDichte, umschalten,
}: {
  werte: BildWerte
  palette: string
  anordnung: Anordnung
  dichte: Dichte
  schichten: Schicht[]
  setPalette: (k: string) => void
  setAnordnung: (k: Anordnung) => void
  setDichte: (k: Dichte) => void
  umschalten: (s: Schicht) => void
}) {
  const hatWunsch = werte.leerstellen.length > 0

  return (
    <div className="space-y-5">
      {/* ── Anordnung: der interessanteste Klick ─────────────────────────── */}
      <div>
        <span className="label">Anordnung</span>
        <p className="mb-2 mt-0.5 text-[0.74rem] leading-snug text-brand-muted">
          Dasselbe Material, anders sortiert — und du siehst etwas anderes.
        </p>
        <div className="grid gap-1.5">
          {ANORDNUNGEN.map(a => {
            // „Zwei Seiten" braucht die rechte Hälfte: ohne Wünsche wäre sie leer, und ein
            // halbes Bild sieht aus wie ein Fehler.
            if (a.key === 'zwei_seiten' && !hatWunsch) return null
            const an = anordnung === a.key
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setAnordnung(a.key)}
                aria-pressed={an}
                className={`rounded-brand border px-3 py-2 text-left transition-colors ${
                  an ? 'border-accent bg-accent/[0.06]'
                    : 'border-brand-border bg-white hover:border-accent/50'
                }`}
              >
                <span className={`block text-[0.83rem] font-semibold ${
                  an ? 'text-accent' : 'text-navy'
                }`}>{a.label}</span>
                <span className="block text-[0.72rem] leading-snug text-brand-muted">
                  {a.hinweis}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Was mitgeht ──────────────────────────────────────────────────── */}
      <div>
        <span className="label">Was mitgeht</span>
        <div className="mt-2 space-y-1.5">
          {SCHICHTEN.filter(s => s.vorhanden(werte)).map(s => {
            const an = schichten.includes(s.key)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => umschalten(s.key)}
                role="switch"
                aria-checked={an}
                className={`flex w-full items-start gap-2.5 rounded-brand border px-3 py-2 text-left transition-colors ${
                  an ? 'border-accent/40 bg-accent/[0.04]'
                    : 'border-brand-border bg-brand-bg hover:border-accent/40'
                }`}
              >
                <span aria-hidden="true"
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-sm border transition-colors ${
                    an ? 'border-accent bg-accent text-white' : 'border-brand-border bg-white'
                  }`}>
                  {an && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none"
                      stroke="currentColor" strokeWidth="3.5">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[0.83rem] font-medium ${
                    an ? 'text-navy' : 'text-brand-muted'
                  }`}>{s.label}</span>
                  <span className="block text-[0.72rem] leading-snug text-brand-muted">
                    {s.hinweis}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Dichte ───────────────────────────────────────────────────────── */}
      {werte.szenen.length > 2 && (
        <div>
          <span className="label">Dichte</span>
          <p className="mb-2 mt-0.5 text-[0.74rem] leading-snug text-brand-muted">
            Karg zeigt nur die schwersten Momente. Alles zeigt jeden — und wenn das
            überfüllt aussieht, ist das auch eine Aussage.
          </p>
          <div className="grid grid-cols-4 gap-1">
            {DICHTEN.map(d => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDichte(d.key)}
                aria-pressed={dichte === d.key}
                className={`rounded-brand-sm border px-1 py-1.5 text-[0.72rem] transition-colors ${
                  dichte === d.key
                    ? 'border-accent bg-accent text-white'
                    : 'border-brand-border bg-white text-brand-muted hover:border-accent/50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Farbe ────────────────────────────────────────────────────────── */}
      <div>
        <span className="label">Farbe</span>
        <p className="mb-2 mt-0.5 text-[0.74rem] leading-snug text-brand-muted">
          Keine ist richtiger als die andere — such die, die passt.
        </p>
        <div className="flex flex-wrap gap-2">
          {PALETTEN.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPalette(p.key)}
              aria-pressed={palette === p.key}
              aria-label={p.label}
              title={p.label}
              className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors ${
                palette === p.key
                  ? 'border-accent bg-accent/[0.06]' : 'border-brand-border bg-white'
              }`}
            >
              {/* Die Palette zeigt sich selbst: Ein Farbwort sagt niemandem, wie es
                  aussieht. */}
              <span aria-hidden="true"
                className="flex h-5 w-5 overflow-hidden rounded-full border border-black/10">
                <span className="w-1/2" style={{ background: p.feld[1] }} />
                <span className="w-1/2" style={{ background: p.marke[1] }} />
              </span>
              <span className={`text-[0.76rem] ${
                palette === p.key ? 'font-semibold text-accent' : 'text-brand-muted'
              }`}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
