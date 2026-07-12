// Lädt die Markdown-Bodies der Content-Seiten. Bewusst EAGER (synchron), damit
// das SSR-Prerendering (renderToString, kein await) den echten Inhalt rendert –
// das ist der ganze SEO-Sinn. Frontmatter kommt aus dem generierten Manifest;
// hier wird nur der Body (nach dem Frontmatter) geliefert.
//
// Skalierung: bei sehr vielen Seiten kann das später auf lazy + Prerender-aus-
// Datei umgestellt werden. Für den MVP (Dutzende Seiten) ist eager unkritisch.

const RAW = import.meta.glob('../../content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Entfernt den Frontmatter-Block (--- … ---) und liefert den Markdown-Body. */
function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---')) return raw
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return raw
  return raw.slice(end + 4).replace(/^\r?\n/, '')
}

// slug (Dateiname ohne .md) → Body. Slugs sind global eindeutig (Build erzwingt es).
const BY_SLUG: Record<string, string> = {}
for (const [filePath, raw] of Object.entries(RAW)) {
  const slug = filePath.split('/').pop()!.replace(/\.md$/, '')
  BY_SLUG[slug] = stripFrontmatter(raw)
}

export function getBody(slug: string): string {
  return BY_SLUG[slug] ?? ''
}
