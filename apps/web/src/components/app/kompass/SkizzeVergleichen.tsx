/**
 * „Diese Skizze neben einen Fall legen" — der Weg von einem Wunsch zu einem Vergleich.
 *
 * **Eine eigene Komponente, weil sie eine eigene Entscheidung ist.** Die Skizze zu bauen
 * kostet nichts und lässt sich jederzeit wegwerfen. Sie neben einen Fall zu legen kostet
 * einen Bericht aus dem Monatskontingent, dauert eine Minute und erzeugt einen Text, in dem
 * steht, woran es fehlt. Das gehört nicht zwischen zwei Eingabefelder, sondern hinter einen
 * eigenen Absatz mit einem eigenen Ton.
 *
 * **Nur Fälle derselben Art.** Ein Partnerschafts-Wunsch an einen Elternfall gehalten
 * erzeugt Unsinn, der sich wie eine Aussage über ein Leben liest. Die Liste zeigt deshalb
 * gar nichts anderes an — und der Server verweigert es zusätzlich (``require_vergleichbar``).
 * Zwei Schlösser an derselben Tür, weil hinter ihr ein Text über einen Menschen entsteht.
 *
 * **Und die zweite Prüfung ist nicht doppelt.** Was diese Seite selbst NICHT wissen kann,
 * ist, ob die Skizze dem Server als ausreichend gilt. Deshalb fragt sie für den gewählten
 * Fall nach (``/vergleichbar``) und zeigt den Grund an, statt einen Knopf anzubieten, der
 * beim Drücken erklärt, warum er nicht geht.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import Fehlermeldung from '@/components/Fehlermeldung'
import { casesApi } from '@/api/cases'
import { idealApi } from '@/api/kompassIdeal'

export default function SkizzeVergleichen({ art, artLabel, leer }: {
  art: string
  artLabel: string
  /** Solange die Skizze leer ist, gibt es nichts zu vergleichen. */
  leer: boolean
}) {
  const navigate = useNavigate()
  const [gewaehlt, setGewaehlt] = useState<string>('')

  const faelle = useQuery({
    queryKey: ['cases'],
    queryFn: casesApi.list,
    staleTime: 60_000,
    enabled: !leer,
  })

  const passend = (faelle.data?.cases ?? []).filter(
    f => !f.archived_at && f.relationship_type === art,
  )

  const pruefung = useQuery({
    queryKey: ['ideal-vergleichbar', art, gewaehlt],
    queryFn: () => idealApi.vergleichbar(art, gewaehlt),
    enabled: !!gewaehlt,
  })

  const vergleichen = useMutation({
    mutationFn: () => idealApi.vergleich(art, gewaehlt),
    onSuccess: bericht =>
      navigate(`/app/cases/${bericht.case_id}/reports/${bericht.id}`),
  })

  if (leer) return null

  return (
    <section className="mt-5 rounded-brand-lg border border-brand-border bg-white p-6">
      <h2 className="text-[1.05rem] font-bold text-navy">Neben einen Fall legen</h2>
      <p className="mt-1 max-w-[62ch] text-[0.86rem] leading-relaxed text-brand-muted">
        Echo liest deine Skizze und einen deiner Fälle und schreibt, wo beides zusammengeht
        und wo ein Abstand ist. Das Ergebnis liegt danach als Bericht am Fall — du kannst ihn
        behalten, löschen oder deiner Fachperson freigeben.
      </p>

      {faelle.isLoading ? (
        <p className="mt-4 text-sm text-brand-muted">Deine Fälle werden geladen …</p>
      ) : passend.length === 0 ? (
        // Kein Fehler, sondern eine Auskunft: Die Skizze ist deshalb nicht umsonst.
        <p className="mt-4 max-w-[62ch] text-[0.86rem] leading-relaxed text-brand-muted">
          Du hast gerade keinen Fall, der eine {artLabel} ist. Vergleichen lässt sich nur,
          was von derselben Art ist — sonst entsteht ein Text, der zu keiner der beiden
          Beziehungen passt. Die Skizze bleibt, bis es einen gibt.
        </p>
      ) : (
        <>
          <label className="label mt-5 block" htmlFor="ideal-fall">
            Mit welchem Fall?
          </label>
          <select
            id="ideal-fall"
            value={gewaehlt}
            onChange={e => setGewaehlt(e.target.value)}
            className="input mt-1.5 w-full !text-sm"
          >
            <option value="">Bitte wählen …</option>
            {passend.map(f => (
              <option key={f.id} value={f.id}>
                {f.person_name || 'Ohne Namen'}
                {f.scene_count > 0 && ` · ${f.scene_count} ${f.scene_count === 1 ? 'Szene' : 'Szenen'}`}
              </option>
            ))}
          </select>

          {pruefung.data && !pruefung.data.moeglich && (
            <p role="alert" className="mt-3 text-sm leading-snug text-red-600">
              {pruefung.data.grund}
            </p>
          )}

          <button
            type="button"
            onClick={() => vergleichen.mutate()}
            disabled={
              !gewaehlt
              || vergleichen.isPending
              || pruefung.isLoading
              || pruefung.data?.moeglich === false
            }
            className="btn-primary mt-4 !py-2.5 !px-5 !text-sm"
          >
            {vergleichen.isPending ? 'Echo liest und schreibt …' : 'Vergleich erzeugen'}
          </button>

          {/* Die Wartezeit ansagen, bevor sie eintritt. Eine Minute Stille an einem Knopf
              sieht aus wie ein Fehler, und wer zweimal drückt, zahlt zweimal. */}
          {vergleichen.isPending && (
            <p className="mt-2 text-[0.78rem] text-brand-muted">
              Das dauert bis zu einer Minute. Lass die Seite offen.
            </p>
          )}

          <Fehlermeldung error={vergleichen.error} className="mt-3" />

          <p className="mt-4 text-[0.75rem] leading-relaxed text-brand-muted/80">
            Der Vergleich zählt gegen dein Monatskontingent für Berichte — er kostet dasselbe
            und ist einer.
          </p>
        </>
      )}
    </section>
  )
}
