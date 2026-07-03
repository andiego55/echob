// Prerendering der öffentlichen Seiten zu statischem HTML.
// Läuft nach `vite build` (Client) + `vite build --ssr` (Server-Bundle):
//   1. liest die gebaute dist/index.html als Template (enthält CSS-/JS-Links),
//   2. rendert je öffentliche Route den Seiteninhalt (react-dom/server),
//   3. injiziert Inhalt + route-spezifischen <head> (Title/Description/Canonical/OG),
//   4. schreibt dist/<route>/index.html.
// Nutzen: JS-lose Crawler (Social-Unfurler, KI-Bots, rohes erst-HTML) sehen echten
// Inhalt statt eines leeren <div>. Im Browser übernimmt danach die SPA (createRoot).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(here, '..') // apps/web
const dist = path.join(webRoot, 'dist')
const ssrEntry = path.join(webRoot, 'dist-ssr', 'entry-server.js')

const escAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8')
if (!template.includes('<div id="root" class="h-full"></div>')) {
  throw new Error('Prerender: erwarteter Root-Container in dist/index.html nicht gefunden.')
}

const { renderPage, PUBLIC_ROUTES } = await import(pathToFileURL(ssrEntry).href)

let count = 0
for (const route of PUBLIC_ROUTES) {
  const { appHtml, head } = renderPage(route)
  if (appHtml.length < 400) {
    console.warn(`  ! ${route}: nur ${appHtml.length} Bytes gerendert – bitte prüfen.`)
  }

  const html = template
    .replace('<div id="root" class="h-full"></div>', `<div id="root" class="h-full">${appHtml}</div>`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(head.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(head.description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escAttr(head.url)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(head.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(head.description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escAttr(head.url)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(head.title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(head.description)}$2`)

  // Flache Dateien (/fachpersonen -> fachpersonen.html), damit Cloudflare die
  // Seite ohne Trailing-Slash-Redirect ausliefert – passend zu canonical und
  // den internen Links (kein /foo -> /foo/ 307, keine widersprüchlichen Signale).
  const outFile = route === '/' ? path.join(dist, 'index.html') : path.join(dist, `${route.slice(1)}.html`)
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, html, 'utf-8')
  count++
  console.log(`  ${route}  ->  ${path.relative(dist, outFile)}  (${appHtml.length} B)`)
}

// Server-Bundle nicht mit ausliefern.
fs.rmSync(path.join(webRoot, 'dist-ssr'), { recursive: true, force: true })

console.log(`✓ Prerender: ${count} Seiten statisch erzeugt.`)
