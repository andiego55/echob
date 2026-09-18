/**
 * Der Hinweis zur Schweigepflicht — vor dem ersten KI-Aufruf mit einem Fall.
 *
 * **Was hier passiert.** Solange die Fachperson den Hinweis nicht bestätigt hat, steht er
 * an der Stelle, an der sie gerade etwas auslösen wollte: im Echo-Fenster statt des
 * Eingabefelds, über dem Knopf, der einen Bericht erzeugt. Danach bleibt eine Zeile
 * stehen, die das Wichtigste in einem Satz sagt und den vollen Text auf Klick zeigt.
 *
 * **Warum dort und nicht als Banner oben.** Ein Banner erklärt etwas, das gerade nicht
 * geschieht; man liest ihn zweimal und danach nie wieder. Dieser Hinweis erscheint in dem
 * Moment, in dem die Frage tatsächlich ansteht — und nur dieses eine Mal.
 *
 * **Warum das Tor nicht der eigentliche Schutz ist.** Das ist es nie: Der Server prüft
 * dieselbe Bestätigung (``require_schweigepflicht_hinweis``), und ein Aufruf ohne sie endet mit 403.
 * Diese Komponente erklärt den Zustand, sie erzeugt ihn nicht.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { professionalApi } from '@/api/professional'
import Fehlermeldung from '@/components/Fehlermeldung'
import InfoPopover from '@/components/InfoPopover'
import { useProfessional } from '@/components/auth/ProfessionalRoute'
import { SCHWEIGEPFLICHT_FASSUNG, schweigepflichtHinweis } from '@/lib/schweigepflicht'
import type { Hinweis } from '@/lib/schweigepflicht'

/** Der Text selbst — geteilt von Tor, Zeile und Einstellungen. */
export function SchweigepflichtText({ hinweis, kompakt = false }: { hinweis: Hinweis; kompakt?: boolean }) {
  return (
    <div className={kompakt ? 'space-y-3 text-[0.82rem]' : 'space-y-4 text-sm'}>
      <p className="leading-relaxed text-brand-text">{hinweis.einstieg}</p>
      {hinweis.zurGruppe && (
        <p className="rounded-brand-sm bg-brand-bg px-3 py-2 leading-relaxed text-brand-muted">
          {hinweis.zurGruppe}
        </p>
      )}
      {hinweis.abschnitte.map(a => (
        <div key={a.ueberschrift}>
          <p className="font-semibold text-navy">{a.ueberschrift}</p>
          <p className="mt-0.5 leading-relaxed text-brand-muted">{a.text}</p>
        </div>
      ))}
      <div>
        <p className="font-semibold text-navy">Was das praktisch heißt</p>
        <ul className="mt-1 space-y-1.5">
          {hinweis.regeln.map(r => (
            <li key={r} className="flex gap-2 leading-relaxed text-brand-muted">
              <span aria-hidden className="mt-[0.45em] h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="leading-relaxed text-brand-muted">{hinweis.schluss}</p>
    </div>
  )
}

/**
 * Das Tor: zeigt den Hinweis, bis er bestätigt ist — danach die Kinder.
 *
 * Steht der Status noch nicht fest (erster Ladevorgang, altes API-Feld fehlt), werden die
 * Kinder gezeigt. Nichts anderes wäre ehrlich: Wir wissen dann nicht, dass etwas fehlt,
 * und der Server hält die Grenze ohnehin.
 */
export default function SchweigepflichtTor({ children }: { children: React.ReactNode }) {
  const { data } = useProfessional()
  const qc = useQueryClient()
  const [gelesen, setGelesen] = useState(false)
  const bestaetigen = useMutation({
    mutationFn: () => professionalApi.acceptAgreement(SCHWEIGEPFLICHT_FASSUNG, 'schweigepflicht'),
    onSuccess: profil => {
      qc.setQueryData(['professional-me'], profil)
      qc.invalidateQueries({ queryKey: ['professional-me'] })
    },
  })

  if (data?.schweigepflicht_accepted !== false) return <>{children}</>

  const hinweis = schweigepflichtHinweis(data.unterliegt_203)
  // Die angezeigte und die protokollierte Fassung muessen zusammengehoeren - sonst
  // bezeugt der Nachweis die Kenntnisnahme eines Textes, den niemand gesehen hat.
  const fassungenPassenNicht =
    !!data.schweigepflicht_current_version && data.schweigepflicht_current_version !== SCHWEIGEPFLICHT_FASSUNG

  return (
    <div className="rounded-brand-lg border border-amber-300 bg-amber-50/60 px-5 py-4">
      <h3 className="text-sm font-semibold text-navy">{hinweis.titel}</h3>
      <div className="mt-3">
        <SchweigepflichtText hinweis={hinweis} />
      </div>

      {fassungenPassenNicht ? (
        <p className="mt-4 rounded-brand-sm bg-white px-4 py-3 text-sm leading-relaxed text-amber-900">
          Der hier angezeigte Text und die Fassung, die unser Server festhalten würde,
          gehören gerade nicht zusammen ({SCHWEIGEPFLICHT_FASSUNG} gegenüber{' '}
          {data.schweigepflicht_current_version}). Das legt sich mit dem nächsten Server-Update
          von selbst — bitte in Kürze erneut versuchen.
        </p>
      ) : (
        <>
          <label className="mt-4 flex cursor-pointer gap-3 text-sm leading-relaxed text-brand-text">
            <input
              type="checkbox" checked={gelesen} onChange={e => setGelesen(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent"
            />
            <span>{hinweis.bestaetigung}</span>
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => bestaetigen.mutate()}
              disabled={!gelesen || bestaetigen.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {bestaetigen.isPending ? 'Wird gespeichert …' : 'Gelesen — weiter'}
            </button>
            <span className="text-[0.78rem] text-brand-muted">
              Einmal für alle Fälle. Sie sehen ihn wieder, wenn sich der Text ändert.
            </span>
          </div>
        </>
      )}
      {bestaetigen.isError && (
        <div className="mt-3"><Fehlermeldung error={bestaetigen.error} /></div>
      )}
    </div>
  )
}

/**
 * Die Zeile, die bleibt: ein Satz und der volle Text auf Klick.
 *
 * Erscheint erst nach der Bestätigung — vorher steht der ganze Hinweis ohnehin da, und
 * zwei Fassungen desselben Texts übereinander liest niemand.
 */
export function SchweigepflichtZeile({ notizenErlaubt }: {
  /**
   * Stand der Freigabe: Hat die Klient:in der Mitverarbeitung eigener Aufzeichnungen
   * zugestimmt? ``undefined`` = unbekannt (Bündel noch nicht geladen) — dann steht der
   * allgemeine Satz, keine Behauptung in die eine oder andere Richtung.
   */
  notizenErlaubt?: boolean
} = {}) {
  const { data } = useProfessional()
  if (data?.schweigepflicht_accepted !== true) return null
  const hinweis = schweigepflichtHinweis(data.unterliegt_203)
  return (
    <p className="flex items-center gap-1.5 text-[0.75rem] text-brand-muted">
      <span>
        {notizenErlaubt === false
          ? 'Ihre Notizen bleiben außen vor — dafür fehlt die Einwilligung der Klient:in.'
          : 'Mit dem Fall gehen auch Ihre Notizen an die KI.'}
      </span>
      <InfoPopover label="Hinweis zur Schweigepflicht" title={hinweis.titel}>
        <SchweigepflichtText hinweis={hinweis} kompakt />
        {notizenErlaubt === false && (
          <p className="mt-3 border-t border-brand-border pt-3 text-[0.8rem] leading-relaxed text-brand-muted">
            Für diesen Fall hat die Klient:in der Mitverarbeitung Ihrer eigenen
            Aufzeichnungen nicht zugestimmt. Arbeitsmappe, Sitzungsnotizen, Erkenntnisse und
            gespeicherte Zusammenfassungen bleiben deshalb aus Echo und Berichten heraus.
            Ändern kann das nur sie — beim Bearbeiten der Freigabe steht dort ein
            freiwilliges Kästchen.
          </p>
        )}
      </InfoPopover>
    </p>
  )
}
