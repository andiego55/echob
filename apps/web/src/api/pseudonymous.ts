import { apiClient } from './client'

/** Pseudonyme Anmeldung über eine Fachperson (kein Klarname bei EchoB). */
export interface PseudonymousRegisterResult {
  login_email: string
  recovery_code: string
  professional_display_name: string | null
}

export interface PseudonymousRecoverResult {
  login_email: string
  recovery_code: string
}

export const pseudonymousApi = {
  /** Legt ein pseudonymes Konto an (an eine gültige Einladung gebunden). */
  register: (data: { token?: string; code?: string; handle: string; password: string }) =>
    apiClient.post<PseudonymousRegisterResult>('/pseudonymous/register', data).then(r => r.data),

  /** Setzt das Passwort über den Wiederherstellungs-Code zurück (rotiert ihn). */
  recover: (data: { handle: string; recovery_code: string; new_password: string }) =>
    apiClient.post<PseudonymousRecoverResult>('/pseudonymous/recover', data).then(r => r.data),
}
