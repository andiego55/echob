/**
 * Die Kopfleiste über einem geführten Dialog — Titel links, Aktionen rechts.
 *
 * **Warum es sie als Baustein gibt.** Dieselbe Leiste stand dreimal fast gleich da:
 * Themendialog, Hypothesen-Dialog und der Hypothesen-Dialog im Ausbildungsbereich. Alle
 * drei hatten dasselbe Problem — `px-6`, kein Umbruch und `flex-shrink-0` auf den Knöpfen.
 * Auf einem 375 px breiten Schirm bleiben nach dem Innenabstand 327 px; „Zusammenfassung",
 * „Zurücksetzen" und „← Zurück" brauchen zusammen mehr. Der Titel wurde zerquetscht und
 * die Knöpfe schoben sich in die Überschrift.
 *
 * **Was sich ändert.** Unter `sm` rutschen die Aktionen auf eine eigene Zeile und dürfen
 * dort umbrechen; der Titel bekommt die volle Breite und wird abgeschnitten statt gequetscht.
 * Ab `sm` sieht alles aus wie vorher.
 */
import type { ReactNode } from 'react'

export function DialogKopfKnopf({
  onClick, disabled, gefahr, children,
}: {
  onClick: () => void
  disabled?: boolean
  /** Rot statt navy – für Zurücksetzen und Löschen. */
  gefahr?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
        gefahr ? 'text-red-500 hover:bg-red-50' : 'text-navy hover:bg-brand-bg'
      }`}
    >
      {children}
    </button>
  )
}

export default function DialogKopf({
  augenbraue, titel, symbol, onZurueck, zurueckLabel = '← Zurück', children,
}: {
  /** Kleine Überzeile: „Themendialog", „Hypothese" … */
  augenbraue: string
  titel: string
  /** Optionales Zeichen vor dem Titel (Hypothesen-Symbol). */
  symbol?: ReactNode
  onZurueck: () => void
  zurueckLabel?: string
  /** Die Aktionsknöpfe, als `DialogKopfKnopf`. */
  children?: ReactNode
}) {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-brand-border bg-white px-4 py-3 sm:px-6">
      <div className="min-w-0 flex-1">
        <span className="label text-xs">{augenbraue}</span>
        <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-navy">
          {symbol}
          <span className="truncate">{titel}</span>
        </p>
      </div>

      {/* Auf schmalen Schirmen eine eigene Zeile – sonst gibt es keinen Platz,
          der ohne Quetschen auskommt. */}
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        {children}
        <button
          onClick={onZurueck}
          className="ml-auto text-xs text-brand-muted transition-colors hover:text-navy sm:ml-2"
        >
          {zurueckLabel}
        </button>
      </div>
    </div>
  )
}
