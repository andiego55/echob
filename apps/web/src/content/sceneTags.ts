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
  // Weitere Varianten
  hoovering: 'Hoovering',
  'future-faking': 'Future Faking',
  zukunftsversprechen: 'Zukunftsversprechen',
  breadcrumbing: 'Breadcrumbing',
  hinhalten: 'Hinhalten',
  triangulierung: 'Triangulierung',
  vergleich: 'Vergleich',
  verachtung: 'Verachtung',
  stonewalling: 'Stonewalling',
  mauern: 'Mauern',
  'trauma-bindung': 'Trauma-Bindung',
  'finanzielle-kontrolle': 'Finanzielle Kontrolle',
  abhaengigkeit: 'Abhängigkeit',
  'vorgetaeuschte-unfaehigkeit': 'Vorgetäuschte Unfähigkeit',
  ungleichgewicht: 'Ungleichgewicht',
  'narzisstischer-elternteil': 'Narzisstischer Elternteil',
  eifersuchtsvorwuerfe: 'Eifersuchtsvorwürfe',
  // Neue Tags – nur Overrides, wo die Ableitung falsch läge (Umlaute/Akronyme).
  'intermittierende-verstaerkung': 'Intermittierende Verstärkung',
  'schein-entschuldigung': 'Schein-Entschuldigung',
  'taeter-opfer-umkehr': 'Täter-Opfer-Umkehr',
  darvo: 'DARVO',
  // Kommunikation & Grenzen
  missverstaendnis: 'Missverständnis',
  'sich-nicht-gehoert-fuehlen': 'Sich nicht gehört fühlen',
  enttaeuschung: 'Enttäuschung',
  'aktives-zuhoeren': 'Aktives Zuhören',
  'gehoert-werden': 'Gehört werden',
  'nein-sagen': 'Nein sagen',
  selbstfuersorge: 'Selbstfürsorge',
  // Konflikt & Gefühle
  'emotionale-ueberflutung': 'Emotionale Überflutung',
  'co-regulation': 'Co-Regulation',
  // Eifersucht & Trennung
  gruebeln: 'Grübeln',
  'retrospektive-eifersucht': 'Retrospektive Eifersucht',
}

/** Kuratierte Reihenfolge der Filter-Chips (wichtigste zuerst). */
export const SCENE_TAG_ORDER: string[] = [
  'narzissmus',
  'verdeckter-narzissmus',
  'grandioser-narzissmus',
  'narzisstischer-elternteil',
  'gaslighting',
  'love-bombing',
  'hoovering',
  'future-faking',
  'zukunftsversprechen',
  'breadcrumbing',
  'hinhalten',
  'idealisierung-abwertung',
  'entwertung',
  'abwertung',
  'verachtung',
  'triangulierung',
  'vergleich',
  'schuldumkehr',
  'silent-treatment',
  'stonewalling',
  'mauern',
  'passiv-aggressiv',
  'naehe-distanz',
  'push-pull',
  'bindungsangst',
  'verlustangst',
  'trauma-bindung',
  'borderline',
  'emotionale-vernachlaessigung',
  'einsamkeit-zu-zweit',
  'kontrolle',
  'finanzielle-kontrolle',
  'coercive-control',
  'abhaengigkeit',
  'eifersucht',
  'eifersuchtsvorwuerfe',
  'misstrauen',
  'grenzverletzung',
  'isolation',
  'vorgetaeuschte-unfaehigkeit',
  'ungleichgewicht',
  'auf-eierschalen-gehen',
  'selbstzweifel',
  'schuldgefuehle',
  'sich-klein-fuehlen',
  'erschoepfung',
  'rueckzug',
  'wiederkehrendes-muster',
  // Neue Tags (Content-Ausbau)
  'intermittierende-verstaerkung',
  'schein-entschuldigung',
  'wortsalat',
  'darvo',
  'taeter-opfer-umkehr',
  'emotionale-erpressung',
  'aufrechnen',
  'entzug',
  'fawning',
  'selbstverlust',
  'anpassung',
  'parentifizierung',
  'ghosting',
  'freundschaft',
  'konkurrenz',
  'neid',
  'klarheit',
  'aufbruch',
  'grenze',
  // Kommunikation & Grenzen
  'nein-sagen',
  'konsequenz',
  'selbstfuersorge',
  'autonomie',
  'aktives-zuhoeren',
  'gehoert-werden',
  'verbindung',
  'missverstaendnis',
  'sich-nicht-gehoert-fuehlen',
  'rechthaben',
  'eskalation',
  'erwartung',
  'gedankenlesen',
  'enttaeuschung',
  'angst',
  // Konflikt & Gefühle
  'eskalationsspirale',
  'deeskalation',
  'reparaturversuch',
  'wut',
  'verletzung',
  'scham',
  'emotionale-ueberflutung',
  'co-regulation',
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
