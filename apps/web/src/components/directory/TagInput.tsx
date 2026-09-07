/**
 * Eingabe für Listen — Schwerpunkte, Sprachen und alles, wovon es mehrere gibt.
 *
 * **Warum das ein eigenes Bauteil ist und kein Textfeld mit Kommas.** Ein Feld, dessen
 * Anzeige aus der Liste zurückgerechnet wird, lässt sich nicht mehr bedienen: Tippt man
 * „Paare,", wird daraus die Liste `['Paare']` und daraus wieder der Text „Paare" — das
 * Komma verschwindet unter den Fingern, und ein zweiter Eintrag ist nie erreichbar.
 * Genau das ist im Admin-Editor passiert und beim Benutzen aufgefallen, nicht im Test:
 * Geprüft war nur der fertige Zustand `['Paare','Trauma'] ⇄ "Paare, Trauma"`, nie der
 * Zwischenstand beim Tippen.
 *
 * Hier gehört der Entwurfstext dem Feld selbst (`draft`). Er wird nie aus der Liste
 * zurückgerechnet, sondern nur beim Bestätigen — Enter oder Komma — in sie überführt.
 * Damit kann der Fehler strukturell nicht wiederkommen.
 */
import { useState } from 'react'

/**
 * Einen Eintrag aufnehmen. Steht getrennt, weil hier die ganze Regel liegt:
 * Leerraum weg, nichts Leeres, nichts doppelt.
 */
export function tagHinzufuegen(werte: string[], text: string): string[] {
  const v = text.trim()
  if (!v || werte.includes(v)) return werte
  return [...werte, v]
}

export default function TagInput({ values, onChange, placeholder, suggestions }: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  suggestions?: string[]
}) {
  const [draft, setDraft] = useState('')
  const add = (t: string) => { onChange(tagHinzufuegen(values, t)); setDraft('') }
  const offeneVorschlaege = (suggestions ?? []).filter((s) => !values.includes(s))

  return (
    <div>
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {values.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[0.8rem] text-navy">
              {t}
              <button onClick={() => onChange(values.filter((x) => x !== t))}
                className="text-brand-muted hover:text-accent" aria-label="Entfernen">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        // Komma zählt wie Enter: Wer Listen tippt, trennt sie fast immer so.
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft) } }}
        // Sonst geht der angefangene Eintrag beim Klick auf „Speichern" verloren.
        onBlur={() => draft.trim() && add(draft)}
        placeholder={placeholder}
        className="input"
      />
      {offeneVorschlaege.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {offeneVorschlaege.slice(0, 6).map((s) => (
            <button key={s} onClick={() => add(s)}
              className="rounded-full border border-dashed border-brand-border px-2.5 py-0.5 text-[0.75rem] text-brand-muted hover:border-accent hover:text-accent">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
