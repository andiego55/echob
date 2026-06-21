/**
 * Bidirektionaler Nachrichten-Thread (Profi ↔ Klient:in).
 * Wird beidseitig verwendet: `mySide` steuert nur die Bubble-Ausrichtung.
 * Der Verlauf wird aus payload.body (Eröffnung der Fachperson) + payload.thread gebaut.
 */
import { useState } from 'react'

export interface ThreadMsg {
  from: string
  text: string
  at?: string
}

/** payload.body (Eröffnung der Fachperson) + payload.thread → flache Nachrichtenliste. */
export function threadFromPayload(payload: Record<string, unknown>): ThreadMsg[] {
  const out: ThreadMsg[] = []
  const body = payload?.body
  if (typeof body === 'string' && body.trim()) out.push({ from: 'professional', text: body })
  const thread = payload?.thread
  if (Array.isArray(thread)) {
    for (const m of thread) {
      if (m && typeof m === 'object' && typeof (m as ThreadMsg).text === 'string') {
        out.push(m as ThreadMsg)
      }
    }
  }
  return out
}

export default function MessageThread({
  messages, mySide, onSend, busy,
}: {
  messages: ThreadMsg[]
  mySide: 'user' | 'professional'
  onSend: (text: string) => void
  busy?: boolean
}) {
  const [text, setText] = useState('')
  return (
    <div>
      <div className="space-y-2">
        {messages.map((m, i) => {
          const mine = m.from === mySide
          return (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-brand px-3 py-2 text-sm whitespace-pre-wrap ${
                mine
                  ? 'bg-accent text-white'
                  : 'bg-brand-bg border border-brand-border text-brand-text'
              }`}>
                {m.text}
              </div>
            </div>
          )
        })}
      </div>
      <form
        onSubmit={e => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText('') } }}
        className="mt-2 flex gap-2"
      >
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Antwort schreiben …"
          className="flex-1 rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
        <button type="submit" disabled={busy || !text.trim()}
          className="text-sm font-semibold px-4 py-2 rounded-brand bg-accent text-white hover:bg-accent/90 disabled:opacity-60">
          {busy ? '…' : 'Senden'}
        </button>
      </form>
    </div>
  )
}
