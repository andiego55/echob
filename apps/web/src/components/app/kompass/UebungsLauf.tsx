/**
 * Eine geführte Übung, Frage für Frage.
 *
 * **Eine Frage auf einmal, nicht vier.** Vier Textfelder untereinander sind ein Formular,
 * und vor einem Formular über die eigene Scham hört man auf. Eine Frage mit ihrem Hinweis
 * ist ein Gespräch, das jemand führt — und genau das soll es sein.
 *
 * **Überspringen steht gleichberechtigt neben Weiter.** Eine Frage, die man nicht
 * beantworten kann, ist normal; sie zur Pflicht zu machen beendet die Übung an der
 * Stelle, an der sie interessant wird. Zwei von vier genügen für ein Ergebnis.
 *
 * **Zurück geht immer.** Wer bei Frage drei merkt, dass Frage eins anders gemeint war,
 * muss das ändern können, ohne von vorn anzufangen. Die Antworten bleiben beim Blättern
 * stehen — und auch dann, wenn am Ende nichts herauskommt: Zehn Minuten Arbeit dürfen
 * nicht an einer Modellantwort hängen.
 *
 * **Ein Schritt ist eine FORM, kein Textfeld.** Der Bauplan nennt das die zweite
 * Grammatik: „eine Handvoll Eingabeformen, aus denen jedes Werkzeug zusammengesetzt
 * wird". Diese Komponente führt durch die Schritte und rendert je nach `form` — ein Feld
 * zum Schreiben oder Gegensätze zum Antippen. Eine dritte Form später ist ein Zweig hier
 * und ein eigenes Stück, kein Umbau.
 *
 * **Und deshalb heißt der Knopf nicht mehr „Fertig, wenn zwei Fragen beantwortet sind".**
 * Wie viele es braucht, sagt die Übung — eine, die aus einer einzigen Form besteht,
 * verlangt einen Schritt. Stünde hier eine feste Zwei, hinge das Ergebnis einer
 * Antipp-Übung an dem freien Feld dahinter, und „Tippen ist immer möglich, nie nötig"
 * wäre genau umgedreht.
 *
 * **Das Ergebnis ist ein Entwurf.** Es liegt danach schon im Kompass und gilt trotzdem
 * erst mit der Zustimmung. Wer unsicher ist, geht weg und entscheidet morgen.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Fehlermeldung from '@/components/Fehlermeldung'
import Chip from '@/components/Chip'
import EntwederOder from './EntwederOder'
import type { Uebung, UebungsErgebnis } from '@/api/kompass'

export default function UebungsLauf({ uebung, onAbschliessen, onZurueck }: {
  uebung: Uebung
  onAbschliessen: (antworten: string[]) => Promise<UebungsErgebnis>
  onZurueck: () => void
}) {
  const [antworten, setAntworten] = useState<string[]>(
    () => uebung.schritte.map(() => ''),
  )
  const [schritt, setSchritt] = useState(0)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<unknown>(null)
  const [ergebnis, setErgebnis] = useState<UebungsErgebnis | null>(null)

  const letzter = schritt === uebung.schritte.length - 1
  const beantwortet = antworten.filter(a => a.trim()).length
  const aktuell = uebung.schritte[schritt]
  const paarForm = aktuell.form === 'paare'
  // Die Antwort einer Paar-Form ist die Liste der angetippten Pol-Schluessel, als eine
  // Zeichenkette. Sie bleibt damit im selben Kanal wie jede andere Antwort - und was
  // daraus ein deutscher Satz wird, entscheidet der Server.
  const pole = antworten[schritt] ? antworten[schritt].split(',').filter(Boolean) : []

  async function fertig() {
    if (laeuft) return
    setLaeuft(true)
    setFehler(null)
    try {
      setErgebnis(await onAbschliessen(antworten))
    } catch (e) {
      setFehler(e)
    } finally {
      setLaeuft(false)
    }
  }

  // ── Das Ergebnis ──────────────────────────────────────────────────────────
  if (ergebnis) {
    const satz = ergebnis.satz
    const vorhaben = ergebnis.vorhaben
    return (
      <div className="beitrag-neu">
        {satz && (
          <>
            <p className="section-label">Daraus ist geworden</p>
            <article className="mt-2 rounded-brand border border-accent/40 bg-brand-card p-4">
              <Chip ton="wartet">{satz.art_label ?? satz.art}</Chip>
              <p className="mt-2 text-[1.05rem] leading-relaxed text-navy">„{satz.text}“</p>
            </article>
            <p className="mt-3 text-[0.84rem] leading-relaxed text-brand-muted">
              Er liegt jetzt als Entwurf bei deinen Sätzen und gilt erst, wenn du ihm
              zustimmst. Das musst du nicht heute entscheiden.
            </p>
            <Link to="/app/kompass/saetze" className="btn-primary mt-3 !px-5 !py-2 !text-sm">
              Zu meinen Sätzen
            </Link>
          </>
        )}

        {vorhaben && (
          <>
            <p className="section-label">Daraus ist geworden</p>
            <article className="mt-2 rounded-brand border border-accent/40 bg-brand-card p-4">
              <h3 className="text-[1.05rem] font-semibold leading-snug text-navy">
                {vorhaben.titel}
              </h3>
              {vorhaben.warum && (
                <p className="mt-1 text-[0.85rem] italic text-brand-muted">
                  {vorhaben.warum}
                </p>
              )}
              {vorhaben.schritte.length > 0 && (
                <ul className="mt-2 space-y-1 text-[0.9rem] text-brand-text">
                  {vorhaben.schritte.map((s, i) => (
                    <li key={i}>· {s.text}</li>
                  ))}
                </ul>
              )}
            </article>
            <Link to="/app/kompass/vorhaben" className="btn-primary mt-3 !px-5 !py-2 !text-sm">
              Zu meinen Vorhaben
            </Link>
          </>
        )}

        {!satz && !vorhaben && (
          <>
            <p className="text-[0.95rem] leading-relaxed text-brand-muted">
              {ergebnis.hinweis}
            </p>
            {/* Die Antworten stehen noch — das ist keine Floskel, sie sind im Zustand
                dieser Komponente. Ohne diesen Knopf müsste man sie neu tippen. */}
            <button
              type="button"
              onClick={() => setErgebnis(null)}
              className="btn-primary mt-3 !px-5 !py-2 !text-sm"
            >
              Zurück zu meinen Antworten
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onZurueck}
          className="ml-3 text-[0.82rem] text-brand-muted underline underline-offset-2 transition-colors hover:text-navy"
        >
          Zu den Übungen
        </button>
      </div>
    )
  }

  // ── Der Lauf ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="card-title-lg">{uebung.label}</h2>
        <button
          type="button"
          onClick={onZurueck}
          className="text-[0.8rem] text-brand-muted transition-colors hover:text-navy"
        >
          Abbrechen
        </button>
      </div>

      {/* Punkte statt „Schritt 2 von 4": Man sieht, wie weit es noch ist, ohne dass es
          nach Fortschrittsbalken aussieht. Beantwortete Fragen sind gefüllt. */}
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {uebung.schritte.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i === schritt ? 'bg-accent'
                : antworten[i]?.trim() ? 'bg-accent/40' : 'bg-brand-border'
            }`}
          />
        ))}
      </div>

      {laeuft ? (
        <p className="flex items-center justify-center gap-2 py-8 text-[0.9rem] text-brand-muted">
          <span className="flex gap-1" aria-hidden="true">
            <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="echo-welle h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Echo liest deine Antworten …
        </p>
      ) : (
        <div className="mt-5">
          {/* Bei Paaren kein <label>: Es gibt kein einzelnes Feld, auf das es zeigen
              koennte, und ein Label ohne Ziel ist fuer einen Screenreader schlimmer als
              keins. Die Frage traegt dort die Gruppe. */}
          {paarForm ? (
            <p className="text-[1.02rem] font-semibold leading-snug text-navy">
              {aktuell.frage}
            </p>
          ) : (
            <label
              htmlFor="uebung-antwort"
              className="block text-[1.02rem] font-semibold leading-snug text-navy"
            >
              {aktuell.frage}
            </label>
          )}
          <p className="mt-1.5 max-w-[60ch] text-[0.84rem] leading-relaxed text-brand-muted">
            {aktuell.hinweis}
          </p>

          {paarForm ? (
            <div role="group" aria-label={aktuell.frage}>
              <EntwederOder
                paare={aktuell.paare}
                gewaehlt={pole}
                onWahl={schluessel => setAntworten(alt =>
                  alt.map((a, i) => (i === schritt ? schluessel.join(',') : a)))}
              />
            </div>
          ) : (
            <textarea
              id="uebung-antwort"
              key={schritt}
              value={antworten[schritt]}
              onChange={e => setAntworten(alt =>
                alt.map((a, i) => (i === schritt ? e.target.value.slice(0, 1500) : a)))}
              rows={4}
              autoFocus
              placeholder={aktuell.platzhalter}
              className="input mt-3 resize-y text-[0.98rem] leading-relaxed"
            />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {schritt > 0 && (
              <button
                type="button"
                onClick={() => setSchritt(s => s - 1)}
                className="btn-quiet !px-4 !py-2 !text-sm"
              >
                Zurück
              </button>
            )}

            {!letzter ? (
              <button
                type="button"
                onClick={() => setSchritt(s => s + 1)}
                className="btn-primary !px-5 !py-2 !text-sm"
              >
                {antworten[schritt].trim()
                  ? 'Weiter'
                  : paarForm ? 'Ohne Auswahl weiter' : 'Überspringen'}
              </button>
            ) : (
              <button
                type="button"
                onClick={fertig}
                disabled={beantwortet < uebung.mindestens}
                className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
              >
                Fertig
              </button>
            )}

            {letzter && beantwortet < uebung.mindestens && (
              <span className="text-[0.78rem] text-brand-muted">
                {uebung.mindestens > 1
                  ? 'Zwei beantwortete Fragen genügen — welche, ist egal.'
                  : 'Tipp wenigstens ein paar Paare an.'}
              </span>
            )}
          </div>

          <Fehlermeldung error={fehler} />
        </div>
      )}
    </div>
  )
}
