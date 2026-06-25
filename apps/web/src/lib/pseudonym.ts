/**
 * Pseudonyme Anmeldung: das Pseudonym (Handle) wird intern auf eine synthetische
 * E-Mail abgebildet, mit der sich der/die Nutzer:in bei Supabase anmeldet. EchoB
 * speichert so keinen Klarnamen. MUSS mit dem Backend übereinstimmen
 * (services/api/app/services/pseudonymous_service.py).
 */
export const PSEUDONYM_EMAIL_DOMAIN = 'pseudonym.echo-b.de'

/** Pseudonym → synthetische Login-E-Mail (deterministisch). */
export function handleToEmail(handle: string): string {
  return `${handle.trim().toLowerCase()}@${PSEUDONYM_EMAIL_DOMAIN}`
}

/** Erlaubtes Pseudonym-Format (Spiegel der Backend-Regel). */
export const HANDLE_RE = /^[a-z0-9._-]{3,30}$/

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle.trim().toLowerCase())
}
