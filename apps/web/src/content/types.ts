// Typen & Konstanten für das Content-System (SEO-/Wissensplattform).
// Die Inhalte selbst liegen als Markdown+Frontmatter unter apps/web/content/.
// Ein Build-Skript (scripts/build-content.mjs) liest sie, validiert das
// Frontmatter und erzeugt src/content/manifest.generated.ts.
//
// WICHTIG: Die Enum-Listen unten sind in scripts/build-content.mjs gespiegelt
// (dort für die Build-Validierung). Bei Änderungen beide Stellen anpassen.

export const CONTENT_TYPES = [
  'topic', // Themenseite (Pillar)
  'problem', // problemorientierte Landingpage
  'glossary', // Begriffsseite
  'guide', // Ratgeber/Blog
  'case-example', // Fallbeispiel
  'comparison', // Vergleich/Einordnung
  'therapy-prep', // Therapie-/Coachingvorbereitung
  'scene', // Beziehungsszene (Ich-Perspektive, fiktiv) – eigene Seite /szenen
] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export const CLUSTERS = [
  'dynamiken', // Belastende Dynamiken
  'bindung', // Bindung & Nähe
  'trennung', // Trennung
  'selbstreflexion', // Selbstreflexion
  'therapie', // Therapie & Coaching
] as const
export type Cluster = (typeof CLUSTERS)[number]

/** Echo-Modi – identisch zu den bestehenden App-Modi (echo_modes). */
export const ECHO_MODES = ['base', 'stabilize', 'clarity', 'radical', 'analysis'] as const
export type EchoMode = (typeof ECHO_MODES)[number]

/** Positionen, an denen die EchoReflectionCard im Artikel erscheinen kann. */
export const CTA_POSITIONS = ['after-intro', 'after-reflection', 'end'] as const
export type CtaPosition = (typeof CTA_POSITIONS)[number]

export interface ContentPerson {
  name: string
  role?: string
}

export interface ContentSource {
  title: string
  url?: string
}

/** Typisierter interner Verlinkungs-Graph (Slugs). */
export interface ContentLinks {
  parent?: string
  children?: string[]
  related?: string[]
  glossary?: string[]
  comparison?: string[]
  case_example?: string[]
  therapy_prep?: string[]
}

/** Konfiguration des Content→Echo-Übergangs. */
export interface ContentEcho {
  mode: EchoMode
  /** Vorsichtige, nicht-diagnostische Einstiegsfrage (Seed für den Echo-Dialog). */
  opening_question: string
  cta_positions?: CtaPosition[]
}

/** Vollständiges Frontmatter, wie es in einer .md-Datei steht. */
export interface ContentFrontmatter {
  type: ContentType
  slug: string
  title: string
  description: string
  cluster: Cluster
  search_intent?: string
  updated: string // ISO-Datum (YYYY-MM-DD)
  draft?: boolean // true = nicht veröffentlicht (aus Routen/Manifest ausgeschlossen)
  author?: ContentPerson
  reviewed_by?: ContentPerson
  sources?: ContentSource[]
  echo: ContentEcho
  profile_modules?: string[]
  scene_tags?: string[]
  safety_tags?: string[]
  links?: ContentLinks
  /** Nur bei type=scene: Erzähl-Perspektive („Aus Lenas Sicht"). */
  perspective?: string
  /** Nur bei type=scene: kuratiertes Zitat für die Übersichtskarte. */
  pull_quote?: string
}

/** Generierte, cross-page verfügbare Metadaten je Seite (ohne Markdown-Body). */
export interface ContentMeta extends ContentFrontmatter {
  url: string // abgeleitet aus type + slug
}

/** type → URL-Präfix (Vergleiche liegen konzeptuell unter /wissen). */
export const URL_PREFIX: Record<ContentType, string> = {
  topic: '/wissen',
  problem: '/hilfe',
  glossary: '/glossar',
  guide: '/ratgeber',
  'case-example': '/fallbeispiele',
  comparison: '/wissen',
  'therapy-prep': '/therapie-vorbereitung',
  scene: '/szenen',
}

/** Öffentliche URL einer Content-Seite. */
export function contentUrl(type: ContentType, slug: string): string {
  return `${URL_PREFIX[type]}/${slug}`
}

/** Anzeige-Label je Cluster (für Hub/Übersichten). */
export const CLUSTER_LABELS: Record<Cluster, string> = {
  dynamiken: 'Belastende Dynamiken',
  bindung: 'Bindung & Nähe',
  trennung: 'Trennung',
  selbstreflexion: 'Selbstreflexion',
  therapie: 'Therapie & Coaching',
}

/** Kurzes Anzeige-Label je Content-Typ (Badge). */
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  topic: 'Thema',
  problem: 'Hilfe',
  glossary: 'Begriff',
  guide: 'Ratgeber',
  'case-example': 'Fallbeispiel',
  comparison: 'Vergleich',
  'therapy-prep': 'Therapie-Vorbereitung',
  scene: 'Szene',
}
