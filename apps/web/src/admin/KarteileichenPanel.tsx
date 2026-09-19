/**
 * Die Karteileichen-Prüfung: der einzige Ort, an dem beide Datenbanken nebeneinanderliegen.
 *
 * **Warum es diesen Vergleich braucht.** Die Anmeldung liegt bei Supabase, alles andere
 * hier — ohne Fremdschlüssel dazwischen, weil es zwei Server sind. Wer im Supabase-
 * Dashboard ein Konto löscht, hinterlässt deshalb Daten ohne Zugang: Die Person kommt
 * nicht mehr herein, ihre Fälle bleiben liegen, ihre Freigaben laufen weiter. Von hier aus
 * sieht man das nie — es sei denn, man fragt beide Seiten und legt sie übereinander.
 *
 * **Die zwei Richtungen sind nicht gleich dringend.** „Daten ohne Login" ist ein
 * Datenschutzproblem und steht oben. „Login ohne Daten" ist meist eine Anmeldung, die nie
 * beim ersten Schritt ankam — gut zu wissen, aber kein Notfall. Sie deshalb getrennt und
 * nicht in einer Liste.
 *
 * Geprüft wird nur auf Klick: Der Vergleich holt alle Konten von Supabase.
 */
import { useQuery } from '@tanstack/react-query'
import { apiErrorMessage } from '@/api/errors'
import { adminApi, type LoginOhneProfil, type UserRow, type VerwaistesKonto } from './api'
import { ROLLEN_LABEL, aktivText } from './nutzerzeile'

function datum(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('de-DE') : '—'
}

export default function KarteileichenPanel({ onLoeschen }: {
  /** `rolle === null` heißt: Zu dieser Kennung steht hier nichts — es gibt nur das Login. */
  onLoeschen: (userId: string, name: string | null, rolle: UserRow['rolle'] | null) => void
}) {
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-verwaist'],
    queryFn: adminApi.verwaist,
    retry: false,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <p className="rounded-brand-lg border border-brand-border bg-white px-4 py-6 text-center text-sm text-brand-muted">
        Vergleicht die Anmeldungen mit den Konten hier …
      </p>
    )
  }
  if (error) {
    return (
      <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Vergleich nicht möglich: {apiErrorMessage(error, 'Unbekannter Grund.')}
      </p>
    )
  }
  if (!data) return null

  return (
    <div className="rounded-brand-lg border border-brand-border bg-white">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-brand-border px-4 py-3">
        <h2 className="text-sm font-bold text-navy">Anmeldung und Daten im Abgleich</h2>
        <span className="text-[0.8rem] text-brand-muted">
          {data.auth_konten} Login-Konten · {data.db_konten} Konten hier
        </span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto text-[0.8rem] text-brand-muted underline-offset-2 hover:underline disabled:opacity-50"
        >
          {isFetching ? 'prüft …' : 'neu prüfen'}
        </button>
      </div>

      {data.unvollstaendig ? (
        // Bei einer abgeschnittenen Liste saehe jedes nicht geholte Konto aus wie
        // geloescht. Ein Loeschknopf daneben waere gefaehrlich - also gibt es hier keinen.
        <p className="m-4 rounded-brand border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[0.82rem] text-amber-900">
          Es sind mehr Login-Konten, als diese Prüfung auf einmal holen kann. Der Vergleich
          wäre unzuverlässig — jedes nicht geholte Konto sähe aus wie gelöscht. Deshalb
          steht hier nichts. (Grenze im Backend anheben: <code>_MAX_SEITEN</code>.)
        </p>
      ) : (
        <>
          <section className="px-4 py-3">
            <h3 className="text-[0.82rem] font-semibold text-navy">
              Daten ohne Login ({data.ohne_login.length})
            </h3>
            <p className="mt-0.5 text-[0.78rem] text-brand-muted">
              Im Supabase-Dashboard gelöscht, hier stehen geblieben. Die Person kommt nicht
              mehr herein — Fälle, Inhalte und laufende Freigaben sind noch da.
            </p>
            {data.ohne_login.length === 0 ? (
              <p className="mt-2 text-[0.82rem] text-green-700">Keine. Beide Seiten sind einig.</p>
            ) : (
              <ul className="mt-2 divide-y divide-brand-border/60">
                {data.ohne_login.map((z: VerwaistesKonto) => (
                  <li key={z.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className="font-medium text-navy">{z.name || '—'}</span>
                    <span className="text-[0.78rem] text-brand-muted">{ROLLEN_LABEL[z.rolle]}</span>
                    <span className="text-[0.78rem] text-brand-muted">
                      {z.spuren > 0 ? `${z.spuren} Fälle/Verbindungen` : 'ohne Spuren'}
                      {' · zuletzt '}{aktivText(z.zuletzt_aktiv)}
                    </span>
                    <span className="font-mono text-[0.66rem] text-brand-muted/70">{z.user_id}</span>
                    <button
                      onClick={() => onLoeschen(z.user_id, z.name, z.rolle)}
                      className="ml-auto rounded-brand border border-red-200 px-2.5 py-1 text-[0.78rem] font-medium text-red-700 hover:bg-red-50"
                    >
                      Aufräumen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-brand-border px-4 py-3">
            <h3 className="text-[0.82rem] font-semibold text-navy">
              Login ohne Daten ({data.ohne_profil.length})
            </h3>
            <p className="mt-0.5 text-[0.78rem] text-brand-muted">
              Angemeldet, aber nie angekommen: keine einzige Zeile in dieser Datenbank.
              Harmlos — es erklärt die Lücke zwischen Registrierungen und Konten.
            </p>
            {data.ohne_profil.length === 0 ? (
              <p className="mt-2 text-[0.82rem] text-brand-muted">Keine.</p>
            ) : (
              <ul className="mt-2 divide-y divide-brand-border/60">
                {data.ohne_profil.map((z: LoginOhneProfil) => (
                  <li key={z.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className="text-brand-text">{z.email || '—'}</span>
                    <span className="text-[0.78rem] text-brand-muted">
                      angelegt {datum(z.angelegt)}
                      {z.letzter_login ? ` · zuletzt angemeldet ${datum(z.letzter_login)}` : ' · nie angemeldet'}
                    </span>
                    <button
                      onClick={() => onLoeschen(z.user_id, z.email, null)}
                      className="ml-auto rounded-brand border border-brand-border px-2.5 py-1 text-[0.78rem] text-navy hover:border-red-300 hover:text-red-700"
                    >
                      Login entfernen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
