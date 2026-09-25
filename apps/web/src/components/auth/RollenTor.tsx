/**
 * Das Tor vor einem Rollenbereich — Fachperson, Institut, Studierende.
 *
 * **Der Fehler, den das hier auflöst.** In allen drei Toren stand dieselbe Zeile:
 *
 *     if (isError || !data) return <Navigate to="/app" replace />
 *
 * `isError` war dabei absichtlich tragend: Der Server antwortet einer Person ohne diesen
 * Zugang mit einem Fehler, und daraus folgt „das ist nicht dein Bereich". Er antwortet aber
 * mit einem Fehler auch dann, wenn der Token gerade abgelaufen ist, wenn er neu startet
 * oder wenn der Zug in einen Tunnel fährt. In allen diesen Fällen wurde einer Fachperson
 * ihr Arbeitsplatz unter dem Stuhl weggezogen — **ohne eine Zeile Erklärung**: Sie stand
 * plötzlich im Nutzerbereich und musste glauben, sie habe den Zugang verloren.
 *
 * **Drei Antworten, drei Bedeutungen.** Das ist der ganze Inhalt dieser Datei:
 *
 *     403 (404/410)   Du hast diesen Zugang nicht      -> in den Nutzerbereich
 *     401             Deine Sitzung ist abgelaufen     -> zur Anmeldung
 *     alles andere    Wir konnten es nicht prüfen      -> HIER BLEIBEN und nachfragen
 *
 * Die dritte Zeile ist die neue. „Nicht geprüft" ist kein „nicht erlaubt", und solange man
 * es nicht weiß, verschiebt man niemanden.
 *
 * **Warum ein gemeinsamer Baustein.** Die Regel stand dreimal da und war dreimal gleich
 * falsch. Es gibt inzwischen drei Rollen und es werden mehr; die nächste bekommt das hier
 * geschenkt, statt den Fehler ein viertes Mal zu erben.
 */
import { Navigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { apiErrorMessage } from '@/api/errors'

export function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-accent" />
    </div>
  )
}

/**
 * Sagt der Server „diesen Zugang hast du nicht"?
 *
 * **403**, und das ist keine Vermutung: `get_current_professional`,
 * `get_current_institute` und `get_current_student` werfen alle drei
 * `HTTP_403_FORBIDDEN` mit „Kein …-Zugang.". In den Toren stand jahrelang der Kommentar
 * „404 → isError" — er war schlicht falsch, und weil `isError` ohnehin alles abfing, fiel
 * es niemandem auf.
 *
 * 404 und 410 stehen mit dabei: Eine Rolle, deren Datensatz es nicht (mehr) gibt, ist
 * dieselbe Auskunft, und es kostet nichts, sie zu verstehen.
 */
export function istNichtDeinBereich(error: unknown): boolean {
  const status = (error as AxiosError | undefined)?.response?.status
  return status === 403 || status === 404 || status === 410
}

/** Ist die Sitzung selbst hinüber? Dann hilft der Nutzerbereich auch nicht. */
export function istSitzungAbgelaufen(error: unknown): boolean {
  // Der API-Client hat vorher schon einmal nachgefasst und die Sitzung erneuert. Kommt
  // hier noch ein 401 an, ist sie wirklich weg.
  return (error as AxiosError | undefined)?.response?.status === 401
}

export default function RollenTor({
  rolle, data, isLoading, error, children,
}: {
  /** Für den Satz im Zweifelsfall: „…ob dir der Fachpersonenbereich gehört". */
  rolle: string
  data: unknown
  isLoading: boolean
  error: unknown
  children: React.ReactNode
}) {
  const { session, loading } = useAuth()

  if (loading || (session && isLoading)) return <Spinner />
  if (!session) return <Navigate to="/auth" replace />
  if (data) return <>{children}</>

  if (istSitzungAbgelaufen(error)) return <Navigate to="/auth" replace />
  if (istNichtDeinBereich(error)) return <Navigate to="/app" replace />

  // Weder erlaubt noch verboten, sondern unbekannt. Frueher landete man hier im
  // Nutzerbereich und hielt sich fuer ausgesperrt.
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-6">
      <div className="card max-w-[30rem] text-center">
        <h1 className="card-title">Gerade nicht prüfbar</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Wir konnten nicht nachsehen, ob dir {rolle} gehört. Das heißt nicht, dass du ihn
          nicht hast — es hat gerade nur nicht geklappt.
        </p>
        {error != null && (
          <p className="mt-1.5 text-xs text-brand-muted">{apiErrorMessage(error)}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => window.location.reload()} className="btn-primary !py-2 !px-5 !text-sm">
            Erneut versuchen
          </button>
          <a href="/app" className="text-sm text-brand-muted hover:text-navy">
            Zum Nutzerbereich
          </a>
        </div>
      </div>
    </div>
  )
}
