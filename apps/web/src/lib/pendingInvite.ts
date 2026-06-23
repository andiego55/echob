/**
 * Hält eine ausstehende Klient-Einladung über den Auth-/Bestätigungs-Umweg hinweg
 * (localStorage). Wird nach erfolgreichem Login von PendingInviteHandler eingelöst.
 */
const KEY = 'echob_pending_invite'

export interface PendingInvite {
  token?: string
  code?: string
}

export function setPendingInvite(v: PendingInvite): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* localStorage nicht verfügbar – Einladung muss ggf. neu geöffnet werden */
  }
}

export function getPendingInvite(): PendingInvite | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PendingInvite) : null
  } catch {
    return null
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
