// Registry aller Selbsttests + abgeleitete Metadaten.
import type { SelfTest } from './types'
import { beziehungsgesundheit } from './tests/beziehungsgesundheit'
import { belastendeMuster } from './tests/belastende-muster'
import { bindungsstil } from './tests/bindungsstil'
import { eigenerAnteil } from './tests/eigener-anteil'
import { bleibenOderGehen } from './tests/bleiben-oder-gehen'
import { verliereIchMich } from './tests/verliere-ich-mich'
import { streitmuster } from './tests/streitmuster'
import { eifersuchtVertrauen } from './tests/eifersucht-vertrauen'
import { loslassenNachTrennung } from './tests/loslassen-nach-trennung'
import { emotionalerMissbrauch } from './tests/emotionaler-missbrauch'
import { beziehungstrauma } from './tests/beziehungstrauma'
import { liebeskummer } from './tests/liebeskummer'

export const SELF_TESTS: SelfTest[] = [
  beziehungsgesundheit,
  emotionalerMissbrauch,
  beziehungstrauma,
  bleibenOderGehen,
  loslassenNachTrennung,
  liebeskummer,
  belastendeMuster,
  streitmuster,
  eifersuchtVertrauen,
  bindungsstil,
  verliereIchMich,
  eigenerAnteil,
]

const BY_SLUG = new Map(SELF_TESTS.map((t) => [t.slug, t]))
export function getSelfTest(slug: string): SelfTest | undefined {
  return BY_SLUG.get(slug)
}

/** SEO/Prerender-Metadaten je Testseite – wird in lib/seo.ts eingehängt. */
export const SELFTEST_ROUTE_META: Record<string, { title: string; description: string }> = Object.fromEntries(
  SELF_TESTS.map((t) => [`/selbsttests/${t.slug}`, { title: `${t.title} – Selbsttest | EchoB`, description: t.description }]),
)

export * from './types'
export * from './scoring'
