/**
 * Passwort-Richtlinie (clientseitig): mindestens 8 Zeichen und je mindestens ein
 * Buchstabe, eine Zahl und ein Sonderzeichen. Gibt eine Fehlermeldung zurück –
 * oder null, wenn das Passwort die Richtlinie erfüllt.
 *
 * Hinweis: Clientseitige Prüfung ist nur UX/Backstop. Die serverseitige
 * Durchsetzung erfolgt über die Passwort-Einstellungen im Supabase-Dashboard
 * (Mindestlänge + Zeichenanforderungen).
 */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Das Passwort muss mindestens 8 Zeichen haben.'
  if (!/[A-Za-z]/.test(pw)) return 'Das Passwort muss mindestens einen Buchstaben enthalten.'
  if (!/[0-9]/.test(pw)) return 'Das Passwort muss mindestens eine Zahl enthalten.'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Das Passwort muss mindestens ein Sonderzeichen enthalten.'
  return null
}

export const PASSWORD_HINT = 'Mindestens 8 Zeichen, mit Buchstabe, Zahl und Sonderzeichen.'
