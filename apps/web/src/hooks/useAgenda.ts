/**
 * Die Tagesordnung — Markierungen lesen und umschalten.
 *
 * **Warum ein eigener Haken und nicht dreimal dasselbe.** Der Knopf „Besprechen" steht an
 * Sätzen, an Momenten und am Porträt. Ohne diese Stelle stünde in drei Dateien dieselbe
 * Abfrage, dieselben zwei Mutationen und dieselbe Frage „welcher Eintrag gehört zu diesem
 * Stück" — und beim vierten Ding ein viertes Mal.
 *
 * **Eine Abfrage für alle Karten.** Ob ein Stück drauf ist, kommt aus einer einzigen
 * Antwort des Servers; sie enthält nur Kennungen und keinen Text. Eine Abfrage je Karte
 * wären bei vierzig Sätzen vierzig — und jede davon entschlüsselte etwas.
 *
 * **Das Wegnehmen braucht die Kennung des EINTRAGS, nicht die des Stücks.** Die steht nur
 * in der Liste. Deshalb holt dieser Haken sie beim Wegnehmen nach: einmal, und nur dann.
 * Die Alternative wäre, die ganze Liste dauernd mitzuladen — mit allen Texten darin.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { kompassApi, type AgendaArt } from '@/api/kompass'

export function useAgenda() {
  const qc = useQueryClient()

  const { data: markierungen } = useQuery({
    queryKey: ['kompass-agenda-markierungen'],
    queryFn: kompassApi.agendaMarkierungen,
    // Scheitert es, fehlt die Markierung an den Karten — die Seite bleibt vollständig.
    retry: false,
  })

  const frisch = () => {
    qc.invalidateQueries({ queryKey: ['kompass-agenda-markierungen'] })
    qc.invalidateQueries({ queryKey: ['kompass-agenda'] })
    qc.invalidateQueries({ queryKey: ['kompass'] })
  }

  const umschalten = useMutation({
    mutationFn: async ({ art, zielId, drauf }:
      { art: AgendaArt; zielId: string; drauf: boolean }) => {
      if (drauf) {
        await kompassApi.agendaDazu(art, zielId)
        return
      }
      // Die Kennung des Eintrags steht nur in der Liste. Sie erst hier zu holen ist
      // eine Abfrage beim Wegnehmen statt einer dauernd mitlaufenden mit allen Texten.
      const liste = await kompassApi.agenda()
      const eintrag = liste.find(p => p.art === art && p.ziel_id === zielId)
      if (eintrag) await kompassApi.agendaWeg(eintrag.id)
    },
    onSuccess: frisch,
  })

  return {
    /** Ob dieses Stück auf der Liste steht. */
    istDrauf: (art: AgendaArt, zielId: string) =>
      (markierungen?.[art] ?? []).includes(zielId),
    umschalten: (art: AgendaArt, zielId: string, drauf: boolean) =>
      umschalten.mutateAsync({ art, zielId, drauf }),
    fehler: umschalten.error,
  }
}
