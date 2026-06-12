// Übersetzt API-Fehlercodes in nutzerfreundliche Meldungen.

const ERROR_TEXTS: Record<string, string> = {
  ECHO_LIMIT_REACHED:
    'Dein Echo-Kontingent für die Entwicklungsphase ist aufgebraucht. ' +
    'Melde dich unter info@echo-b.de, wenn du weiter testen möchtest.',
  TRIAL_EXPIRED: 'Dein Testzeitraum ist abgelaufen. Wähle einen Plan, um fortzufahren.',
  TRIAL_SCENE_LIMIT: 'Im Testzugang sind maximal 5 Szenen möglich.',
  TRIAL_CASE_LIMIT: 'Im Testzugang ist maximal 1 Fall möglich.',
}

export function apiErrorText(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string' && ERROR_TEXTS[detail]) return ERROR_TEXTS[detail]
  return fallback
}
