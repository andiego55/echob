/**
 * Chat-Nachrichten im ChatGPT-Stil:
 * – Nutzer: Bubble rechts (navy), ohne Avatar
 * – Echo: Avatar links, Text ohne Bubble direkt auf dem Hintergrund
 */
import MarkdownMessage from './MarkdownMessage'

export function EchoAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover text-white
                 flex items-center justify-center text-[13px] font-bold flex-shrink-0
                 shadow-[0_2px_8px_rgba(224,123,84,0.35)] select-none"
      aria-hidden="true"
    >
      E
    </div>
  )
}

export function ChatMessage({
  content, isUser, markdown = true,
}: {
  content: string
  isUser: boolean
  markdown?: boolean
}) {
  if (isUser) {
    return (
      <div className="flex justify-end pl-10">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-navy text-white px-4 py-2.5
                        text-[0.92rem] leading-relaxed shadow-[0_2px_8px_rgba(15,30,46,0.15)]">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 pr-6">
      <EchoAvatar />
      <div className="flex-1 min-w-0 pt-1.5 text-[0.92rem] leading-[1.7] text-brand-text">
        {markdown
          ? <MarkdownMessage content={content} />
          : <p className="whitespace-pre-wrap">{content}</p>}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <EchoAvatar />
      <div className="pt-3 flex items-center gap-1.5" aria-label="Echo schreibt">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-brand-muted/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>
    </div>
  )
}

export function ChatErrorMessage({
  text = 'Echo konnte nicht antworten. Bitte versuche es erneut.',
}: { text?: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center
                      text-sm font-bold flex-shrink-0">
        !
      </div>
      <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
        {text}
      </div>
    </div>
  )
}
