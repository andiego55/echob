// Content-Codegen: liest apps/web/content/**/*.md, validiert das Frontmatter
// (Build-Gate) und erzeugt src/content/manifest.generated.ts.
// Läuft vor `vite build` (siehe package.json) und via `npm run content`.
//
// Konstanten sind aus src/content/types.ts gespiegelt — bei Änderungen dort UND hier anpassen.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const here = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(here, '..')
const contentDir = path.join(webRoot, 'content')
const outFile = path.join(webRoot, 'src', 'content', 'manifest.generated.ts')

const CONTENT_TYPES = ['topic', 'problem', 'glossary', 'guide', 'case-example', 'comparison', 'therapy-prep', 'scene']
const CLUSTERS = ['dynamiken', 'bindung', 'trennung', 'selbstreflexion', 'therapie']
const ECHO_MODES = ['base', 'stabilize', 'clarity', 'radical', 'analysis']
const CTA_POSITIONS = ['after-intro', 'after-reflection', 'end']
const URL_PREFIX = {
  topic: '/wissen', problem: '/hilfe', glossary: '/glossar', guide: '/ratgeber',
  'case-example': '/fallbeispiele', comparison: '/wissen', 'therapy-prep': '/therapie-vorbereitung',
  scene: '/szenen',
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.isFile() && e.name.endsWith('.md')) out.push(p)
  }
  return out
}

/** Entfernt null/undefined rekursiv, damit optionale Felder sauber typisieren. */
function stripEmpty(o) {
  if (Array.isArray(o)) return o.map(stripEmpty)
  if (o && typeof o === 'object') {
    const r = {}
    for (const [k, v] of Object.entries(o)) {
      if (v === null || v === undefined) continue
      r[k] = stripEmpty(v)
    }
    return r
  }
  return o
}

const errors = []
const pages = []

for (const file of walk(contentDir)) {
  const rel = path.relative(webRoot, file)
  const err = (m) => errors.push(`${rel}: ${m}`)
  let fm
  try {
    fm = matter(fs.readFileSync(file, 'utf-8')).data
  } catch (e) {
    err(`Frontmatter nicht parsebar: ${e.message}`)
    continue
  }

  if (!CONTENT_TYPES.includes(fm.type)) err(`type ungültig: ${JSON.stringify(fm.type)}`)
  const base = path.basename(file, '.md')
  if (!fm.slug) err('slug fehlt')
  else {
    if (fm.slug !== base) err(`slug ("${fm.slug}") ≠ Dateiname ("${base}")`)
    if (!SLUG_RE.test(String(fm.slug).replace(/^_/, ''))) err(`slug ungültig (nur a-z0-9-): ${fm.slug}`)
  }
  if (!fm.title) err('title fehlt')
  if (!fm.description) err('description fehlt')
  if (!CLUSTERS.includes(fm.cluster)) err(`cluster ungültig: ${JSON.stringify(fm.cluster)}`)
  if (fm.updated instanceof Date) fm.updated = fm.updated.toISOString().slice(0, 10)
  if (!DATE_RE.test(String(fm.updated || ''))) err(`updated fehlt/ungültig (YYYY-MM-DD): ${fm.updated}`)
  if (!fm.echo || typeof fm.echo !== 'object') err('echo-Block fehlt')
  else {
    if (!ECHO_MODES.includes(fm.echo.mode)) err(`echo.mode ungültig: ${JSON.stringify(fm.echo.mode)}`)
    if (!fm.echo.opening_question || String(fm.echo.opening_question).trim().length < 10)
      err('echo.opening_question fehlt/zu kurz')
    for (const pos of fm.echo.cta_positions || [])
      if (!CTA_POSITIONS.includes(pos)) err(`echo.cta_positions ungültig: ${pos}`)
  }
  // Veröffentlichungs-Gate (YMYL / fachliche Prüfung Pflicht):
  if (!fm.draft && !fm.reviewed_by?.name)
    err('reviewed_by fehlt — fachliche Prüfung ist Pflicht zur Veröffentlichung')

  pages.push({ fm, rel })
}

// Slugs müssen global eindeutig sein (bodies.ts mappt per Slug).
const slugSeen = {}
for (const { fm, rel } of pages) {
  if (!fm.slug) continue
  ;(slugSeen[fm.slug] ??= []).push(rel)
}
for (const [slug, files] of Object.entries(slugSeen))
  if (files.length > 1) errors.push(`slug "${slug}" mehrfach vergeben: ${files.join(', ')}`)

// Cross-Link-Validierung: interne Links müssen auf veröffentlichte Slugs zeigen.
const published = pages.filter((p) => !p.fm.draft)
const known = new Set(published.map((p) => p.fm.slug))
for (const { fm, rel } of published) {
  const l = fm.links || {}
  const refs = [l.parent, ...(l.children || []), ...(l.related || []), ...(l.glossary || []),
    ...(l.comparison || []), ...(l.case_example || []), ...(l.therapy_prep || [])].filter(Boolean)
  for (const r of refs)
    if (!known.has(r)) errors.push(`${rel}: interner Link auf unbekannten/nicht-veröffentlichten slug "${r}"`)
}

if (errors.length) {
  console.error(`\n✗ Content-Validierung fehlgeschlagen (${errors.length}):`)
  for (const e of errors) console.error(`  • ${e}`)
  process.exit(1)
}

const manifest = published
  .map(({ fm }) => stripEmpty({ ...fm, url: `${URL_PREFIX[fm.type]}/${fm.slug}` }))
  .sort((a, b) => a.url.localeCompare(b.url))

const routeMeta = {}
for (const m of manifest) routeMeta[m.url] = { title: m.title, description: m.description }

const out =
  '// AUTO-GENERIERT von scripts/build-content.mjs — NICHT bearbeiten.\n' +
  '// Neu erzeugen mit: npm run content\n' +
  "import type { ContentMeta } from './types'\n\n" +
  `export const CONTENT_MANIFEST: ContentMeta[] = ${JSON.stringify(manifest, null, 2)}\n\n` +
  `export const CONTENT_ROUTE_META: Record<string, { title: string; description: string }> = ${JSON.stringify(routeMeta, null, 2)}\n`

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, out, 'utf-8')
console.log(
  `✓ Content: ${manifest.length} veröffentlicht, ${pages.length - published.length} Entwurf/Entwürfe. ` +
    `Manifest → ${path.relative(webRoot, outFile)}`,
)
