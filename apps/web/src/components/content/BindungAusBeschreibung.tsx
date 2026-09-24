/**
 * „Beschreib es einfach" — Bindungsmuster aus eigenen Worten vorschlagen.
 *
 * **Wofür.** Die Matrix verlangt zwei Angaben, die man nur machen kann, wenn man die vier
 * Muster schon kennt. Wer sie nicht kennt — und das sind die meisten, die hierher finden —
 * steht vor acht Kacheln und weiß nicht weiter. Hier beschreibt man in eigenen Worten, wie
 * es zugeht, und bekommt Vorschläge für beide Seiten.
 *
 * **Und dann füllt es die Matrix.** Das ist der eigentliche Zweck: nicht ein Ergebnis zum
 * Anschauen, sondern ein Weg in das Werkzeug, das ohnehin auf der Seite steht.
 *
 * **Zwei Vorschläge je Seite, nie einer — und immer mit Gegenrede.** Das entscheidet der
 * Server; hier steht es trotzdem, weil es die Form dieser Karte bestimmt: Zwei Vorschläge
 * nebeneinander lesen sich als Angebot, einer als Befund.
 *
 * **Nichts wird gespeichert.** Weder der Text noch das Ergebnis. Das steht auch dort, wo
 * man tippt — wer etwas über seine Beziehung in ein Feld schreibt, darf nicht raten
 * müssen, wo es landet.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { apiErrorMessage } from '@/api/errors'
import { TYPES, type AttachType } from '@/content/compatibility'

const MAX_ZEICHEN = 1200
const MIN_ZEICHEN = 80

interface Kandidat {
  muster: AttachType
  dafuer: string
  dagegen: string
}

interface Einschaetzung {
  du: Kandidat[]
  gegenueber: Kandidat[]
  hinweis: string | null
}

export default function BindungAusBeschreibung({ onUebernehmen }: {
  onUebernehmen: (me: AttachType, partner: AttachType) => void
}) {
  const [text, setText] = useState('')
  const [offen, setOffen] = useState(false)

  const fragen = useMutation({
    mutationFn: async (): Promise<Einschaetzung> => {
      const r = await apiClient.post<Einschaetzung>('/bindung', { text }, { timeout: 60_000 })
      return r.data
    },
  })

  const ergebnis = fragen.data
  const hatVorschlaege = !!ergebnis && ergebnis.du.length > 0 && ergebnis.gegenueber.length > 0

  if (!offen) {
    return (
      <div className="mt-8 rounded-brand-lg border border-dashed border-brand-border bg-brand-bg/40 px-6 py-5 text-center">
        <p className="text-[0.95rem] font-semibold text-navy">
          Du weißt nicht, welcher Typ du bist?
        </p>
        <p className="mx-auto mt-1 max-w-[52ch] text-[0.86rem] leading-relaxed text-brand-muted">
          Beschreib in ein paar Sätzen, wie es zwischen euch zugeht — Echo schlägt dir vor,
          welche Muster dazu passen könnten.
        </p>
        <button
          type="button"
          onClick={() => setOffen(true)}
          className="btn-primary mt-4 !px-5 !py-2.5 !text-sm"
        >
          Beschreiben statt wählen
        </button>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-brand-lg border border-brand-border bg-white px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.95rem] font-semibold text-navy">
          Wie geht es zwischen euch zu?
        </p>
        <button
          type="button"
          onClick={() => setOffen(false)}
          className="text-[0.78rem] text-brand-muted hover:text-navy"
        >
          Schließen
        </button>
      </div>
      <p className="mt-1 max-w-[60ch] text-[0.84rem] leading-relaxed text-brand-muted">
        Was passiert, wenn es eng wird? Wer geht auf wen zu, wer zieht sich zurück, wie
        endet ein Streit? Zwei, drei Sätze reichen.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value.slice(0, MAX_ZEICHEN))}
        rows={5}
        placeholder="Nach einem Streit schreibe ich meistens noch am selben Abend, er meldet sich oft tagelang nicht …"
        className="input mt-3 resize-y text-[0.95rem] leading-relaxed"
      />
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.74rem] text-brand-muted">
          Wird nicht gespeichert — weder der Text noch das Ergebnis.
        </p>
        <p className="text-[0.72rem] text-brand-muted">{text.length} / {MAX_ZEICHEN}</p>
      </div>

      <button
        type="button"
        disabled={text.trim().length < MIN_ZEICHEN || fragen.isPending}
        onClick={() => fragen.mutate()}
        className="btn-primary mt-3 !px-5 !py-2 !text-sm disabled:opacity-40"
      >
        {fragen.isPending ? 'Echo liest …' : 'Vorschläge ansehen'}
      </button>

      {fragen.isError && (
        <p className="mt-3 rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-[0.84rem] text-red-700">
          {apiErrorMessage(fragen.error)}
        </p>
      )}

      {ergebnis?.hinweis && !hatVorschlaege && (
        <p className="mt-3 rounded-brand border border-brand-border bg-brand-bg px-4 py-2.5 text-[0.84rem] leading-relaxed text-brand-muted">
          {ergebnis.hinweis}
        </p>
      )}

      {hatVorschlaege && (
        <div className="beitrag-neu mt-5 border-t border-brand-border pt-5">
          {/* Der Satz steht VOR den Vorschlaegen, nicht als Kleingedrucktes darunter:
              Wer erst liest „du bist vermutlich aengstlich gebunden" und danach „das ist
              keine Feststellung", hat das Erste schon geglaubt. */}
          <p className="text-[0.84rem] leading-relaxed text-brand-muted">
            Das ist <strong className="text-navy">keine Feststellung</strong> — Echo hat ein
            paar Sätze gelesen, mehr nicht. Deshalb stehen je zwei Muster nebeneinander,
            mit dem, was dafür und was dagegen spricht. Das Interessante liegt im
            Vergleich.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Spalte titel="Bei dir könnte passen" kandidaten={ergebnis.du} />
            <Spalte
              titel="Bei deinem Gegenüber könnte passen"
              kandidaten={ergebnis.gegenueber}
              fussnote="Aus deiner Schilderung — die andere Person hat dazu nichts gesagt."
            />
          </div>

          {ergebnis.hinweis && (
            <p className="mt-4 text-[0.82rem] leading-relaxed text-brand-muted">
              {ergebnis.hinweis}
            </p>
          )}

          {/* Der eigentliche Zweck: nicht ein Ergebnis zum Anschauen, sondern ein Weg in
              das Werkzeug, das ohnehin auf der Seite steht. */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onUebernehmen(
                ergebnis.du[0].muster, ergebnis.gegenueber[0].muster)}
              className="btn-primary !px-5 !py-2 !text-sm"
            >
              Diese Paarung in der Matrix ansehen
            </button>
            <span className="text-[0.78rem] text-brand-muted">
              Oder wähl oben selbst — die Vorschläge sind nur ein Anfang.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Spalte({ titel, kandidaten, fussnote }: {
  titel: string
  kandidaten: Kandidat[]
  fussnote?: string
}) {
  return (
    <div>
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-muted">
        {titel}
      </p>
      <div className="mt-2 space-y-3">
        {kandidaten.map(k => (
          <div key={k.muster} className="rounded-brand border border-brand-border px-4 py-3">
            <p className="text-[0.92rem] font-semibold text-navy">
              {TYPES[k.muster]?.name ?? k.muster}
            </p>
            <p className="mt-1.5 text-[0.84rem] leading-relaxed text-brand-text">
              {k.dafuer}
            </p>
            {/* Die Gegenrede gleich gross und gleich sichtbar. Kleiner gesetzt waere sie
                eine Fussnote, und Fussnoten liest man nicht. */}
            <p className="mt-1.5 text-[0.84rem] leading-relaxed text-brand-muted">
              <span className="font-semibold">Dagegen spricht:</span> {k.dagegen}
            </p>
          </div>
        ))}
      </div>
      {fussnote && (
        <p className="mt-2 text-[0.74rem] leading-relaxed text-brand-muted">{fussnote}</p>
      )}
    </div>
  )
}
