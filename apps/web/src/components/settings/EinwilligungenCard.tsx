/**
 * Deine Einwilligungen — erteilen und widerrufen, ohne das Konto zu löschen.
 *
 * **Warum es diesen Baustein gibt.** Art. 7 Abs. 3 S. 4 DSGVO: Der Widerruf muss so
 * einfach sein wie die Erteilung. Erteilt wurde mit einem Häkchen im
 * Einwilligungs-Dialog; widerrufen ging bis zum 04.10.2026 nur über die Löschung des
 * gesamten Kontos. Die veröffentlichte Erklärung versprach derweil, man könne jede
 * Einwilligung jederzeit widerrufen.
 *
 * **Kein Bestätigungsdialog, kein Rückhalteangebot.** Beides wäre genau die Asymmetrie,
 * die die Norm verbietet: ein Klick zum Erteilen, drei Hürden zum Widerrufen. Was
 * stattdessen dasteht, ist die **Folge** — ehrlich und vorher, damit niemand überrascht
 * ist: Die KI-Funktionen hören auf zu arbeiten. Rückgängig machen kann man es selbst, und
 * das steht auch dabei.
 *
 * **Was der Widerruf nicht tut, steht ebenfalls dabei:** Er löscht nichts. Die Inhalte
 * beruhen auf einer anderen Einwilligung und bleiben, bis die Person Fall oder Konto
 * löscht. Wer das nicht liest, könnte den Widerruf für eine Löschung halten — und sich
 * später zu Recht täuschen lassen fühlen.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { einwilligungenApi } from '@/api/account'
import { apiErrorMessage } from '@/api/errors'

export default function EinwilligungenCard() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['einwilligungen'],
    queryFn: einwilligungenApi.stand,
  })

  const umschalten = useMutation({
    mutationFn: (widerrufen: boolean) =>
      widerrufen
        ? einwilligungenApi.widerrufen('ki_verarbeitung')
        : einwilligungenApi.erteilen('ki_verarbeitung'),
    onSuccess: () => {
      // Auch die Kontingent-Anzeige neu holen: Nach einem Widerruf ist sie gegenstandslos.
      void qc.invalidateQueries({ queryKey: ['einwilligungen'] })
      void qc.invalidateQueries({ queryKey: ['ai-usage'] })
    },
  })

  const widerrufen = data?.ki_verarbeitung_widerrufen ?? false

  return (
    <section className="card">
      <h2 className="text-base font-semibold text-navy">Deine Einwilligungen</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Du kannst sie jederzeit mit Wirkung für die Zukunft widerrufen — und genauso
        jederzeit wieder erteilen.
      </p>

      <div className="mt-5 rounded-brand border border-brand-border bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-navy">
              KI-Verarbeitung, einschließlich Übermittlung in die USA
            </p>
            <p className="mt-1 text-xs leading-relaxed text-brand-muted">
              Dafür gehen die jeweils nötigen Inhalte an unseren KI-Anbieter. Ohne diese
              Einwilligung stehen Echo-Dialog, Zusammenfassungen, Skalen, Berichte, Podcast
              und Bildwerkstatt nicht zur Verfügung.
            </p>
            {widerrufen && data?.ki_verarbeitung_widerrufen_am && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Widerrufen am{' '}
                {new Date(data.ki_verarbeitung_widerrufen_am).toLocaleDateString('de-DE')}.
                Deine gespeicherten Inhalte sind davon unberührt — sie bleiben, bis du
                einen Fall oder dein Konto löschst.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => umschalten.mutate(!widerrufen)}
            disabled={isLoading || umschalten.isPending}
            className={
              widerrufen
                ? 'shrink-0 rounded-brand bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-60'
                : 'shrink-0 rounded-brand border border-brand-border px-4 py-2 text-sm font-medium text-navy transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-60'
            }
          >
            {umschalten.isPending
              ? 'Einen Moment …'
              : widerrufen
                ? 'Wieder erteilen'
                : 'Widerrufen'}
          </button>
        </div>
      </div>

      {umschalten.isError && (
        <p className="mt-3 rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {apiErrorMessage(umschalten.error, 'Das hat gerade nicht geklappt.')}
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-brand-muted">
        Die Einwilligung in die Speicherung deiner Inhalte lässt sich nicht einzeln
        widerrufen — ohne sie gäbe es nichts, worauf EchoB arbeiten könnte. Dafür ist das
        Löschen von Fall oder Konto der richtige Weg; beides findest du weiter unten.
      </p>
    </section>
  )
}
