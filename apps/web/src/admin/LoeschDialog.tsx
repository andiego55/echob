/**
 * Der Dialog vor der einzigen Handlung im Admin, die sich nicht rückgängig machen lässt.
 *
 * **Er zeigt zuerst, was passiert, und fragt erst dann.** Was eine Löschung bedeutet,
 * hängt an der Rolle — bei einem Institut verlieren Studierende ihren Zugang, die davon
 * nichts ahnen. Diese Sätze stehen in `loeschen.ts` und werden dort geprüft.
 *
 * **Nach dem Löschen bleibt der Beleg stehen.** Der Dialog schließt sich nicht von selbst:
 * „47 Zeilen in 12 Tabellen gelöscht, Login-Konto entfernt" ist das Einzige, was von dem
 * Vorgang noch zu sehen ist. Wer ihn wegklickt, hat ihn gelesen.
 */
import { useEffect, useRef, useState } from 'react'
import { apiErrorMessage } from '@/api/errors'
import { adminApi, type LoeschErgebnis, type UserRow } from './api'
import { ROLLEN_LABEL } from './nutzerzeile'
import { bestaetigt, ergebnisText, loeschUmfang, loeschWort, weitereRollen } from './loeschen'

export default function LoeschDialog({ row, alle, hinweis, onClose, onFertig }: {
  row: UserRow
  alle: UserRow[]
  /** Steht statt der Rolle, wenn diese Zeile gar kein Konto hier ist (Login ohne Daten). */
  hinweis?: string
  onClose: () => void
  onFertig: () => void
}) {
  const [eingabe, setEingabe] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [ergebnis, setErgebnis] = useState<LoeschErgebnis | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const feld = useRef<HTMLInputElement>(null)

  useEffect(() => { feld.current?.focus() }, [])
  useEffect(() => {
    const zu = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', zu)
    return () => window.removeEventListener('keydown', zu)
  }, [onClose])

  const wort = loeschWort(row)
  const bereit = bestaetigt(eingabe, row) && !laeuft
  const auch = weitereRollen(row, alle)

  async function loeschen() {
    setLaeuft(true)
    setFehler(null)
    try {
      const e = await adminApi.deleteUser(row.user_id)
      setErgebnis(e)
      if (e.ok) onFertig()
    } catch (err) {
      setFehler(apiErrorMessage(err, 'Unbekannter Grund.'))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Konto ${wort} löschen`}
        className="w-full max-w-lg rounded-brand-lg border border-brand-border bg-white p-6 shadow-xl"
      >
        {ergebnis ? (
          <>
            <h2 className="text-base font-bold text-navy">
              {ergebnis.ok ? 'Gelöscht' : 'Nicht gelöscht'}
            </h2>
            <p className="mt-2 text-sm text-brand-text">{ergebnisText(ergebnis)}</p>
            {ergebnis.ok && Object.keys(ergebnis.tabellen).length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[0.8rem] text-brand-muted">
                  Was genau wegfiel
                </summary>
                <ul className="mt-2 max-h-52 overflow-y-auto font-mono text-[0.72rem] text-brand-muted">
                  {Object.entries(ergebnis.tabellen).map(([t, n]) => (
                    <li key={t}>{t}: {n}</li>
                  ))}
                </ul>
              </details>
            )}
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-brand bg-navy px-4 py-2 text-sm font-medium text-white"
            >
              Schließen
            </button>
          </>
        ) : (
          <>
            <h2 className="text-base font-bold text-navy">Konto endgültig löschen</h2>
            <p className="mt-1 text-sm text-brand-muted">
              {hinweis ?? ROLLEN_LABEL[row.rolle]} ·{' '}
              <span className="font-medium text-brand-text">{row.name || '—'}</span>
              <span className="mt-0.5 block font-mono text-[0.68rem]">{row.user_id}</span>
            </p>

            {auch.length > 0 && (
              // Eine Person kann mehrere Rollen haben. Geloescht wird die Person.
              <p className="mt-3 rounded-brand border border-amber-200 bg-amber-50 px-3 py-2 text-[0.82rem] text-amber-900">
                Dieses Konto steht auch als {auch.join(' und ')} in der Liste. Beides geht mit.
              </p>
            )}

            <p className="mt-4 text-[0.82rem] font-medium text-brand-text">Dabei fällt weg:</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.82rem] text-brand-text">
              {loeschUmfang(row).map(p => <li key={p}>{p}</li>)}
            </ul>

            <p className="mt-4 text-[0.82rem] text-brand-muted">
              Es gibt keinen Papierkorb. Zum Bestätigen{' '}
              <span className="font-medium text-brand-text">{wort}</span> eintippen:
            </p>
            <input
              ref={feld}
              value={eingabe}
              onChange={e => setEingabe(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && bereit) loeschen() }}
              placeholder={wort}
              className="mt-1.5 w-full rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-red-400"
            />

            {fehler && (
              <p className="mt-3 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-[0.82rem] text-red-700">
                Konnte nicht gelöscht werden: {fehler}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-brand border border-brand-border px-4 py-2 text-sm font-medium text-navy"
              >
                Abbrechen
              </button>
              <button
                onClick={loeschen}
                disabled={!bereit}
                className="flex-1 rounded-brand bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {laeuft ? 'Löscht …' : 'Endgültig löschen'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
