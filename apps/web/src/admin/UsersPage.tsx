/**
 * /admin/nutzer — welche Rolle hat welches Konto?
 *
 * **Warum es diese Seite gibt.** Die Frage lässt sich in der Supabase-Nutzertabelle
 * nicht beantworten, und zwar grundsätzlich: Supabase kennt nur die Anmeldung. Wer eine
 * Fachperson ist, entscheidet allein die Profilzeile in der EchoB-Datenbank — zwei
 * getrennte Datenbanken, kein gemeinsamer Blick. Diese Seite ist die Antwort von der
 * Seite, auf der die Rollen tatsächlich liegen.
 *
 * **Wer hier fehlt.** Klient:innen. Von ihnen weiß diese Datenbank weder Namen noch
 * Adresse, und dabei soll es bleiben.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiErrorMessage } from '@/api/errors'
import { adminApi, type UserRow } from './api'

const ROLLEN = [
  { key: '', label: 'Alle' },
  { key: 'professional', label: 'Fachpersonen' },
  { key: 'institute', label: 'Institute' },
  { key: 'student', label: 'Studierende' },
]

const ROLLEN_LABEL: Record<UserRow['rolle'], string> = {
  professional: 'Fachperson',
  institute: 'Institut',
  student: 'Studierend',
}

/**
 * Der AVV hat drei Zustände, nicht zwei.
 *
 * `null` heißt „für diese Rolle ohne Bedeutung" — ein Institut schließt keinen AVV nach
 * Art. 28 ab. Das als „offen" darzustellen wäre eine erfundene Baustelle, die man
 * abzuarbeiten versucht und nie loswird. Deshalb steht die Unterscheidung hier und
 * nicht als Ternär mitten im JSX.
 */
export function avvZustand(row: Pick<UserRow, 'rolle' | 'avv_accepted'>):
  { text: string; ton: 'gut' | 'offen' | 'egal' } {
  if (row.avv_accepted === null || row.rolle !== 'professional') {
    return { text: '–', ton: 'egal' }
  }
  return row.avv_accepted
    ? { text: 'unterschrieben', ton: 'gut' }
    : { text: 'offen', ton: 'offen' }
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminUsersPage() {
  const [rolle, setRolle] = useState('')
  const [q, setQ] = useState('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', rolle, q],
    queryFn: () => adminApi.users({ rolle: rolle || undefined, q: q.trim() || undefined }),
    retry: false,
  })

  const denied = (error as { response?: { status?: number } })?.response?.status === 403
  const offen = (data ?? []).filter(r => avvZustand(r).ton === 'offen').length

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-navy px-6">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between">
          <span className="font-bold text-white">Echo<span className="text-accent">B</span> · Konten</span>
          <Link to="/admin/verzeichnis" className="text-[0.82rem] text-white/60 no-underline hover:text-white">
            Zum Verzeichnis-Admin ↗
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-6 py-8">
        {denied ? (
          <div className="rounded-brand-lg border border-brand-border bg-white px-6 py-16 text-center">
            <h1 className="text-lg font-bold text-navy">Kein Admin-Zugriff</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Dieser Bereich ist an eine einzelne Konto-Kennung gebunden (<code>ADMIN_USER_ID</code>).
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-navy">Konten mit Rolle</h1>
            <p className="mt-1 max-w-2xl text-sm text-brand-muted">
              Klient:innen stehen hier nicht: Von ihnen kennt diese Datenbank weder Namen
              noch Adresse. Sichtbar ist nur, wer eine Rolle trägt.
            </p>

            <div className="mb-4 mt-6 flex flex-wrap items-center gap-2">
              {ROLLEN.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRolle(r.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors ${
                    rolle === r.key
                      ? 'border-accent bg-accent text-white'
                      : 'border-brand-border bg-white text-navy hover:border-accent/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Name oder E-Mail …"
                className="ml-auto w-56 rounded-brand border border-brand-border bg-white px-3 py-1.5 text-[0.82rem] outline-none focus:border-accent"
              />
            </div>

            {offen > 0 && (
              <p className="mb-3 rounded-brand border border-amber-200 bg-amber-50 px-3.5 py-2 text-[0.82rem] text-amber-900">
                {offen === 1
                  ? 'Eine Fachperson hat den Vertrag noch nicht abgeschlossen und sieht daher keine Falldaten.'
                  : `${offen} Fachpersonen haben den Vertrag noch nicht abgeschlossen und sehen daher keine Falldaten.`}
              </p>
            )}

            {isLoading ? (
              <p className="py-12 text-center text-brand-muted">Lädt …</p>
            ) : error ? (
              // Ein Fehler darf nie als „keine Konten" erscheinen.
              <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Konten konnten nicht geladen werden: {apiErrorMessage(error, 'Unbekannter Grund.')}
              </p>
            ) : (data ?? []).length === 0 ? (
              <p className="py-12 text-center text-sm text-brand-muted">Keine Konten in dieser Ansicht.</p>
            ) : (
              <div className="overflow-x-auto rounded-brand-lg border border-brand-border bg-white">
                <table className="w-full min-w-[720px] text-left text-[0.84rem]">
                  <thead className="border-b border-brand-border text-[0.7rem] uppercase tracking-wide text-brand-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Name</th>
                      <th className="px-4 py-2.5 font-semibold">E-Mail</th>
                      <th className="px-4 py-2.5 font-semibold">Rolle</th>
                      <th className="px-4 py-2.5 font-semibold">Vertrag</th>
                      <th className="px-4 py-2.5 font-semibold">Angelegt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data ?? []).map(r => {
                      const avv = avvZustand(r)
                      return (
                        <tr key={r.user_id} className="border-b border-brand-border/60 last:border-0">
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-navy">{r.name || '—'}</span>
                            {r.im_verzeichnis && (
                              <span className="ml-2 rounded-full bg-accent/10 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-accent">
                                Verzeichnis
                              </span>
                            )}
                            <span className="mt-0.5 block font-mono text-[0.66rem] text-brand-muted/70">{r.user_id}</span>
                          </td>
                          <td className="px-4 py-2.5 text-brand-text">{r.email || '—'}</td>
                          <td className="px-4 py-2.5 text-brand-text">{ROLLEN_LABEL[r.rolle]}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={
                                avv.ton === 'gut' ? 'text-green-700'
                                  : avv.ton === 'offen' ? 'font-medium text-amber-700'
                                    : 'text-brand-muted/60'
                              }
                              title={r.avv_accepted_at ? `${r.avv_version} · ${datum(r.avv_accepted_at)}` : undefined}
                            >
                              {avv.text}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-brand-muted">{datum(r.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
