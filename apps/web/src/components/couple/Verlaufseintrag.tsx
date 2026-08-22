/**
 * Ein Eintrag in einer Reihe gleichartiger Echo-Texte.
 *
 * **Das Muster dahinter.** Mediation, Sitzungs-Zusammenfassung, Test-Vergleich und
 * Rückblick funktionieren alle gleich: Ein Knopf lässt Echo einen Text erarbeiten, und
 * jeder weitere Klick legt einen NEUEN an, statt den alten zu ersetzen. Das ist richtig
 * so — man will nachlesen können, was beim letzten Mal herauskam, und ein Vorschlag, der
 * beim Neuerarbeiten verschwindet, wäre ein Verlust.
 *
 * **Warum sie trotzdem zuklappen.** Ausgeklappt stapeln sich fast gleiche Texte von je
 * mehreren Bildschirmhöhen, und der älteste sieht so wichtig aus wie der neueste. Wer die
 * Seite öffnet, scrollt an drei Vorschlägen vorbei, um zu dem zu kommen, der gilt. Der
 * neueste ist der, der zählt; die älteren sind Beleg, nicht Inhalt.
 *
 * Also: der neueste offen und als „aktuell" gekennzeichnet, die älteren als Zeile mit
 * Datum — einen Klick entfernt, nichts gelöscht.
 *
 * `RetrospectCard` machte das schon so, bevor es diese Datei gab. Hier steht es einmal
 * für alle vier, damit sie sich gleich anfühlen.
 */
import type { ReactNode } from 'react'

export default function Verlaufseintrag({
  titel, aktuell = false, children,
}: {
  /** Was in der zugeklappten Zeile steht – meist Datum oder Zeitraum. */
  titel: string
  /**
   * Der neueste Eintrag. Er ist offen und trägt einen Hinweis – sonst wüsste man beim
   * Lesen nicht, ob man gerade den gültigen Text vor sich hat oder einen alten.
   */
  aktuell?: boolean
  children: ReactNode
}) {
  return (
    <details
      open={aktuell}
      className="group rounded-brand border border-brand-border px-4 py-3 open:bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-semibold text-navy">{titel}</span>
          {aktuell && (
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[0.65rem] font-medium text-accent">
              aktuell
            </span>
          )}
        </span>
        {/* Ohne sichtbaren Pfeil sieht eine zugeklappte Zeile aus wie ein Eintrag ohne
            Inhalt – man klickt gar nicht erst. */}
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}
