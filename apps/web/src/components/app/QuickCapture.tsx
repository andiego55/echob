/**
 * Schnellerfassung: Sprache oder Text → von Echo strukturierter Szenen-Entwurf.
 * Die Aufnahme wird nur zur Transkription gesendet und nicht gespeichert.
 */
import { useRef, useState } from 'react'
import { scenesApi } from '@/api/scenes'
import type { SceneDraft } from '@/types'

interface Props {
  caseId: string
  onDraft: (draft: SceneDraft) => void
}

export default function QuickCapture({ caseId, onDraft }: Props) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)

  const canRecord = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices
    && typeof window !== 'undefined'
    && 'MediaRecorder' in window

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setAudioReady(true)
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setAudioReady(false)
      blobRef.current = null
    } catch {
      setError('Mikrofon-Zugriff nicht möglich. Du kannst stattdessen Text einfügen.')
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  const structure = async () => {
    if (!text.trim() && !blobRef.current) {
      setError('Bitte sprich kurz oder füge Text ein.')
      return
    }
    setPending(true)
    setError(null)
    setDone(false)
    try {
      const res = await scenesApi.quickCapture(caseId, {
        text: text.trim() || undefined,
        audio: blobRef.current ?? undefined,
      })
      onDraft(res.draft)
      setText('')
      blobRef.current = null
      setAudioReady(false)
      setDone(true)
    } catch {
      setError('Konnte nicht strukturieren. Bitte versuche es erneut.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-brand border border-accent/30 bg-accent/[0.04] p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span aria-hidden="true">🎙️</span>
        <p className="text-sm font-semibold text-navy">Schnell erfassen</p>
      </div>
      <p className="text-xs text-brand-muted mb-3">
        Sprich frei oder füge Text ein – Echo macht daraus einen strukturierten Entwurf,
        den du unten prüfst und anpasst. Die Aufnahme wird nur zur Transkription genutzt, nicht gespeichert.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Erzähl, was passiert ist – oder füge hier Text ein …"
        className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canRecord && (
          recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-brand border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Aufnahme stoppen
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs font-medium text-navy hover:border-accent hover:text-accent transition-colors"
            >
              ● {audioReady ? 'Neu aufnehmen' : 'Aufnahme starten'}
            </button>
          )
        )}
        {audioReady && !recording && (
          <span className="text-xs text-green-600 font-medium">Aufnahme bereit ✓</span>
        )}

        <button
          type="button"
          onClick={structure}
          disabled={pending || recording}
          className="ml-auto btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-40"
        >
          {pending ? 'Echo strukturiert …' : 'Mit Echo strukturieren'}
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      {done && !error && (
        <p className="mt-2 text-xs text-green-600">Entwurf übernommen – prüfe und ergänze ihn unten, dann speichern.</p>
      )}
    </div>
  )
}
