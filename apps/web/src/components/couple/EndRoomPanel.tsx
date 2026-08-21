/**
 * Verbindung beenden – mit ehrlicher Wahl statt einem mehrdeutigen Knopf.
 *
 * „Beenden" schließt nur die Tür: die Inhalte bleiben, falls ihr es euch anders überlegt.
 * „Beenden und löschen" räumt wirklich ab – für beide Seiten, denn Sitzungsverläufe gehören
 * euch gemeinsam und lassen sich nicht nach Person auftrennen. Wer nur sein Eigenes loswerden
 * will, hat dafür den dritten Weg.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { coupleApi } from '@/api/couple'
import Fehlermeldung from '@/components/Fehlermeldung'
import { useBestaetigen } from '@/components/Bestaetigung'

export default function EndRoomPanel({ coupleId, since }: { coupleId: string; since: string }) {
  const bestaetigen = useBestaetigen()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [purge, setPurge] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [privateDone, setPrivateDone] = useState(false)

  const end = useMutation({
    mutationFn: () => coupleApi.end(coupleId, purge),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-links'] })
      navigate('/app/paar')
    },
  })

  const clearPrivate = useMutation({
    mutationFn: () => coupleApi.deleteMyPrivateContent(coupleId),
    onSuccess: () => {
      setPrivateDone(true)
      qc.invalidateQueries({ queryKey: ['couple-session'] })
    },
  })

  const purgeReady = !purge || confirmText.trim().toUpperCase() === 'LÖSCHEN'

  return (
    <div className="card">
      <h2 className="card-title">Verbindung</h2>
      <p className="mt-2 text-sm text-brand-muted">
        Ihr seid seit {new Date(since).toLocaleDateString('de-DE')} verbunden.
      </p>

      {/* Nur Eigenes löschen – der sanfte Weg */}
      <div className="mt-4 rounded-brand border border-brand-border px-3.5 py-3">
        <p className="text-xs font-semibold text-navy">Nur meine privaten Inhalte löschen</p>
        <p className="mt-1 text-[0.7rem] leading-relaxed text-brand-muted">
          Dein privater Echo-Dialog, deine vertraulichen Mediationsbeiträge und deine
          Entwürfe. Was du ausdrücklich geteilt hast, bleibt – die andere Person hat es
          gelesen.
        </p>
        <button
          onClick={async () => {
            if (await bestaetigen({ titel: 'Deine privaten Inhalte löschen?', text: 'Betrifft nur, was allein dir gehört: dein privater Begleiter, vertrauliche Perspektiven, Entwürfe. Gemeinsames bleibt. Das lässt sich nicht rückgängig machen.', knopf: 'Endgültig löschen', gefahr: true })) {
              clearPrivate.mutate()
            }
          }}
          disabled={clearPrivate.isPending}
          className="btn-quiet !py-1.5 !px-3.5 !text-xs mt-2.5 disabled:opacity-50"
        >
          {clearPrivate.isPending ? 'Lösche …' : 'Privates löschen'}
        </button>
        {privateDone && (
          <p className="mt-2 text-[0.7rem] text-accent">Erledigt. Geteiltes ist unberührt.</p>
        )}
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 text-xs text-red-600 hover:underline"
        >
          Verbindung beenden …
        </button>
      ) : (
        <div className="mt-3 rounded-brand border border-red-200 bg-red-50/40 px-3.5 py-3">
          <p className="text-xs font-semibold text-navy">Was soll mit euren Inhalten passieren?</p>

          <label className="mt-2.5 flex cursor-pointer items-start gap-2.5">
            <input type="radio" checked={!purge} onChange={() => setPurge(false)} className="mt-0.5" />
            <span className="text-xs">
              <span className="font-medium text-navy">Nur beenden.</span>{' '}
              <span className="text-brand-muted">
                Der Raum wird für euch beide geschlossen, die Inhalte bleiben gespeichert.
              </span>
            </span>
          </label>

          <label className="mt-2 flex cursor-pointer items-start gap-2.5">
            <input type="radio" checked={purge} onChange={() => setPurge(true)} className="mt-0.5" />
            <span className="text-xs">
              <span className="font-medium text-navy">Beenden und alles löschen.</span>{' '}
              <span className="text-brand-muted">
                Gespräche, Zusammenfassungen, Abmachungen, Mediationen, Tests und beide
                privaten Dialoge werden endgültig entfernt – auch für die andere Person.
                Gemeinsame Inhalte lassen sich nicht nach Person auftrennen.
              </span>
            </span>
          </label>

          {purge && (
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Tippe LÖSCHEN zum Bestätigen"
              className="input mt-2.5 !text-xs"
            />
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => end.mutate()}
              disabled={!purgeReady || end.isPending}
              className="btn !py-1.5 !px-3.5 !text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {end.isPending ? 'Beende …' : purge ? 'Beenden und löschen' : 'Beenden'}
            </button>
            <button
              onClick={() => { setOpen(false); setPurge(false); setConfirmText('') }}
              className="text-xs text-brand-muted hover:text-navy"
            >
              Abbrechen
            </button>
          </div>
          <Fehlermeldung error={end.error} />
        </div>
      )}
    </div>
  )
}
