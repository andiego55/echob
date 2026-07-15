/**
 * ChatComposer – einheitliches Chat-Eingabefeld im ChatGPT-Stil.
 * Auto-wachsende Textarea, runder Container, Icon-Send-Button.
 * Enter sendet, Shift+Enter macht eine neue Zeile.
 */
import { useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  pending?: boolean
  disabled?: boolean
  placeholder?: string
  hint?: string
  leftAccessory?: React.ReactNode
  autoFocus?: boolean
}

export default function ChatComposer({
  value, onChange, onSend,
  pending = false, disabled = false,
  placeholder = 'Schreib Echo eine Nachricht …',
  hint = 'Beschreibe andere Personen mit einer Rolle (z. B. „Partner", „Mutter") statt mit echtem Namen.',
  leftAccessory, autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-Grow bis 200px, danach scrollt die Textarea intern
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const canSend = value.trim().length > 0 && !pending && !disabled

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (canSend) onSend()
  }

  return (
    <div className="mx-auto max-w-[780px]">
      <form
        onSubmit={submit}
        className="flex items-end gap-2 rounded-[26px] border border-brand-border bg-white px-3 py-2
                   shadow-[0_2px_16px_rgba(15,30,46,0.07)] transition-all duration-150
                   focus-within:border-accent/50 focus-within:shadow-[0_4px_24px_rgba(15,30,46,0.10)]"
      >
        {leftAccessory && <div className="flex-shrink-0 pb-0.5">{leftAccessory}</div>}

        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
          }}
          rows={1}
          autoFocus={autoFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 max-h-[200px] resize-none bg-transparent px-2 py-[7px]
                     text-[0.92rem] leading-relaxed text-brand-text placeholder-brand-muted/50
                     outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!canSend}
          title="Senden (Enter)"
          aria-label="Nachricht senden"
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 ${
            canSend
              ? 'bg-accent text-white hover:bg-accent-hover shadow-[0_2px_10px_rgba(224,123,84,0.4)]'
              : 'bg-navy/[0.05] text-brand-muted/40 cursor-not-allowed'
          }`}
        >
          {pending ? (
            <span className="w-4 h-4 rounded-full border-2 border-brand-muted/25 border-t-brand-muted/70 animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </form>

      {hint && (
        <p className="mt-2 text-center text-[11px] text-brand-muted/60">{hint}</p>
      )}
    </div>
  )
}
