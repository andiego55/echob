/**
 * HypothesisSummary – einklappbare Darstellung einer gespeicherten Arbeitshypothese.
 * Standardmaessig eingeklappt (kompakte Uebersicht); per Klick auf den Kopf ausklappbar.
 */
import { useState } from 'react'
import MarkdownMessage from '@/components/app/MarkdownMessage'

export default function HypothesisSummary(
  { summaryText, onDelete, deleting }: { summaryText: string; onDelete: () => void; deleting: boolean },
) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 rounded-brand border border-brand-border bg-brand-bg px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted transition-colors hover:text-navy"
        >
          <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Gespeicherte Hypothese
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="text-xs text-brand-muted transition-colors hover:text-red-600 disabled:opacity-40"
        >
          Löschen
        </button>
      </div>
      {open && (
        <div className="mt-2 text-sm leading-relaxed text-brand-text">
          <MarkdownMessage content={summaryText} />
        </div>
      )}
    </div>
  )
}
