import { AxiosError } from 'axios'

/**
 * Fehlermeldung für die Oberfläche.
 *
 * Ein fehlgeschlagener Request darf nie stillschweigend verpuffen – wer klickt und nichts
 * sieht, hält die App für kaputt. Wenn der Server eine eigene Begründung mitschickt
 * (`detail`), gewinnt sie; sonst gibt es eine verständliche Erklärung nach Statuscode.
 */
export function apiErrorMessage(err: unknown, fallback = 'Das hat leider nicht geklappt.'): string {
  const ax = err as AxiosError<{ detail?: string }> | undefined

  if (ax?.code === 'ERR_NETWORK' || ax?.message === 'Network Error') {
    return 'Keine Verbindung zum Server. Bist du online?'
  }

  const status = ax?.response?.status
  const detail = ax?.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) return detail

  switch (status) {
    case 400: return 'Die Eingabe passt so nicht.'
    case 401: return 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.'
    case 403: return 'Dafür fehlt dir die Berechtigung.'
    case 404: return 'Diese Funktion steht auf dem Server noch nicht bereit.'
    case 409: return 'Das wurde zwischenzeitlich schon verwendet.'
    case 410: return 'Das ist nicht mehr gültig.'
    case 429: return 'Zu viele Anfragen – bitte kurz warten.'
    case 503: return 'Echo ist gerade nicht erreichbar. Bitte später noch einmal.'
    default:
      return status && status >= 500
        ? 'Auf dem Server ist etwas schiefgelaufen. Bitte später noch einmal.'
        : fallback
  }
}
