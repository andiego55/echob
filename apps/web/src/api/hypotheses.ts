import { apiClient } from './client'

export interface Hypothesis {
  hypothesis_type: string
  label: string
  summary_text: string
  updated_at: string
}

export interface HypothesisDef {
  id: string
  /** SVG-Pfad (24x24-viewBox, currentColor) fuer das Themen-Icon im EchoB-Stil. */
  icon: string
  label: string
  description: string
  /** Erklärende Einstiegsfragen zum Thema (klickbar), um den Dialog einzuleiten. */
  introQuestions: string[]
}

/** Die fünf Hypothesen-Dialoge (id = thread_type; Start-Trigger = `__${id}_start__`). */
export const HYPOTHESES: HypothesisDef[] = [
  {
    id: 'hyp_dynamics', icon: 'M19 4v3.5h-3.5M19.2 12a7.2 7.2 0 11-2.1-5.1', label: 'Beziehungsdynamik & Mechanik',
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
    id: 'hyp_clusterb', icon: 'M12 3.25l8.25 4.6-8.25 4.6-8.25-4.6zM3.75 12.4L12 17l8.25-4.6M3.75 16.6L12 21.2l8.25-4.6', label: 'Persönlichkeitsstruktur (Cluster-B)',
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
    id: 'hyp_attachment', icon: 'M10.4 13.6a3.4 3.4 0 004.8 0l2.9-2.9a3.4 3.4 0 00-4.8-4.8l-1.1 1.1M13.6 10.4a3.4 3.4 0 00-4.8 0l-2.9 2.9a3.4 3.4 0 004.8 4.8l1.1-1.1', label: 'Bindungsmuster',
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
    id: 'hyp_trauma', icon: 'M12 21v-7.5M12 13.5C8.7 13.5 6.8 11.6 6.8 7.3c4 0 5.2 2.1 5.2 6.2zM12 13.5c3.3 0 5.2-1.9 5.2-6.2-4 0-5.2 2.1-5.2 6.2z', label: 'Prägungen & Trauma',
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
    id: 'hyp_own_role', icon: 'M12 12.25a3.6 3.6 0 100-7.2 3.6 3.6 0 000 7.2zM5.8 19.5a6.2 6.2 0 0112.4 0', label: 'Eigener Anteil & Muster',
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
