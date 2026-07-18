// Schlagwort-Taxonomie für die Beziehungsszenen (/szenen).
// Tags stehen als Slugs im Frontmatter (scene_tags). Hier: hübsche Anzeige-Labels
// (Umlaute/Eigennamen, die eine reine Title-Case-Ableitung nicht trifft) plus
// eine kuratierte Reihenfolge für die Filterleiste. Neue Tags brauchen keinen
// Eintrag – dann greift die automatische Ableitung (Bindestrich → Leerzeichen,
// Wörter groß). Nur wo das falsch aussieht (Nähe, Love Bombing …) ein Override.

const SCENE_TAG_LABELS: Record<string, string> = {
  narzissmus: 'Narzissmus',
  'verdeckter-narzissmus': 'Verdeckter Narzissmus',
  'grandioser-narzissmus': 'Grandioser Narzissmus',
  'idealisierung-abwertung': 'Idealisierung & Abwertung',
  'love-bombing': 'Love Bombing',
  gaslighting: 'Gaslighting',
  schuldumkehr: 'Schuldumkehr',
  realitaetsverdrehung: 'Realitätsverdrehung',
  'silent-treatment': 'Silent Treatment',
  'schweigen-als-strafe': 'Schweigen als Strafe',
  'passiv-aggressiv': 'Passiv-aggressives Verhalten',
  'naehe-distanz': 'Nähe-Distanz',
  bindungsangst: 'Bindungsangst',
  verlustangst: 'Verlustangst',
  'push-pull': 'Push-Pull-Dynamik',
  'emotionale-vernachlaessigung': 'Emotionale Vernachlässigung',
  borderline: 'Borderline',
  kontrolle: 'Kontrolle',
  eifersucht: 'Eifersucht',
  misstrauen: 'Misstrauen',
  grenzverletzung: 'Grenzverletzung',
  isolation: 'Isolation',
  selbstzweifel: 'Selbstzweifel',
  schuldgefuehle: 'Schuldgefühle',
  erschoepfung: 'Erschöpfung',
  'einsamkeit-zu-zweit': 'Einsamkeit zu zweit',
  'sich-klein-fuehlen': 'Sich klein fühlen',
  'auf-eierschalen-gehen': 'Auf Eierschalen gehen',
  rueckzug: 'Rückzug',
  entwertung: 'Entwertung',
  'wiederkehrendes-muster': 'Wiederkehrendes Muster',
}

/** Kuratierte Reihenfolge der Filter-Chips (wichtigste zuerst). */
export const SCENE_TAG_ORDER: string[] = [
  'narzissmus',
  'verdeckter-narzissmus',
  'grandioser-narzissmus',
  'gaslighting',
  'love-bombing',
  'idealisierung-abwertung',
  'entwertung',
  'schuldumkehr',
  'silent-treatment',
  'passiv-aggressiv',
  'naehe-distanz',
  'push-pull',
  'bindungsangst',
  'verlustangst',
  'borderline',
  'emotionale-vernachlaessigung',
  'einsamkeit-zu-zweit',
  'kontrolle',
  'eifersucht',
  'misstrauen',
  'grenzverletzung',
  'isolation',
  'auf-eierschalen-gehen',
  'selbstzweifel',
  'schuldgefuehle',
  'sich-klein-fuehlen',
  'erschoepfung',
  'rueckzug',
  'wiederkehrendes-muster',
]

/** Anzeige-Label eines Tag-Slugs (Override oder abgeleitet aus dem Slug). */
export function sceneTagLabel(slug: string): string {
  const known = SCENE_TAG_LABELS[slug]
  if (known) return known
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Sortiert eine Menge vorhandener Tags nach der kuratierten Reihenfolge. */
export function orderSceneTags(tags: Iterable<string>): string[] {
  const set = new Set(tags)
  const ordered = SCENE_TAG_ORDER.filter((t) => set.has(t))
  const rest = [...set].filter((t) => !SCENE_TAG_ORDER.includes(t)).sort()
  return [...ordered, ...rest]
}
