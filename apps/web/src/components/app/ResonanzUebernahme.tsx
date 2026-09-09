/**
 * „Du hast sieben Szenen markiert, bevor du ein Konto hattest."
 *
 * **Warum das gefragt wird und nicht einfach passiert.** Was jemand ohne Konto getippt hat,
 * liegt in seinem Browser — nirgendwo sonst. Es beim ersten Login stillschweigend in die
 * Akte zu schreiben wäre bequem und falsch: Es ist Material über eine Beziehung, und der
 * Mensch hat es zu einem Zeitpunkt hinterlassen, an dem es nirgendwohin gehen sollte.
 * Zwei Knöpfe kosten eine Sekunde und machen aus einem Vorgang eine Entscheidung.
 *
 * **Warum es überhaupt angeboten wird.** Der umgekehrte Fehler wäre schlimmer: Wer nachts
 * zwölf Szenen markiert, sich am Morgen anmeldet und dann vor einem leeren Fall steht, hat
 * seine Arbeit verloren, ohne zu erfahren, dass es sie je gab.
 */
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { anonymLesen, anonymVergessen } from '@/lib/resonanz'
import { resonanzApi } from '@/api/resonanz'

export default function ResonanzUebernahme({ caseId }: { caseId?: string }) {
  // Einmal beim ersten Rendern lesen. Ein `useEffect` wäre hier falsch herum: Der Speicher
  // ändert sich während dieser Ansicht nicht, und ein zweiter Durchlauf würde die Liste
  // mitten in der Übernahme unter den Händen wegziehen.
  const [offen] = useState(() => Object.entries(anonymLesen()))
  const [erledigt, setErledigt] = useState<number | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [weg, setWeg] = useState(false)
  const qc = useQueryClient()

  if (offen.length === 0 || weg) return null

  async function uebernehmen() {
    setLaeuft(true)
    setFehler(null)
    let gezaehlt = 0
    try {
      // Nacheinander, nicht alle auf einmal: Zwölf gleichzeitige Anfragen laufen in die
      // Drosselung, und die Reihenfolge ist ohnehin gleichgültig.
      for (const [slug, reaktion] of offen) {
        await resonanzApi.setzen(slug, {
          reaction: reaktion,
          case_id: caseId ?? null,
          // Diese Reaktion wurde beim Tippen schon anonym gezählt. Ohne das Kennzeichen
          // zählte dieselbe Geste ein zweites Mal — und die öffentliche Zahl wäre genau um
          // die Menschen zu hoch, die sich danach angemeldet haben.
          schon_gezaehlt: true,
        })
        gezaehlt += 1
      }
      anonymVergessen()
      setErledigt(gezaehlt)
      qc.invalidateQueries({ queryKey: ['resonanz-ueberblick'] })
    } catch {
      // Was durchging, bleibt: Der Speicher wird nur bei vollem Erfolg geleert, und ein
      // zweiter Versuch schreibt dieselben Zeilen einfach noch einmal.
      setFehler(
        gezaehlt > 0
          ? `${gezaehlt} übernommen, dann ging etwas schief. Versuch es gleich noch einmal.`
          : 'Das hat gerade nicht geklappt. Versuch es gleich noch einmal.',
      )
    } finally {
      setLaeuft(false)
    }
  }

  function verwerfen() {
    anonymVergessen()
    setWeg(true)
  }

  if (erledigt !== null) {
    return (
      <div className="mb-4 rounded-brand bg-green-50 px-5 py-3 text-[0.86rem] text-green-900">
        {erledigt === 1 ? 'Eine Markierung übernommen.' : `${erledigt} Markierungen übernommen.`}
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-brand border border-accent/25 bg-accent/[0.05] px-5 py-4">
      <p className="text-[0.9rem] font-semibold text-navy">
        {offen.length === 1
          ? 'Du hast eine Szene markiert, bevor du ein Konto hattest.'
          : `Du hast ${offen.length} Szenen markiert, bevor du ein Konto hattest.`}
      </p>
      <p className="mt-1.5 text-[0.84rem] leading-relaxed text-brand-muted">
        Das liegt bisher nur in diesem Browser. Sollen wir es zu deinem Fall nehmen? Dann
        kannst du dazuschreiben, wie es bei dir war — und Echo kann damit arbeiten.
      </p>
      {fehler && <p className="mt-2 text-[0.84rem] text-red-600">{fehler}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={uebernehmen}
          disabled={laeuft}
          className="btn-primary !px-5 !py-2 !text-[0.86rem] disabled:opacity-50"
        >
          {laeuft ? 'Wird übernommen …' : 'Übernehmen'}
        </button>
        <button
          type="button"
          onClick={verwerfen}
          disabled={laeuft}
          className="text-[0.84rem] text-brand-muted hover:text-navy hover:underline disabled:opacity-50"
        >
          Nein, verwerfen
        </button>
      </div>
    </div>
  )
}
