/**
 * Die freigegebenen Podcast-Folgen — für die Fachperson.
 *
 * **Warum eine Folge etwas anderes ist als ein Bericht.** Ein Bericht ist auf Weitergabe hin
 * geschrieben. Eine Folge hat die Person für SICH machen lassen: in der Reihenfolge, in der
 * sie es hören wollte, in der Länge, die sie ausgehalten hat, mit den Reglern, die sie
 * gesetzt hat. Was jemand in den Mittelpunkt gestellt und was er abgewählt hat, ist selbst
 * eine Aussage — deshalb stehen die Einstellungen sichtbar dabei und nicht im Kleingedruckten.
 *
 * **Ohne Tonspur, und das steht auch da.** Wer „Podcast" liest, erwartet etwas zu hören. Die
 * Karte sagt in einem Satz, dass hier der Text steht und warum das kein Vorenthalten ist.
 *
 * **Zugeklappt.** Ein Skript kann zweitausendachthundert Wörter haben; aufgeklappt schiebt
 * eine Folge alles andere aus dem Bild. Die Überschriften bleiben sichtbar — sie sind die
 * Auskunft darüber, worum es geht.
 */
import type { SharedCaseBundle } from '@/types'

export default function PodcastKarte({ folgen }: { folgen: SharedCaseBundle['podcasts'] }) {
  if (!folgen?.length) return null

  return (
    <section className="rounded-brand-lg border border-brand-border bg-white p-5">
      <h3 className="flex items-center gap-2 text-[0.95rem] font-bold text-navy">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent/70" />
        Podcast-Folgen
        <span className="text-[0.72rem] font-normal tabular-nums text-brand-muted">
          {folgen.length}
        </span>
      </h3>
      <p className="mt-1.5 max-w-[68ch] text-[0.82rem] leading-relaxed text-brand-muted">
        Was die Person sich aus ihrem Fall hat erzählen lassen — hier als Text. Die
        Tonaufnahmen gehen nicht mit: Der gesprochene Wortlaut IST dieser Text, und gelesen
        geht es schneller. Wie die Folge gebaut wurde, steht jeweils dabei.
      </p>

      <div className="mt-4 space-y-2">
        {folgen.map(f => (
          <details
            key={f.id}
            className="group rounded-brand border border-brand-border bg-brand-bg px-4 py-3 transition-colors open:border-accent/30 open:bg-white"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 text-[0.88rem] font-semibold leading-snug text-navy">
                {f.titel || f.format_label}
              </span>
              <span className="shrink-0 text-[0.72rem] text-brand-muted">
                {f.format_label}
                {f.sekunden ? ` · ${Math.round(f.sekunden / 60)} Min` : ' · nur Text'}
              </span>
            </summary>

            {/* Die Regler. Ein Element auf „gar nicht“ ist keine Lücke, sondern eine
                Entscheidung — und ohne diese Zeile liest sich die fehlende Stelle wie ein
                Versehen der Anwendung. */}
            {f.gewichte_lesbar?.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-1.5">
                {f.gewichte_lesbar.map(g => (
                  <span
                    key={g.label}
                    className={`rounded-full px-2 py-0.5 text-[0.68rem] ${
                      g.stufe === 'gar nicht'
                        ? 'bg-brand-border/60 text-brand-muted line-through'
                        : g.stufe === 'im Mittelpunkt'
                          ? 'bg-accent/15 text-accent'
                          : 'bg-white text-brand-muted'
                    }`}
                  >
                    {g.label}
                    {g.stufe !== 'normal' && `: ${g.stufe}`}
                  </span>
                ))}
              </p>
            )}

            <div className="mt-4 space-y-4 border-t border-brand-border pt-4">
              {f.kapitel?.map(k => (
                <article key={k.nr}>
                  <h4 className="flex items-baseline gap-2 text-[0.86rem] font-bold text-navy">
                    <span className="text-[0.72rem] tabular-nums text-brand-muted">{k.nr}</span>
                    {k.titel}
                  </h4>
                  <p className="mt-1 whitespace-pre-wrap text-[0.88rem] leading-[1.7] text-brand-text">
                    {k.text}
                  </p>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
