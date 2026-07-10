import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { clientInvitesApi } from '@/api/clientInvites'
import { professionalsApi } from '@/api/shares'

/**
 * Einstellungen-Karte: Mit einer Fachperson verbinden – über den Einladungscode,
 * den die Fachperson weitergegeben hat. Fängt den Fall ab, dass der Code bei der
 * Registrierung vergessen wurde: er kann hier jederzeit nachgereicht werden.
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

export default function ConnectProfessionalCard() {
  const qc = useQueryClient()
  const [code, setCode] = useState('')

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: professionalsApi.connections,
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

  return (
    <div className="mt-6 card">
      <h2 className="text-lg font-semibold text-navy">Mit einer Fachperson verbinden</h2>
      <p className="mt-1 text-sm text-brand-muted">
        Hast du von einer Fachperson, Praxis oder Coach einen Einladungscode bekommen? Gib ihn hier
        ein – dann kannst du Fälle gezielt mit ihr teilen. Du behältst jederzeit die Kontrolle, was
        du freigibst.
      </p>

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

      <form
        onSubmit={(e) => { e.preventDefault(); if (code.trim()) connect.mutate() }}
        className="mt-4 flex flex-wrap items-start gap-2"
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
    </div>
  )
}
