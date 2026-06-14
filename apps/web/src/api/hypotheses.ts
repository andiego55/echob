import { apiClient } from './client'

export interface Hypothesis {
  hypothesis_type: string
  label: string
  summary_text: string
  updated_at: string
}

/** Die fünf Hypothesen-Dialoge (id = thread_type; Start-Trigger = `__${id}_start__`). */
export const HYPOTHESES: { id: string; icon: string; label: string; description: string }[] = [
  { id: 'hyp_dynamics',   icon: '🔄', label: 'Beziehungsdynamik & Mechanik',          description: 'Welcher wiederkehrende Kreislauf treibt die Interaktion an – und wo ließe er sich unterbrechen?' },
  { id: 'hyp_clusterb',   icon: '🧩', label: 'Persönlichkeitsstruktur (Cluster-B)',   description: 'Inwieweit ähneln die Züge der Fallperson dem Cluster-B-Spektrum? Tastend, keine Diagnose.' },
  { id: 'hyp_attachment', icon: '🔗', label: 'Bindungsmuster',                        description: 'Welche Bindungsstile zeigen sich bei beiden – und wie greifen sie ineinander?' },
  { id: 'hyp_trauma',     icon: '🌱', label: 'Prägungen & Trauma',                    description: 'Welche früheren Erfahrungen wirken möglicherweise bis heute nach?' },
  { id: 'hyp_own_role',   icon: '🪞', label: 'Eigener Anteil & Muster',               description: 'Welche eigenen Muster tragen zur Dynamik bei – und wo liegt dein Hebel?' },
]

export const hypothesesApi = {
  list: (caseId: string) =>
    apiClient.get<Hypothesis[]>(`/cases/${caseId}/hypotheses`).then(r => r.data),

  save: (caseId: string, hypothesis_type: string, summary_text: string) =>
    apiClient.put<Hypothesis>(`/cases/${caseId}/hypotheses`, { hypothesis_type, summary_text }).then(r => r.data),

  /** Erzeugt (ohne zu speichern) eine Arbeitshypothese aus dem Dialogverlauf. */
  generate: (caseId: string, hypothesis_type: string) =>
    apiClient.post<{ summary: string }>(`/cases/${caseId}/hypotheses/generate`, { hypothesis_type }).then(r => r.data),

  remove: (caseId: string, hypothesis_type: string) =>
    apiClient.delete(`/cases/${caseId}/hypotheses/${hypothesis_type}`).then(r => r.data),
}
