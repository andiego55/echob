import { createPortal } from 'react-dom'
import { AVATARS, avatarBg } from '@/utils/avatars'

/** Modal zur Avatar-Auswahl (50 Tiere). Per Portal an document.body (kein Clipping in Karten). */
export default function AvatarPicker({
  value, onSelect, onClose, title = 'Avatar wählen',
}: {
  value?: string | null
  onSelect: (v: string) => void
  onClose: () => void
  title?: string
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[440px] rounded-brand-lg bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-navy">{title}</h3>
          <button onClick={onClose} aria-label="Schließen" className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-bg hover:text-navy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="grid max-h-[52vh] grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => { onSelect(a); onClose() }}
              className={`grid aspect-square place-items-center rounded-full text-xl transition-transform hover:scale-110 ${
                value === a ? `ring-2 ring-accent ${avatarBg(a)}` : 'hover:bg-brand-bg'
              }`}
              aria-label={`Avatar ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
