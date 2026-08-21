import { AxiosError } from 'axios'

/**
 * Fehlermeldung für die Oberfläche.
 *
 * Ein fehlgeschlagener Request darf nie stillschweigend verpuffen – wer klickt und nichts
 * sieht, hält die App für kaputt. Wenn der Server eine eigene Begründung mitschickt
 * (`detail`), gewinnt sie; sonst gibt es eine verständliche Erklärung nach Statuscode.
 */
/**
 * Fehler-CODES der API, die nie so angezeigt werden dürfen, wie sie kommen.
 *
 * Diese Tabelle lag bis zur Angleichung in `utils/apiError.ts` und wurde nur vom
 * Nutzerbereich benutzt. Der Paarraum hatte seinen eigenen Übersetzer ohne sie — und
 * sieben Paar-Router rufen `enforce_echo_prompt_limit` auf. Wer im Paarraum an sein
 * Kontingent stieß, las deshalb wörtlich „ECHO_LIMIT_REACHED“.
 */
export const CODE_TEXTS: Record<string, string> = {
  ECHO_LIMIT_REACHED:
    'Dein Echo-Kontingent ist gerade erschöpft. Bitte versuche es etwas später noch einmal. ' +
    'Wenn du dauerhaft mehr brauchst, melde dich unter kontakt@echo-b.de.',
  REPORT_LIMIT_REACHED:
    'Du hast dein Monatskontingent an Berichten erreicht. ' +
    'Es setzt sich zu Beginn des nächsten Monats zurück. Fragen? kontakt@echo-b.de',
  SCALE_LIMIT_REACHED:
    'Du hast dein Monatskontingent an Skalen-Analysen erreicht. ' +
    'Es setzt sich zu Beginn des nächsten Monats zurück. Fragen? kontakt@echo-b.de',
  TRIAL_EXPIRED: 'Dein Testzeitraum ist abgelaufen. Wähle einen Plan, um fortzufahren.',
  TRIAL_SCENE_LIMIT: 'Im Testzugang sind maximal 5 Szenen möglich.',
  TRIAL_CASE_LIMIT: 'Im Testzugang ist maximal 1 Fall möglich.',
}

/** Standardtexte des Frameworks – tragen keine Information, die wir zeigen wollen. */
const GENERIC_DETAILS = new Set([
  'Not Found', 'Internal Server Error', 'Method Not Allowed',
  'Unauthorized', 'Forbidden', 'Unprocessable Entity', 'Bad Request',
])

export function apiErrorMessage(err: unknown, fallback = 'Das hat leider nicht geklappt.'): string {
  const ax = err as AxiosError<{ detail?: string }> | undefined

  if (ax?.code === 'ERR_NETWORK' || ax?.message === 'Network Error') {
    return 'Keine Verbindung zum Server. Bist du online?'
  }

  const status = ax?.response?.status
  const detail = ax?.response?.data?.detail

  // Ein bekannter Code zuerst: Er ist für Maschinen geschrieben, nicht für Menschen.
  if (typeof detail === 'string' && CODE_TEXTS[detail]) return CODE_TEXTS[detail]

  // Nur eine ECHTE Begründung gewinnt. FastAPIs Standardtexte („Not Found“ bei einer
  // unbekannten Route) sagen der lesenden Person nichts – da ist unsere Erklärung besser.
  if (typeof detail === 'string' && detail.trim() && !GENERIC_DETAILS.has(detail.trim())) {
    return detail
  }

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
