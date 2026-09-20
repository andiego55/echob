/**
 * Einen Moment festhalten.
 *
 * **Die fünf Sekunden sind die Anforderung, nicht die Ausrede.** Wer sich gerade schlecht
 * fühlt, füllt kein Formular aus. Deshalb steht oben genau ein Griff — die Reihe der
 * Zustände —, und mit ihm allein ist der Puls vollständig. Alles Weitere erscheint erst,
 * wenn jemand den ersten Schritt getan hat, und nichts davon ist Pflicht. Ein Verlauf aus
 * einem Antippen pro Tag ist unendlich viel mehr wert als ein ausführliches Formular, das
 * dreimal benutzt wird.
 *
 * **Warum der Rest hinter „mehr" liegt.** Wörter, Notiz und Fallbezug sind gut, wenn man
 * sie will. Sichtbar vorn wären sie fünf unbeantwortete Fragen, und unbeantwortete Fragen
 * fühlen sich an wie eine unvollständige Antwort.
 *
 * **Was diese Komponente nicht tut: laden und speichern.** Sie hält den Entwurf und reicht
 * ihn weiter. Das Netz gehört der Seite — so lässt sich dasselbe Formular später auch
 * woanders einsetzen (auf dem Fall-Überblick etwa), ohne seine eigene Abfrage mitzubringen.
 */
import { useEffect, useRef, useState } from 'react'
import type { KompassKatalog, PulsNeu } from '@/api/kompass'
import type { Case } from '@/types'
import Fehlermeldung from '@/components/Fehlermeldung'
import { ton } from '@/lib/kompass'
import AnspannungsRegler from './AnspannungsRegler'
import ZustandsReihe from './ZustandsReihe'
import Wortwahl from './Wortwahl'

/** Wie lange die Bestätigung stehen bleibt, bevor wieder das Formular da ist. */
const BESTAETIGUNG_MS = 3200

const LEER = {
  zustand: null as number | null,
  anspannung: null as number | null,
  worte: [] as string[],
  notiz: '',
  geholfen: '',
  caseId: '',
}

export default function PulsErfassen({
  katalog, faelle = [], onSpeichern, ueberschrift = 'Wie geht es dir gerade?',
}: {
  katalog: KompassKatalog
  /** Für „das war mit …". Leer ist völlig in Ordnung — der Kompass braucht keinen Fall. */
  faelle?: Case[]
  onSpeichern: (puls: PulsNeu) => Promise<unknown>
  ueberschrift?: string
}) {
  const [entwurf, setEntwurf] = useState(LEER)
  const [mehr, setMehr] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<unknown>(null)
  const [fertig, setFertig] = useState<string | null>(null)
  const uhr = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ein Zeitgeber, der nach dem Verlassen der Seite noch feuert, setzt einen Zustand auf
  // einer Komponente, die es nicht mehr gibt.
  useEffect(() => () => { if (uhr.current) clearTimeout(uhr.current) }, [])

  const setzen = (teil: Partial<typeof LEER>) => setEntwurf(e => ({ ...e, ...teil }))

  const gewaehlterZustand = katalog.zustaende.find(z => z.wert === entwurf.zustand)
  const gutDrauf = entwurf.zustand !== null && entwurf.zustand >= katalog.guter_zustand_ab

  async function speichern() {
    if (entwurf.zustand === null || laeuft) return
    setLaeuft(true)
    setFehler(null)
    try {
      await onSpeichern({
        zustand: entwurf.zustand,
        anspannung: entwurf.anspannung,
        worte: entwurf.worte,
        notiz: entwurf.notiz.trim() || null,
        geholfen: gutDrauf ? entwurf.geholfen.trim() || null : null,
        case_id: entwurf.caseId || null,
      })
      setFertig(gewaehlterZustand?.label ?? null)
      setEntwurf(LEER)
      setMehr(false)
      uhr.current = setTimeout(() => setFertig(null), BESTAETIGUNG_MS)
    } catch (e) {
      setFehler(e)
    } finally {
      setLaeuft(false)
    }
  }

  // ── Die Bestätigung ───────────────────────────────────────────────────────
  // Kein Hinweis auf eine Serie und kein Lob. Wer festhält, dass es ihm schlecht geht,
  // soll dafür keine Glückwünsche bekommen.
  if (fertig !== null) {
    return (
      <div className="beitrag-neu py-6 text-center">
        <p className="text-[1.05rem] font-semibold text-navy">Festgehalten.</p>
        <p className="mt-1 text-[0.88rem] text-brand-muted">
          Steht jetzt in deinem Verlauf — {fertig}.
        </p>
        <button
          type="button"
          onClick={() => { if (uhr.current) clearTimeout(uhr.current); setFertig(null) }}
          className="mt-3 text-[0.8rem] font-medium text-accent underline underline-offset-2"
        >
          Noch etwas festhalten
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-center text-[0.95rem] font-semibold text-navy">{ueberschrift}</p>

      <div className="mt-3">
        <ZustandsReihe
          zustaende={katalog.zustaende}
          gewaehlt={entwurf.zustand}
          onWahl={wert => setzen({ zustand: wert })}
        />
      </div>

      {/* Alles Weitere klappt erst mit der ersten Wahl auf. Vorher ist der Kasten kurz
          und sieht nach nichts aus — was er auch sein soll. */}
      {entwurf.zustand !== null && (
        <div className="beitrag-neu mt-5 space-y-5">
          <AnspannungsRegler
            katalog={katalog.anspannung}
            wert={entwurf.anspannung}
            onWahl={wert => setzen({ anspannung: wert })}
          />

          {/* Nur bei guten Zuständen — und das ist der ganze Trick am Notfallplan: Was
              hilft, weiß man, wenn es einem gut geht. Im Ernstfall fällt einem nichts
              ein. Diese Zeile wächst auf der Krisenplan-Seite zum Vorschlag. */}
          {gutDrauf && (
            <div className="beitrag-neu">
              <label
                htmlFor="kompass-geholfen"
                className="text-[0.86rem] font-semibold text-navy"
              >
                Was hat dir heute gutgetan?
              </label>
              <p className="mt-0.5 text-[0.76rem] text-brand-muted">
                Später schlägt dein Notfallplan genau das vor.
              </p>
              <input
                id="kompass-geholfen"
                type="text"
                value={entwurf.geholfen}
                onChange={e => setzen({ geholfen: e.target.value })}
                maxLength={500}
                placeholder="Raus an die Luft. Mit K. telefoniert."
                className="input mt-2"
              />
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setMehr(m => !m)}
              aria-expanded={mehr}
              className="flex items-center gap-1.5 text-[0.82rem] font-medium text-brand-muted transition-colors hover:text-navy"
            >
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${mehr ? 'rotate-90' : ''}`}
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              {mehr ? 'Weniger' : 'Wörter, eine Notiz, ein Fall'}
            </button>

            {mehr && (
              <div className="beitrag-neu mt-3 space-y-4 rounded-brand border border-brand-border bg-brand-bg/60 p-4">
                <div>
                  <p className="section-label">Wenn du es benennen müsstest</p>
                  <div className="mt-2">
                    <Wortwahl
                      familien={katalog.wortfamilien}
                      gewaehlt={entwurf.worte}
                      onWahl={worte => setzen({ worte })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="kompass-notiz" className="section-label">
                    Ein Satz dazu
                  </label>
                  <textarea
                    id="kompass-notiz"
                    value={entwurf.notiz}
                    onChange={e => setzen({ notiz: e.target.value })}
                    maxLength={2000}
                    rows={2}
                    placeholder="Muss nichts Ganzes sein."
                    className="input mt-2 resize-y"
                  />
                </div>

                {faelle.length > 0 && (
                  <div>
                    <label htmlFor="kompass-fall" className="section-label">
                      Hatte das mit jemandem zu tun?
                    </label>
                    <select
                      id="kompass-fall"
                      value={entwurf.caseId}
                      onChange={e => setzen({ caseId: e.target.value })}
                      className="input mt-2"
                    >
                      <option value="">Mit niemandem Bestimmten</option>
                      {faelle.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.person_name || 'Ohne Namen'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={speichern}
              disabled={laeuft}
              className="btn-primary w-full !py-3 disabled:opacity-60"
              style={
                gewaehlterZustand
                  ? {
                      backgroundColor: ton(gewaehlterZustand.wert).hex,
                      boxShadow: `0 6px 18px ${ton(gewaehlterZustand.wert).hex}45`,
                    }
                  : undefined
              }
            >
              {laeuft ? 'Wird festgehalten …' : 'Festhalten'}
            </button>
            <Fehlermeldung error={fehler} />
          </div>
        </div>
      )}
    </div>
  )
}
