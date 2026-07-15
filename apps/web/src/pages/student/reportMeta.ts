import type { ReportType } from '@/types'

// Farbige Typ-Badges (wie im Nutzer-Berichtsbereich).
export const TYPE_META: Record<string, { color: string; bg: string; border: string }> = {
  short:         { color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200' },
  pattern:       { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  coaching_prep: { color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  therapy_prep:  { color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  progress:      { color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  partner:       { color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
}

// Für die Ausbildung relevante Berichtstypen (Analyse/Fachdoku – ohne „Brief ans Gegenüber").
export const REPORT_TYPES: { type: ReportType; label: string; tagline: string; desc: string; audience: string; sections: number }[] = [
  {
    type: 'short', label: 'Kurzbericht', tagline: 'Kompakte Orientierung auf einen Blick',
    desc: 'Die wesentlichen Muster und ein nächster Schritt – verdichtet auf das Wichtigste.',
    audience: 'Schneller Überblick', sections: 3,
  },
  {
    type: 'pattern', label: 'Musterbericht', tagline: 'Tiefe Analyse der Beziehungsdynamiken',
    desc: 'Umfassende Auswertung aller Szenen und Muster – die ausführliche Fallanalyse.',
    audience: 'Fallkonzeption', sections: 9,
  },
  {
    type: 'therapy_prep', label: 'Therapie- & Beratungsvorbereitung', tagline: 'Klinische Dokumentation im Fachvokabular',
    desc: 'Strukturierte Erstdokumentation mit Belastungsverlauf und Ressourceneinschätzung.',
    audience: 'Übung: Fachdoku', sections: 9,
  },
  {
    type: 'coaching_prep', label: 'Coaching-Vorbereitung', tagline: 'Anliegen, Ziele und Ressourcen strukturiert',
    desc: 'Bereitet Anliegen und Ressourcen so auf, dass ein Coaching-Gespräch produktiv starten kann.',
    audience: 'Übung: Coaching', sections: 6,
  },
]
