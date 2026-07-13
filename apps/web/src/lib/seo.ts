// Zentrale Titel/Descriptions je öffentliche Route.
// Wird von <RouteSeo/> beim Navigieren angewandt (Client-Rendering).
// Nutzen: korrekte Tab-/Bookmark-Titel, Titel/Description je Seite für
// JS-fähige Crawler (u. a. Googlebot) und konsistente Canonicals/OG bei
// In-App-Navigation. Für JS-lose Crawler greift zusätzlich der Prerender-
// bzw. noscript-Fallback.

import { CONTENT_ROUTE_META } from '@/content/manifest.generated'

const SITE = 'https://echo-b.de'

const DEFAULT_TITLE = 'EchoB – Beziehungsmuster erkennen | Erkenne, was sich wiederholt.'
const DEFAULT_DESC =
  'EchoB hilft dir, belastende Beziehungssituationen zu sortieren und wiederkehrende Muster sichtbar zu machen – privat, DSGVO-konform, mit KI-Unterstützung. Kein Therapieersatz.'

export type PageMeta = { title: string; description: string }

/** Exakter Pfad → Metadaten. Nur statische, öffentliche Routen. */
export const ROUTE_META: Record<string, PageMeta> = {
  '/': { title: DEFAULT_TITLE, description: DEFAULT_DESC },

  '/fachpersonen': {
    title: 'Für Fachpersonen – EchoB',
    description:
      'EchoB für Therapie, Beratung und Coaching: ein Arbeitsplatz mit ausschließlich freigegebenem Fallkontext, KI-gestützten Berichten und Sitzungsnotizen – streng einwilligungsbasiert.',
  },
  '/coaching': {
    title: 'Coaching mit EchoB – Erstgespräch anfragen',
    description:
      'Begleitetes Coaching rund um belastende Beziehungssituationen, strukturiert mit EchoB. Fordere unverbindlich ein Erstgespräch an – niedrigschwellig und vertraulich.',
  },
  '/ueber': {
    title: 'Über EchoB',
    description:
      'Wer hinter EchoB steht und warum es EchoB gibt: ein Werkzeug, um wiederkehrende Beziehungsmuster zu verstehen. Kein Ersatz für Therapie oder Beratung.',
  },
  '/ueber/gruender': {
    title: 'Gründer-Interview – EchoB',
    description:
      'Ein Gespräch mit dem Gründer von EchoB: Motivation, Haltung und was EchoB sein will – und was bewusst nicht.',
  },
  '/ueber/team': {
    title: 'Team – EchoB',
    description: 'Die Menschen hinter EchoB und die Haltung, mit der wir arbeiten.',
  },

  '/wissen': {
    title: 'Wissen: Beziehungsmuster, Bindung & Kommunikation – EchoB',
    description:
      'Verständliche Artikel zu Beziehungsmustern, Bindungsstilen, Kommunikation, Emotionsregulation und Grenzen – fundiert, alltagsnah und ohne Diagnose.',
  },
  '/wissen/bindungsstile': {
    title: 'Bindungsstile verstehen – EchoB Wissen',
    description:
      'Sicher, ängstlich, vermeidend: Wie Bindungsstile Beziehungen prägen – und was das für deinen Alltag bedeutet.',
  },
  '/wissen/kommunikation-konflikte': {
    title: 'Kommunikation & Konflikte – EchoB Wissen',
    description:
      'Wie Konflikte eskalieren und wie Kommunikation gelingt: Muster erkennen, statt sich im Streit zu verlieren.',
  },
  '/wissen/persoenlichkeit-verhalten': {
    title: 'Persönlichkeit & Verhalten – EchoB Wissen',
    description:
      'Wie Persönlichkeit das Verhalten in Beziehungen prägt – verständlich erklärt, ohne Menschen zu etikettieren.',
  },
  '/wissen/emotionsregulation': {
    title: 'Emotionsregulation – EchoB Wissen',
    description:
      'Wie du mit starken Gefühlen in Beziehungen umgehst und was Emotionsregulation im Alltag konkret bedeutet.',
  },
  '/wissen/beobachtung-gefuehl': {
    title: 'Beobachtung & Gefühl trennen – EchoB Wissen',
    description:
      'Warum es hilft, Beobachtung von Bewertung und Gefühl zu trennen – und wie du das Schritt für Schritt übst.',
  },
  '/wissen/grenzen-setzen': {
    title: 'Grenzen setzen – EchoB Wissen',
    description:
      'Wie du eigene Grenzen erkennst und wahrst – klar und respektvoll, ohne die Beziehung zu kappen.',
  },
  '/wissen/professionelle-hilfe': {
    title: 'Wann professionelle Hilfe? – EchoB Wissen',
    description:
      'Woran du erkennst, dass professionelle Unterstützung sinnvoll ist – und wie du die passende findest.',
  },
  '/wissen/krisentelefone': {
    title: 'Krisentelefone & Soforthilfe – EchoB Wissen',
    description:
      'Wichtige Anlaufstellen und Krisentelefone für akute Notlagen – schnelle Hilfe im Überblick.',
  },

  '/blog': {
    title: 'Blog – EchoB',
    description:
      'Beiträge rund um Beziehungsmuster, Reflexion und den bewussten Umgang mit schwierigen Situationen.',
  },
  '/blog/beziehungsmuster': {
    title: 'Beziehungsmuster erkennen – EchoB Blog',
    description:
      'Wie sich wiederkehrende Muster in Beziehungen zeigen – und wie du beginnst, sie zu verstehen.',
  },
  '/blog/beobachtung-gefuehl': {
    title: 'Beobachtung und Gefühl – EchoB Blog',
    description:
      'Warum die Trennung von Beobachtung und Gefühl der erste Schritt zu mehr Klarheit ist.',
  },
  '/blog/professionelle-hilfe': {
    title: 'Professionelle Hilfe finden – EchoB Blog',
    description: 'Wann und wie du dir professionelle Unterstützung suchst – ein Wegweiser.',
  },
  '/blog/krisentelefone': {
    title: 'Krisentelefone – EchoB Blog',
    description: 'Anlaufstellen für akute Krisen: die wichtigsten Nummern und wie sie helfen.',
  },

  '/impressum': {
    title: 'Impressum – EchoB',
    description: 'Impressum und Anbieterkennzeichnung von EchoB.',
  },
  '/datenschutz': {
    title: 'Datenschutz – EchoB',
    description:
      'Wie EchoB deine Daten schützt: DSGVO-konform, Server in der EU, verschlüsselt. Alle Informationen zur Datenverarbeitung.',
  },
  '/agb': {
    title: 'AGB – EchoB',
    description: 'Allgemeine Geschäftsbedingungen von EchoB.',
  },
  '/widerruf': {
    title: 'Widerrufsbelehrung – EchoB',
    description: 'Widerrufsrecht und Widerrufsbelehrung für Verträge mit EchoB.',
  },
  '/auth': {
    title: 'Anmelden oder registrieren – EchoB',
    description: 'Melde dich bei EchoB an oder starte deinen kostenlosen Testzugang.',
  },
}

/** Alle öffentlichen Metadaten: statische Routen + generierte Content-Seiten. */
const ALL_META: Record<string, PageMeta> = { ...ROUTE_META, ...CONTENT_ROUTE_META }

/** Login-/App-Bereiche sollen nicht indexiert werden. */
const NOINDEX_RE = /^\/(app|professional|auth|pseudonym|einladung|reflektieren)(\/|$)/

export type Head = { title: string; description: string; url: string; robots: string }

/** Reine Metadaten je Pfad – ohne DOM. Von Client (applyHead) und Prerender genutzt. */
export function headFor(pathname: string): Head {
  const meta = ALL_META[pathname]
  return {
    title: meta?.title ?? DEFAULT_TITLE,
    description: meta?.description ?? DEFAULT_DESC,
    url: SITE + (pathname === '/' ? '/' : pathname),
    robots: NOINDEX_RE.test(pathname) ? 'noindex,nofollow' : 'index,follow',
  }
}

/** Öffentliche, indexierbare Routen – Grundlage fürs Prerendering (ohne Login-Bereiche). */
export const PUBLIC_ROUTES = Object.keys(ALL_META).filter((p) => !NOINDEX_RE.test(p))

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Setzt Titel/Description/Canonical/OG/robots passend zum Pfad. */
export function applyHead(pathname: string) {
  const { title, description, url, robots } = headFor(pathname)

  document.title = title
  upsertMeta('name', 'description', description)
  upsertMeta('name', 'robots', robots)
  upsertLink('canonical', url)
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', description)
}
