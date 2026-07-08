// Übersetzt API-Fehlercodes in nutzerfreundliche Meldungen.

const ERROR_TEXTS: Record<string, string> = {
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

export function apiErrorText(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string' && ERROR_TEXTS[detail]) return ERROR_TEXTS[detail]
  return fallback
}
