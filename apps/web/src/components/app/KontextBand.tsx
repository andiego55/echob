/**
 * „Echo denkt mit" — was gerade im Kontext liegt, und was man wegnehmen kann.
 *
 * **Warum es das gibt.** Bei jeder Nachricht laufen bis zu 30.000 Token Fallwissen mit:
 * Szenen, Muster, Hypothesen, Profile, Dokumente, Erkenntnisse. Der Nutzer sah davon
 * **nichts**. Er saß vor einem Eingabefeld, das aussieht wie jedes andere Chatfenster, und
 * konnte den Unterschied erst bemerken, wenn Echo zufällig etwas sagte, das nur Echo sagen
 * kann. Der größte Vorteil dieser App war ihre bestgehütete Eigenschaft.
 *
 * **Warum es abschaltbar ist.** Eine Anzeige wäre schon viel; ein Schalter macht daraus ein
 * Werkzeug. „Antworte mir mal ohne das Fallprofil", „heute ohne die Hypothesen denken" —
 * das sind echte Reflexionszüge. Wer alles mitlaufen lässt, bekommt eine Antwort, die auf
 * allem beruht; wer etwas wegnimmt, sieht, woran es lag.
 *
 * **Warum es pro Nachricht gilt und nirgends gespeichert wird.** Ein dauerhaft
 * weggeschalteter Kontext wäre eine Falle: Wochen später wundert man sich, warum Echo den
 * Fall nicht mehr kennt, und niemand erinnert sich an den Schalter. Beim Verlassen der
 * Seite ist alles wieder an.
 *
 * **Und es ist die ehrlichste Datenschutzaussage, die man machen kann:** Hier steht, was
 * an das Sprachmodell geht. Kein anderes Produkt zeigt das.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { echoKontextApi, type KontextTeil } from '@/api/echoKontext'

interface Props {
  caseId: string
  /** Die Schlüssel, die gerade weggeschaltet sind. */
  ohne: string[]
  onAendern: (ohne: string[]) => void
}

export default function KontextBand({ caseId, ohne, onAendern }: Props) {
  const [offen, setOffen] = useState(false)

  const { data } = useQuery({
    queryKey: ['echo-kontext', caseId],
    queryFn: () => echoKontextApi.uebersicht(caseId),
    enabled: !!caseId,
    retry: false,
    staleTime: 60_000,
  })

  const teile = data?.parts ?? []
  // Was 0 zählt, ist nicht dabei — ein Band, das „0 Dokumente" bewirbt, wirkt leer.
  // In der aufgeklappten Ansicht steht es trotzdem, dort ist es eine Auskunft.
  const vorhanden = teile.filter(t => t.anzahl > 0)
  const aktiv = vorhanden.filter(t => !ohne.includes(t.key))

  if (teile.length === 0) return null

  const umschalten = (key: string) =>
    onAendern(ohne.includes(key) ? ohne.filter(k => k !== key) : [...ohne, key])

  return (
    <div className="border-b border-brand-border bg-white">
      <div className="mx-auto max-w-[780px] px-6 py-2">
        <button
          type="button"
          onClick={() => setOffen(o => !o)}
          aria-expanded={offen}
          className="flex w-full items-center gap-2 text-left text-xs text-brand-muted transition-colors hover:text-navy"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 text-accent" fill="none" aria-hidden="true">
            <circle cx="5" cy="10" r="1.8" fill="currentColor" />
            <path d="M9 6.6 A 5 5 0 0 1 9 13.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12.4 4.4 A 8.4 8.4 0 0 1 12.4 15.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".5" />
          </svg>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium text-navy">Echo denkt mit:</span>{' '}
            {aktiv.length > 0
              ? aktiv.map(t => `${t.anzahl > 1 ? `${t.anzahl} ` : ''}${t.label}`).join(' · ')
              : 'nichts aus deinem Fall'}
          </span>
          {ohne.length > 0 && (
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[0.65rem] font-medium text-accent">
              {ohne.length} aus
            </span>
          )}
          <span className={`shrink-0 transition-transform ${offen ? 'rotate-180' : ''}`} aria-hidden>▾</span>
        </button>

        {offen && (
          <div className="mt-2.5 rounded-brand border border-brand-border bg-brand-bg/60 p-3">
            <p className="text-[0.7rem] leading-relaxed text-brand-muted">
              Das geht mit jeder Nachricht an das Sprachmodell. Nimm etwas weg, um zu sehen,
              woran eine Antwort hängt — <strong className="text-navy">nur für dieses
              Gespräch</strong>, beim nächsten Öffnen ist wieder alles dabei.
            </p>

            <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
              {teile.map(t => (
                <TeilZeile
                  key={t.key}
                  teil={t}
                  an={!ohne.includes(t.key)}
                  onUmschalten={() => umschalten(t.key)}
                />
              ))}
            </div>

            {ohne.length > 0 && (
              <button
                type="button"
                onClick={() => onAendern([])}
                className="mt-2.5 text-[0.7rem] text-accent hover:underline"
              >
                Alles wieder einbeziehen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TeilZeile({ teil, an, onUmschalten }: {
  teil: KontextTeil
  an: boolean
  onUmschalten: () => void
}) {
  const leer = teil.anzahl === 0

  return (
    <button
      type="button"
      onClick={onUmschalten}
      disabled={leer}
      aria-pressed={an && !leer}
      title={teil.hinweis}
      className={`flex items-start gap-2 rounded-brand border px-3 py-2 text-left transition ${
        leer
          ? 'cursor-default border-brand-border/60 opacity-50'
          : an
            ? 'border-accent/40 bg-white'
            : 'border-brand-border bg-transparent'
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border text-[0.6rem] ${
          an && !leer
            ? 'border-accent bg-accent text-white'
            : 'border-brand-border text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="min-w-0">
        <span className={`block text-[0.72rem] font-medium ${an && !leer ? 'text-navy' : 'text-brand-muted'}`}>
          {teil.label}
          {teil.anzahl > 1 && <span className="ml-1 font-normal text-brand-muted">({teil.anzahl})</span>}
          {leer && <span className="ml-1 font-normal text-brand-muted">— nichts da</span>}
        </span>
        <span className="mt-0.5 block text-[0.66rem] leading-snug text-brand-muted/80">
          {teil.hinweis}
        </span>
      </span>
    </button>
  )
}
