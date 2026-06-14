import { apiClient } from './client'

export interface Hypothesis {
  hypothesis_type: string
  label: string
  summary_text: string
  updated_at: string
}

export interface HypothesisDef {
  id: string
  icon: string
  label: string
  description: string
  /** Erklärende Einstiegsfragen zum Thema (klickbar), um den Dialog einzuleiten. */
  introQuestions: string[]
}

/** Die fünf Hypothesen-Dialoge (id = thread_type; Start-Trigger = `__${id}_start__`). */
export const HYPOTHESES: HypothesisDef[] = [
  {
    id: 'hyp_dynamics', icon: '🔄', label: 'Beziehungsdynamik & Mechanik',
    description: 'Welcher wiederkehrende Kreislauf treibt die Interaktion an – und wo ließe er sich unterbrechen?',
    introQuestions: [
      'Was ist ein Verfolger-Distanzierer-Muster?',
      'Was bedeutet das Drama-Dreieck (Opfer–Retter–Ankläger)?',
      'Wie entsteht ein Eskalationskreislauf in Konflikten?',
      'Was hält destruktive Beziehungsmuster am Laufen?',
      'Wie lässt sich ein Konflikt-Kreislauf unterbrechen?',
    ],
  },
  {
    id: 'hyp_clusterb', icon: '🧩', label: 'Persönlichkeitsstruktur (Cluster-B)',
    description: 'Inwieweit ähneln die Züge der Fallperson dem Cluster-B-Spektrum? Tastend, keine Diagnose.',
    introQuestions: [
      'Was sind die Cluster-B-Persönlichkeitsstörungen?',
      'Welche Verhaltensweisen zeigt eine Person mit Narzissmus typischerweise?',
      'Welche Formen von Narzissmus werden unterschieden?',
      'Was ist die Borderline-Persönlichkeitsstörung?',
      'Worin unterscheiden sich Narzissmus und Borderline?',
      'Was bedeutet eine antisoziale (dissoziale) Tendenz?',
      'Wie unterscheide ich schwierige Züge von einer echten Störung?',
    ],
  },
  {
    id: 'hyp_attachment', icon: '🔗', label: 'Bindungsmuster',
    description: 'Welche Bindungsstile zeigen sich bei beiden – und wie greifen sie ineinander?',
    introQuestions: [
      'Welche Bindungsstile gibt es?',
      'Was kennzeichnet einen ängstlichen Bindungsstil?',
      'Was kennzeichnet einen vermeidenden Bindungsstil?',
      'Was ist ein desorganisierter Bindungsstil?',
      'Warum ziehen sich ängstliche und vermeidende Menschen oft an?',
      'Kann sich ein Bindungsstil im Laufe des Lebens verändern?',
    ],
  },
  {
    id: 'hyp_trauma', icon: '🌱', label: 'Prägungen & Trauma',
    description: 'Welche früheren Erfahrungen wirken möglicherweise bis heute nach?',
    introQuestions: [
      'Was bedeutet „Trauma" eigentlich?',
      'Was ist der Unterschied zwischen Schock- und Entwicklungstrauma?',
      'Was sind Trigger und wie wirken sie?',
      'Was ist eine Reinszenierung (Wiederholung alter Muster)?',
      'Wie können frühe Erfahrungen heutige Beziehungen prägen?',
      'Wann ist professionelle Trauma-Hilfe sinnvoll?',
    ],
  },
  {
    id: 'hyp_own_role', icon: '🪞', label: 'Eigener Anteil & Muster',
    description: 'Welche eigenen Muster tragen zur Dynamik bei – und wo liegt dein Hebel?',
    introQuestions: [
      'Was heißt „eigener Anteil" – und was nicht?',
      'Was sind typische Muster von Co-Abhängigkeit?',
      'Was bedeutet „Fawning" (Über-Anpassung als Schutz)?',
      'Wie erkenne ich meine eigenen wunden Punkte?',
      'Wie setze ich Grenzen, ohne mich schuldig zu fühlen?',
      'Wie unterscheide ich Selbstreflexion von Selbstbeschuldigung?',
    ],
  },
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
