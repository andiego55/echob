/**
 * Schnellerfassung: Sprache oder Text → von Echo strukturierter Szenen-Entwurf.
 * Die Aufnahme wird nur zur Transkription gesendet und nicht gespeichert.
 */
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { audioEinwilligung } from '@/api/account'
import { scenesApi } from '@/api/scenes'
import type { SceneDraft } from '@/types'

interface Props {
  caseId: string
  onDraft: (draft: SceneDraft) => void
}

export default function QuickCapture({ caseId, onDraft }: Props) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // null = noch keine Aufnahme versucht · '' = Aufnahme, aber kein Text erkannt · sonst = Transkript
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)

  const canRecord = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices
    && typeof window !== 'undefined'
    && 'MediaRecorder' in window

  // Aufnahmeformat: das erste vom Browser unterstützte wählen, damit blob.type
  // verlässlich stimmt. Safari/iOS kann kein webm → fällt auf mp4 zurück.
  const pickRecorderMime = (): string => {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
    for (const t of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return ''
  }

  /**
   * Die Audio-Einwilligung — **vor** dem Mikrofon, nicht an der Tuer.
   *
   * Eine Einwilligung soll fuer einen bestimmten Zweck und informiert sein (Art. 4 Nr. 11
   * DSGVO). Im Einwilligungs-Dialog beim ersten Anmelden abgefragt, wo niemand weiss, ob
   * er je ein Mikrofon benutzt, waere sie beides nicht. Hier steht sie an der Sache, und
   * sie ist die einzige Einwilligung bei EchoB, die man folgenlos ablehnen kann: Wer nicht
   * spricht, tippt in dasselbe Feld.
   *
   * **Vor `getUserMedia`, nicht danach.** Der Browser fragt selbst nach dem Mikrofon —
   * aber das ist die Erlaubnis des GERAETS, nicht die Einwilligung in die Uebermittlung
   * der Aufnahme zur Transkription. Zwei verschiedene Fragen, und nur eine davon stellt
   * der Browser.
   */
  const [fragtAudio, setFragtAudio] = useState(false)

  const audioErlaubt = useQuery({
    queryKey: ['audio-einwilligung'],
    queryFn: audioEinwilligung.stand,
  })

  const audioZustimmen = useMutation({
    mutationFn: audioEinwilligung.erteilen,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['audio-einwilligung'] })
      setFragtAudio(false)
      void startRecording(true)
    },
  })

  const startRecording = async (schonGefragt = false) => {
    setError(null)
    setLastTranscript(null)
    if (!schonGefragt && !audioErlaubt.data?.audio) {
      setFragtAudio(true)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickRecorderMime()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
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
    const hadAudio = !!blobRef.current
    setPending(true)
    setError(null)
    setDone(false)
    try {
      const res = await scenesApi.quickCapture(caseId, {
        text: text.trim() || undefined,
        audio: blobRef.current ?? undefined,
      })
      onDraft(res.draft)
      setLastTranscript(hadAudio ? (res.transcript ?? '') : null)
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


  if (fragtAudio) {
    return (
      <div className="rounded-brand border border-brand-border bg-white p-5">
        <h3 className="text-sm font-semibold text-navy">Aufnahme und Transkription</h3>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Wenn du sprichst, wird die Aufnahme zur Umwandlung in Text an unseren KI-Anbieter
          in die USA übermittelt. Sie wird dort nur dafür verarbeitet und{' '}
          <strong className="text-navy">nicht dauerhaft gespeichert</strong> – weder bei uns
          noch beim Anbieter. Gespeichert wird allein der Text, den du danach siehst und
          bearbeiten kannst.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Du kannst das ablehnen und stattdessen tippen – es geht dir nichts verloren.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => audioZustimmen.mutate()}
            disabled={audioZustimmen.isPending}
            className="btn-primary !py-2 disabled:opacity-60"
          >
            {audioZustimmen.isPending ? 'Einen Moment …' : 'Einverstanden, Aufnahme starten'}
          </button>
          <button
            type="button"
            onClick={() => setFragtAudio(false)}
            className="rounded-brand border border-brand-border px-4 py-2 text-sm text-navy"
          >
            Lieber tippen
          </button>
        </div>
      </div>
    )
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
              onClick={() => void startRecording()}
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
      {lastTranscript !== null && (
        lastTranscript.trim()
          ? (
            <p className="mt-2 text-xs text-brand-muted">
              <span className="font-medium text-navy">Erkannt:</span> „{lastTranscript}"
            </p>
          )
          : (
            <p role="alert" className="mt-2 text-xs text-amber-600">
              Aus der Aufnahme wurde kein Text erkannt – bitte deutlicher sprechen oder Text einfügen.
            </p>
          )
      )}
      {done && !error && (
        <p className="mt-2 text-xs text-green-600">Entwurf übernommen – prüfe und ergänze ihn unten, dann speichern.</p>
      )}
    </div>
  )
}
