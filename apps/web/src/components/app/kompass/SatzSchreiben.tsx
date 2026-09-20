/**
 * Einen Satz über sich aufschreiben.
 *
 * **Die Art kommt vor dem Text, und das ist der ganze Trick.** „Schreib einen Satz über
 * dich" führt zu nichts — die Frage ist zu groß. „Was hältst du über dich für wahr, was
 * du nie überprüft hast?" führt zu einem Satz. Die sechs Arten sind sechs solche Fragen,
 * und deshalb wählt man erst die Art.
 *
 * **Die Erklärung steht neben der Art, nicht in einem Hilfetext.** „Glaubenssatz" und
 * „Wert" sind Fachworte, auch wenn sie nicht danach klingen. Wer sie zum ersten Mal
 * liest, rät — und schreibt unter „Wert", was eigentlich ein Vorsatz ist. Ein Fragezeichen
 * daneben würde niemand anklicken, solange er glaubt, das Wort zu kennen.
 *
 * **Das Beispiel wird zum Platzhalter.** Es steht damit zweimal da: einmal als Erklärung,
 * einmal an der Stelle, an der man gleich selbst schreibt. Die zweite Stelle ist die, die
 * wirkt — dort sieht man die FORM, die ein solcher Satz hat.
 *
 * **Was diese Komponente nicht tut: speichern.** Sie reicht den Entwurf weiter; das Netz
 * gehört der Seite.
 */
import { useState } from 'react'
import type { SatzArt, SatzNeu } from '@/api/kompass'
import Fehlermeldung from '@/components/Fehlermeldung'

export default function SatzSchreiben({
  arten, maxZeichen, onSpeichern, onAbbrechen,
}: {
  arten: SatzArt[]
  maxZeichen: number
  onSpeichern: (satz: SatzNeu) => Promise<unknown>
  onAbbrechen?: () => void
}) {
  const [artKey, setArtKey] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<unknown>(null)

  const art = arten.find(a => a.key === artKey)
  const uebrig = maxZeichen - text.length

  async function speichern() {
    if (!artKey || !text.trim() || laeuft) return
    setLaeuft(true)
    setFehler(null)
    try {
      await onSpeichern({ art: artKey, text: text.trim() })
      setText('')
      setArtKey(null)
    } catch (e) {
      setFehler(e)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div>
      <p className="section-label">Was für ein Satz ist das?</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {arten.map(a => {
          const an = artKey === a.key
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => setArtKey(an ? null : a.key)}
              aria-pressed={an}
              className={[
                'rounded-full border px-4 py-2 text-[0.88rem] font-medium transition-all',
                an
                  ? 'border-accent bg-accent text-white shadow-[0_4px_14px_rgba(224,123,84,0.3)]'
                  : 'border-brand-border bg-white text-brand-text hover:border-accent/50',
              ].join(' ')}
            >
              {a.label}
            </button>
          )
        })}
      </div>

      {/* Erklärung und Feld erscheinen zusammen: Vor der Wahl der Art gibt es nichts
          Sinnvolles zu schreiben, und ein leeres Feld über einer ungestellten Frage
          sieht aus wie eine Aufgabe. */}
      {art && (
        <div className="beitrag-neu mt-4">
          <div className="rounded-brand border-l-2 border-accent/50 bg-brand-bg/70 py-3 pl-4 pr-3">
            <p className="text-[0.88rem] leading-relaxed text-brand-muted">{art.hinweis}</p>
          </div>

          <label htmlFor="satz-text" className="sr-only">{art.label}</label>
          <textarea
            id="satz-text"
            value={text}
            onChange={e => setText(e.target.value.slice(0, maxZeichen))}
            rows={2}
            autoFocus
            placeholder={art.beispiel}
            className="input mt-3 resize-y text-[0.98rem] leading-relaxed"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {/* Die Restzahl erst, wenn sie knapp wird. Ein Zähler, der von 300
                herunterzählt, macht aus einem Satz über sich eine Übung im Kürzen. */}
            <p className="text-[0.75rem] text-brand-muted">
              {uebrig <= 60
                ? `Noch ${uebrig} Zeichen`
                : 'Ein Satz genügt. Zwei, wenn es sein muss.'}
            </p>

            <div className="flex gap-2">
              {onAbbrechen && (
                <button
                  type="button"
                  onClick={() => { setText(''); setArtKey(null); onAbbrechen() }}
                  className="btn-quiet !px-4 !py-2 !text-sm"
                >
                  Abbrechen
                </button>
              )}
              <button
                type="button"
                onClick={speichern}
                disabled={laeuft || !text.trim()}
                className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
              >
                {laeuft ? 'Wird gesichert …' : 'Als Entwurf sichern'}
              </button>
            </div>
          </div>

          <Fehlermeldung error={fehler} />

          {/* Der wichtigste Satz auf dieser Seite. Ohne ihn entsteht der Eindruck, man
              lege hier eine Eigenschaft von sich fest. */}
          <p className="mt-3 text-[0.78rem] leading-relaxed text-brand-muted">
            Ein Entwurf zählt noch nicht. Du bestätigst ihn erst, wenn du ihn gelesen hast
            und er stimmt — und du kannst ihn jederzeit als überholt markieren.
          </p>
        </div>
      )}
    </div>
  )
}
