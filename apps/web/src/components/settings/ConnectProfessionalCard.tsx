import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { clientInvitesApi } from '@/api/clientInvites'
import { professionalsApi } from '@/api/shares'

/**
 * Einstellungen-Karte: Mit einer Fachperson verbinden.
 * Zwei Wege: (1) Fachperson in EchoB suchen und eine Verbindungsanfrage senden
 * (nur auffindbare Fachpersonen; die Fachperson muss zustimmen), oder (2) einen
 * Einladungscode einlösen, den die Fachperson weitergegeben hat.
 */
function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const s = error.response?.status
    if (s === 404) return 'Code nicht gefunden. Bitte prüfe deine Eingabe.'
    if (s === 409) return 'Dieser Code wurde bereits verwendet.'
    if (s === 410) return 'Dieser Code ist abgelaufen oder wurde zurückgezogen.'
    if (s === 400) return 'Diesen Code kannst du nicht selbst einlösen.'
    if (s === 422) return 'Bitte gib einen Einladungscode ein.'
    if (!error.response) return 'Keine Verbindung zum Server. Bitte später erneut versuchen.'
  }
  return 'Verbindung fehlgeschlagen. Bitte versuche es erneut.'
}

function initials(name: string | null): string {
  const p = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '·'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export default function ConnectProfessionalCard() {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [q, setQ] = useState('')
  const term = q.trim()

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: professionalsApi.connections,
  })

  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ['pro-search', term],
    queryFn: () => professionalsApi.search(term),
    enabled: term.length >= 2,
    staleTime: 30_000,
  })

  const request = useMutation({
    mutationFn: (proId: string) => professionalsApi.request(proId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      qc.invalidateQueries({ queryKey: ['pro-search'] })
    },
  })

  const connect = useMutation({
    mutationFn: () => clientInvitesApi.accept({ code: code.trim() }),
    onSuccess: () => {
      setCode('')
      qc.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const dissolve = useMutation({
    mutationFn: (email: string) => professionalsApi.dissolve(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      qc.invalidateQueries({ queryKey: ['prof-connections'] })
    },
  })

  const accepted = (connections ?? []).filter((c) => c.status === 'accepted')
  const requested = (connections ?? []).filter((c) => c.status === 'requested')

  return (
    <div className="mt-6 card">
      <h2 className="text-lg font-semibold text-navy">Mit einer Fachperson verbinden</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Suche eine Fachperson in EchoB und sende ihr eine Verbindungsanfrage – oder gib einen
        Einladungscode ein, den du erhalten hast. Du behältst jederzeit die Kontrolle darüber, was
        du freigibst.
      </p>

      {/* Bestehende Verbindungen */}
      {accepted.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {accepted.map((c) => {
            const label = c.display_name || 'deiner Fachperson'
            const busy = dissolve.isPending && dissolve.variables === c.email
            return (
              <li key={c.professional_user_id ?? c.email}
                className="flex items-center gap-2 rounded-brand border border-brand-border bg-brand-bg/40 px-3 py-2 text-sm">
                <span className="text-accent" aria-hidden="true">✓</span>
                <span className="min-w-0 text-navy">
                  Verbunden mit <strong>{label}</strong>
                  {c.title && <span className="text-brand-muted"> · {c.title}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(
                      `Verbindung mit ${label} wirklich auflösen?\n\n` +
                      'Alle aktiven Freigaben an diese Fachperson werden dabei widerrufen – ' +
                      'sie verliert sofort den Zugriff auf geteilte Fälle. ' +
                      'Diese Aktion lässt sich nicht rückgängig machen.'
                    )) dissolve.mutate(c.email)
                  }}
                  disabled={busy}
                  className="ml-auto shrink-0 text-xs font-medium text-red-500 transition-colors hover:text-red-700 disabled:opacity-40"
                >
                  {busy ? 'Löse…' : 'Auflösen'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {dissolve.isError && (
        <p className="mt-2 text-sm text-red-600">
          Verbindung konnte nicht aufgelöst werden. Bitte versuche es erneut.
        </p>
      )}

      {/* Gesendete, noch offene Anfragen */}
      {requested.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {requested.map((c) => (
            <li key={c.professional_user_id ?? c.email}
              className="flex items-center gap-2 rounded-brand border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm">
              <span className="text-amber-600" aria-hidden="true">⋯</span>
              <span className="min-w-0 text-navy">
                Anfrage an <strong>{c.display_name || 'Fachperson'}</strong> gesendet
                <span className="text-brand-muted"> · wartet auf Bestätigung</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Suche */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-navy">Fachperson suchen</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name oder Fachrichtung …"
          className="w-full rounded-brand border border-brand-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {term.length >= 2 && (
          <div className="mt-2 space-y-1.5">
            {searching && <p className="text-xs text-brand-muted">Suche …</p>}
            {!searching && results.length === 0 && (
              <p className="text-xs text-brand-muted">
                Keine auffindbaren Fachpersonen gefunden. (Fachpersonen erscheinen hier nur, wenn sie
                sich in EchoB auffindbar gemacht haben.)
              </p>
            )}
            {results.map((r) => (
              <div key={r.professional_user_id}
                className="flex items-center gap-2 rounded-brand border border-brand-border px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                  {initials(r.display_name)}
                </span>
                <span className="min-w-0 text-sm text-navy">
                  <strong>{r.display_name || 'Fachperson'}</strong>
                  {r.title && <span className="text-brand-muted"> · {r.title}</span>}
                </span>
                <span className="ml-auto shrink-0">
                  {r.connection_status === 'connected' ? (
                    <span className="text-xs font-medium text-green-700">Verbunden ✓</span>
                  ) : r.connection_status === 'requested' ? (
                    <span className="text-xs text-brand-muted">Angefragt</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => request.mutate(r.professional_user_id)}
                      disabled={request.isPending}
                      className="rounded-brand bg-accent px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                    >
                      Anfrage senden
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
        {request.isError && (
          <p className="mt-1 text-xs text-red-600">Anfrage konnte nicht gesendet werden.</p>
        )}
      </div>

      {/* Einladungscode (alternativer Weg) */}
      <details className="mt-4 border-t border-brand-border pt-3">
        <summary className="cursor-pointer text-sm font-medium text-navy">
          … oder per Einladungscode verbinden
        </summary>
        <form
          onSubmit={(e) => { e.preventDefault(); if (code.trim()) connect.mutate() }}
          className="mt-3 flex flex-wrap items-start gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Einladungscode (z. B. ABCD-1234)"
            autoCapitalize="characters"
            className="min-w-0 flex-1 rounded-brand border border-brand-border bg-white px-3 py-2 text-sm uppercase tracking-wider outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!code.trim() || connect.isPending}
            className="shrink-0 rounded-brand bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {connect.isPending ? 'Verbinde…' : 'Verbinden'}
          </button>
        </form>
        {connect.isSuccess && (
          <p className="mt-2 text-sm text-green-700">
            {connect.data.professional_display_name
              ? `Verbunden mit ${connect.data.professional_display_name}.`
              : 'Verbindung hergestellt.'}
          </p>
        )}
        {connect.isError && (
          <p className="mt-2 text-sm text-red-600">{errorMessage(connect.error)}</p>
        )}
      </details>
    </div>
  )
}
