/**
 * /admin/nutzer — eine Zeile je Konto: wer es ist, was es kostet, ob es lebt.
 *
 * **Warum es diese Seite gibt.** Die Frage lässt sich in der Supabase-Nutzertabelle nicht
 * beantworten, und zwar grundsätzlich: Supabase kennt nur die Anmeldung. Wer eine
 * Fachperson ist, welchen Tarif jemand hat und wann zuletzt gearbeitet wurde, steht in der
 * EchoB-Datenbank — zwei getrennte Datenbanken, kein gemeinsamer Blick.
 *
 * **Wo die Grenze liegt.** Klient:innen standen hier bis zum 19.09.2026 nicht, mit der
 * Begründung: Was fehlt, kann nicht versehentlich in eine Liste geraten. Für den Betrieb —
 * Abrechnung, Support, Missbrauch, „lebt dieses Konto noch?" — braucht es sie. Die Grenze
 * verläuft deshalb nicht mehr an der Rolle, sondern am **Inhalt**: Pseudonym statt
 * Klarname, keine E-Mail von Klient:innen, und keine einzige Szene, kein Fall-Titel, kein
 * Sicherheitsstatus. Die Zahlen sagen, ob jemand arbeitet; sie sagen nicht, woran.
 *
 * Die Entscheidungen hinter den Spalten (fehlt vs. null, „nie aktiv" vs. „heute") stehen
 * in `nutzerzeile.ts` und werden dort geprüft — im JSX sieht man ihnen nichts an.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiErrorMessage } from '@/api/errors'
import { adminApi, type UserRow } from './api'
import {
  ROLLEN_LABEL, aktivText, berufsgruppeText, eingeschlafen, hinweisZustand, tarifText,
  zahlenText,
} from './nutzerzeile'

const ROLLEN = [
  { key: '', label: 'Alle' },
  { key: 'client', label: 'Klient:innen' },
  { key: 'professional', label: 'Fachpersonen' },
  { key: 'institute', label: 'Institute' },
  { key: 'student', label: 'Studierende' },
]

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

function datumZeit(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const TON_KLASSE = {
  gut: 'text-green-700',
  offen: 'font-medium text-amber-700',
  egal: 'text-brand-muted/60',
} as const

export default function AdminUsersPage() {
  const [rolle, setRolle] = useState('')
  const [q, setQ] = useState('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', rolle, q],
    queryFn: () => adminApi.users({ rolle: rolle || undefined, q: q.trim() || undefined }),
    retry: false,
  })

  const denied = (error as { response?: { status?: number } })?.response?.status === 403
  const zeilen = data ?? []
  const offen = zeilen.filter(r => avvZustand(r).ton === 'offen').length
  // Kleine Kopfzahlen: Wer die Seite oeffnet, will meist zuerst wissen, wie viele es
  // ueberhaupt sind und wie viele davon noch etwas tun.
  const aktiv = zeilen.filter(r => !eingeschlafen(r)).length

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-navy px-6">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between">
          <span className="font-bold text-white">Echo<span className="text-accent">B</span> · Konten</span>
          <Link to="/admin/verzeichnis" className="text-[0.82rem] text-white/60 no-underline hover:text-white">
            Zum Verzeichnis-Admin ↗
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-6 py-8">
        {denied ? (
          <div className="rounded-brand-lg border border-brand-border bg-white px-6 py-16 text-center">
            <h1 className="text-lg font-bold text-navy">Kein Admin-Zugriff</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Dieser Bereich ist an eine einzelne Konto-Kennung gebunden (<code>ADMIN_USER_ID</code>).
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-navy">Konten</h1>
            <p className="mt-1 max-w-3xl text-sm text-brand-muted">
              Eine Zeile je Konto, mit Rolle, Tarif, Zahlen und letzter Aktivität. Von
              Klient:innen steht hier nur das Pseudonym — keine Adresse, und kein einziger
              Inhalt: keine Szene, kein Fall-Titel, kein Sicherheitsstatus. Die Zahlen sagen,
              ob jemand arbeitet, nicht woran.
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

            {!isLoading && !error && zeilen.length > 0 && (
              <p className="mb-3 text-[0.8rem] text-brand-muted">
                {zeilen.length} {zeilen.length === 1 ? 'Konto' : 'Konten'} · {aktiv} davon in
                den letzten 90 Tagen aktiv
                {zeilen.length === 500 && ' · Anzeige auf 500 begrenzt'}
              </p>
            )}

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
            ) : zeilen.length === 0 ? (
              <p className="py-12 text-center text-sm text-brand-muted">Keine Konten in dieser Ansicht.</p>
            ) : (
              <div className="overflow-x-auto rounded-brand-lg border border-brand-border bg-white">
                <table className="w-full min-w-[1040px] text-left text-[0.84rem]">
                  <thead className="border-b border-brand-border text-[0.7rem] uppercase tracking-wide text-brand-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Konto</th>
                      <th className="px-4 py-2.5 font-semibold">Rolle</th>
                      <th className="px-4 py-2.5 font-semibold">E-Mail</th>
                      <th className="px-4 py-2.5 font-semibold">Tarif</th>
                      <th className="px-4 py-2.5 font-semibold">Zahlen</th>
                      <th className="px-4 py-2.5 font-semibold">Vertrag</th>
                      <th className="px-4 py-2.5 font-semibold">Hinweis</th>
                      <th className="px-4 py-2.5 font-semibold">Zuletzt aktiv</th>
                      <th className="px-4 py-2.5 font-semibold">Angelegt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zeilen.map(r => {
                      const avv = avvZustand(r)
                      const hinweis = hinweisZustand(r)
                      const schlaeft = eingeschlafen(r)
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
                          <td className="px-4 py-2.5 text-brand-text">
                            {ROLLEN_LABEL[r.rolle]}
                            {r.rolle === 'professional' && (
                              <span className="mt-0.5 block text-[0.68rem] text-brand-muted">
                                {berufsgruppeText(r)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-brand-text">{r.email || '—'}</td>
                          <td className="px-4 py-2.5 text-brand-text">{tarifText(r)}</td>
                          <td className="px-4 py-2.5 text-brand-text">{zahlenText(r)}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={TON_KLASSE[avv.ton]}
                              title={r.avv_accepted_at ? `${r.avv_version} · ${datum(r.avv_accepted_at)}` : undefined}
                            >
                              {avv.text}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={TON_KLASSE[hinweis.ton]}
                              title={r.hinweis_at ? datum(r.hinweis_at) : undefined}
                            >
                              {hinweis.text}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-2.5 ${schlaeft ? 'text-brand-muted/60' : 'text-brand-text'}`}
                            title={r.zuletzt_aktiv ? datumZeit(r.zuletzt_aktiv) : undefined}
                          >
                            {aktivText(r.zuletzt_aktiv)}
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
