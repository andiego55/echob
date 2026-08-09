// Taxonomie fürs Fachpersonen-Verzeichnis. Gespiegelt aus
// services/api/app/core/directory_taxonomy.py — bei Änderungen beide anpassen.
// Die Profession-Slugs sind zugleich URL-Präfixe der SEO-Regionalseiten
// (/paartherapie/kassel …).

export const PROFESSIONS: { slug: string; label: string }[] = [
  { slug: 'paartherapie', label: 'Paartherapie' },
  { slug: 'paarberatung', label: 'Paar- & Eheberatung' },
  { slug: 'psychotherapie', label: 'Psychotherapie' },
  { slug: 'schematherapie', label: 'Schematherapie' },
  { slug: 'systemische-therapie', label: 'Systemische Therapie' },
  { slug: 'verhaltenstherapie', label: 'Verhaltenstherapie' },
  { slug: 'traumatherapie', label: 'Traumatherapie' },
  { slug: 'sexualtherapie', label: 'Sexualtherapie' },
  { slug: 'familientherapie', label: 'Familientherapie' },
  { slug: 'coaching', label: 'Coaching' },
  { slug: 'lebensberatung', label: 'Lebensberatung' },
  { slug: 'mediation', label: 'Mediation' },
]

const PROF_LABEL = Object.fromEntries(PROFESSIONS.map((p) => [p.slug, p.label]))

export function professionLabel(slug: string | null | undefined): string {
  if (!slug) return ''
  return PROF_LABEL[slug] ?? slug.replace(/-/g, ' ')
}

export function professionLabels(slugs: string[] | null | undefined): string[] {
  return (slugs ?? []).map(professionLabel)
}

export const FORMATS: { slug: string; label: string }[] = [
  { slug: 'praxis', label: 'Vor Ort (Praxis)' },
  { slug: 'online', label: 'Online' },
  { slug: 'telefon', label: 'Telefon' },
]

const FORMAT_LABEL = Object.fromEntries(FORMATS.map((f) => [f.slug, f.label]))

export function formatLabel(slug: string): string {
  return FORMAT_LABEL[slug] ?? slug
}

/** Kurzes Vertrauens-Label je Stufe (nutzerseitig; „researched" bleibt intern). */
export function tierBadge(tier: string, verified: boolean): { label: string; kind: 'partner' | 'verified' } | null {
  if (tier === 'partner') return { label: 'EchoB-Partner', kind: 'partner' }
  if (verified) return { label: 'Verifiziert', kind: 'verified' }
  return null
}
