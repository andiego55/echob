// SEO-Regionalseiten: /<profession>/<stadt> (z. B. /paartherapie/kassel).
// Kuratierte Matrix aus Berufsgruppen × Städten. Pro Berufsgruppe echte
// Orientierungs-Inhalte (Ressource, kein Doorway), pro Stadt die passenden
// Fachpersonen (live aus dem Verzeichnis) + Funnel zurück in EchoB.
//
// Die Stadt-Slugs müssen der Slugify-Logik der Verzeichnis-Einträge entsprechen
// (Umlaute → ae/oe/ue), damit die Fachpersonen-Suche greift.

export interface RegionCity {
  slug: string
  name: string
  state: string
}

export const REGION_CITIES: RegionCity[] = [
  { slug: 'berlin', name: 'Berlin', state: 'Berlin' },
  { slug: 'hamburg', name: 'Hamburg', state: 'Hamburg' },
  { slug: 'muenchen', name: 'München', state: 'Bayern' },
  { slug: 'koeln', name: 'Köln', state: 'Nordrhein-Westfalen' },
  { slug: 'frankfurt-am-main', name: 'Frankfurt am Main', state: 'Hessen' },
  { slug: 'stuttgart', name: 'Stuttgart', state: 'Baden-Württemberg' },
  { slug: 'duesseldorf', name: 'Düsseldorf', state: 'Nordrhein-Westfalen' },
  { slug: 'leipzig', name: 'Leipzig', state: 'Sachsen' },
  { slug: 'dresden', name: 'Dresden', state: 'Sachsen' },
  { slug: 'hannover', name: 'Hannover', state: 'Niedersachsen' },
  { slug: 'nuernberg', name: 'Nürnberg', state: 'Bayern' },
  { slug: 'kassel', name: 'Kassel', state: 'Hessen' },
]

export interface RegionProfession {
  slug: string
  label: string
  metaDesc: string
  sections: { heading: string; body: string }[]
  tests: string[]
  articles: string[]
  scenes: string[]
}

export const REGION_PROFESSIONS: RegionProfession[] = [
  {
    slug: 'paartherapie',
    label: 'Paartherapie',
    metaDesc: 'Wann Paartherapie hilft, was sie von Paarberatung unterscheidet und was sie kostet.',
    sections: [
      {
        heading: 'Wann Paartherapie sinnvoll sein kann',
        body: 'Wenn sich dieselben Streitmuster endlos wiederholen, wenn ein Vertrauensbruch im Raum steht oder wenn ihr euch fremd geworden seid, kann eine dritte, allparteiliche Person helfen, die Dynamik zu verstehen. Paartherapie ist kein Zeichen des Scheiterns – sie ist der Versuch, wieder in Kontakt zu kommen, bevor Distanz zur Gewohnheit wird.',
      },
      {
        heading: 'Unterschied: Paartherapie und Paarberatung',
        body: 'Die Begriffe werden oft synonym benutzt. Beratung ist meist kürzer und lösungsorientiert (konkrete Themen, Entscheidungen), Therapie geht tiefer und länger an wiederkehrende Muster und ihre Herkunft. Wichtiger als das Etikett ist, ob die Person zu euch passt und ihr euch beide gesehen fühlt.',
      },
      {
        heading: 'Kosten und Selbstzahler',
        body: 'Paartherapie ist in der Regel eine Selbstzahler-Leistung; die gesetzliche Krankenkasse übernimmt sie meist nicht, weil eine Beziehung keine Diagnose ist. Übliche Honorare liegen etwa zwischen 90 und 150 € je Sitzung (50–60 Min.). Viele Fachpersonen bieten ein kurzes, kostenloses Erstgespräch an.',
      },
      {
        heading: 'Wie findest du eine passende Fachperson?',
        body: 'Achte auf Qualifikation und Methode, aber vertrau auch deinem Gefühl im Erstkontakt. Es ist völlig in Ordnung, zwei oder drei Personen anzufragen und zu vergleichen. Die Passung – fühlen wir uns beide ernst genommen? – sagt mehr über den Erfolg aus als jeder Titel.',
      },
    ],
    tests: ['streitmuster', 'beziehungsgesundheit'],
    articles: ['fair-streiten', 'die-vier-reiter', 'kommunikation-konflikte'],
    scenes: ['unter-der-wut', 'warum-ich-bleibe'],
  },
  {
    slug: 'paarberatung',
    label: 'Paar- & Eheberatung',
    metaDesc: 'Wann Paarberatung weiterhilft, wie sie abläuft und was sie kostet.',
    sections: [
      {
        heading: 'Wann Paarberatung weiterhilft',
        body: 'Paarberatung eignet sich, wenn ihr an einem konkreten Punkt feststeckt: eine Entscheidung steht an, ein Thema kehrt immer wieder, oder ihr wollt vorbeugen, bevor aus Unzufriedenheit Entfremdung wird. Der Blick von außen ordnet, was von innen unentwirrbar scheint.',
      },
      {
        heading: 'Beratung oder Therapie?',
        body: 'Beratung ist meist kürzer, alltagsnah und auf das Hier und Jetzt gerichtet; Therapie geht tiefer an die Wurzeln wiederkehrender Muster. Bei akuten Krisen, Gewalt oder psychischer Belastung ist therapeutische bzw. ärztliche Begleitung der richtige Weg.',
      },
      {
        heading: 'Kosten',
        body: 'Beratungsstellen kirchlicher oder kommunaler Träger (z. B. pro familia, Caritas, Diakonie) arbeiten oft nach Einkommen gestaffelt oder kostenlos. Freie Berater:innen rechnen als Selbstzahler ab, meist 70–120 € je Sitzung.',
      },
      {
        heading: 'Der erste Schritt',
        body: 'Ein erstes Gespräch ist unverbindlich. Es hilft, vorab für sich zu sortieren, worum es eigentlich geht – dann wird die gemeinsame Zeit fokussierter und wertvoller.',
      },
    ],
    tests: ['beziehungsgesundheit', 'bleiben-oder-gehen'],
    articles: ['trennen-oder-bleiben', 'kommunikation-konflikte', 'fair-streiten'],
    scenes: ['zwischen-bleiben-und-gehen', 'warum-ich-bleibe'],
  },
  {
    slug: 'schematherapie',
    label: 'Schematherapie',
    metaDesc: 'Was Schematherapie ist, wem sie hilft und wie sie mit Beziehungsmustern arbeitet.',
    sections: [
      {
        heading: 'Was Schematherapie ist',
        body: 'Schematherapie verbindet Verhaltenstherapie mit Ansätzen zu frühen Prägungen. Sie geht davon aus, dass wir in belastenden Situationen in alte „Schemata" und „Modi" rutschen – Muster, die einmal Schutz waren und heute Nähe erschweren.',
      },
      {
        heading: 'Wobei sie helfen kann',
        body: 'Sie ist besonders hilfreich bei tief verwurzelten, wiederkehrenden Beziehungsmustern: Verlustangst, emotionale Abhängigkeit, das Gefühl, sich immer wieder selbst zu verlieren oder an ähnliche Partner zu geraten.',
      },
      {
        heading: 'Ablauf und Kosten',
        body: 'Approbierte Schematherapeut:innen können über die Krankenkasse abrechnen (Richtlinienverfahren); bei Heilpraktiker:innen für Psychotherapie oder im Coaching-Rahmen ist es meist Selbstzahler-Leistung (ca. 90–130 € je Sitzung).',
      },
      {
        heading: 'Passung finden',
        body: 'Weil Schematherapie an verletzliche Themen rührt, ist ein Gefühl von Sicherheit im Kontakt entscheidend. Ein Erstgespräch zeigt schnell, ob die Chemie stimmt.',
      },
    ],
    tests: ['bindungsstil', 'belastende-muster'],
    articles: ['bindungsstile', 'sich-selbst-verlieren', 'emotionsregulation'],
    scenes: ['und-wie-geht-es-dir', 'wer-war-ich-nochmal'],
  },
  {
    slug: 'psychotherapie',
    label: 'Psychotherapie',
    metaDesc: 'Wann Psychotherapie sinnvoll ist, welche Wege es gibt und was Kassen übernehmen.',
    sections: [
      {
        heading: 'Wann Psychotherapie sinnvoll ist',
        body: 'Wenn Belastung, Ängste, Niedergeschlagenheit oder anhaltender Beziehungsstress dein Leben spürbar einschränken, ist Psychotherapie der richtige Ort. Anders als Beratung behandelt sie auch seelisches Leiden mit Krankheitswert.',
      },
      {
        heading: 'Wege zum Therapieplatz',
        body: 'Erste Anlaufstelle ist die psychotherapeutische Sprechstunde. Über die Terminservicestelle (Tel. 116117) bekommst du Unterstützung bei der Suche. Die Wartezeiten sind vielerorts lang – umso wichtiger, früh und an mehreren Stellen anzufragen.',
      },
      {
        heading: 'Kosten und Kasse',
        body: 'Approbierte Psychotherapeut:innen rechnen über die gesetzliche Krankenkasse ab. Daneben gibt es Selbstzahler-Angebote und die Kostenerstattung, wenn kein Kassenplatz zu finden ist.',
      },
      {
        heading: 'Bis ein Platz frei wird',
        body: 'Die Wartezeit muss keine leere Zeit sein. Sich selbst zu sortieren – was belastet mich, seit wann, in welchen Situationen – macht den späteren Therapiestart wirksamer.',
      },
    ],
    tests: ['belastende-muster', 'verliere-ich-mich'],
    articles: ['professionelle-hilfe', 'emotionsregulation', 'sich-selbst-verlieren'],
    scenes: ['und-wie-geht-es-dir', 'unter-der-wut'],
  },
  {
    slug: 'coaching',
    label: 'Beziehungscoaching',
    metaDesc: 'Was Beziehungscoaching leistet, wann es passt und wie es sich von Therapie unterscheidet.',
    sections: [
      {
        heading: 'Was Coaching leistet',
        body: 'Coaching ist lösungs- und zukunftsorientiert: Es hilft, Klarheit zu gewinnen, Entscheidungen zu treffen und konkrete Schritte zu gehen – etwa bei der Frage „bleiben oder gehen", bei Kommunikation oder beim Wiederfinden der eigenen Bedürfnisse.',
      },
      {
        heading: 'Coaching oder Therapie?',
        body: 'Coaching setzt psychische Stabilität voraus und arbeitet an konkreten Anliegen. Bei seelischem Leiden mit Krankheitswert, Trauma oder Krisen ist Psychotherapie der richtige Rahmen. Seriöse Coaches grenzen das klar ab und verweisen weiter.',
      },
      {
        heading: 'Kosten',
        body: 'Coaching ist Selbstzahler-Leistung. Die Honorare variieren stark (ca. 80–150 € je Stunde). Viele Coaches bieten ein kostenloses Kennenlerngespräch an, in dem sich die Passung zeigt.',
      },
      {
        heading: 'Worauf achten?',
        body: 'Der Begriff „Coach" ist nicht geschützt. Achte auf Ausbildung, Erfahrung und eine klare, ehrliche Selbstbeschreibung – und darauf, ob du dich verstanden fühlst.',
      },
    ],
    tests: ['eigener-anteil', 'beziehungsgesundheit'],
    articles: ['grenzen-setzen-lernen', 'nein-sagen', 'kommunikation-konflikte'],
    scenes: ['und-wie-geht-es-dir', 'warum-ich-bleibe'],
  },
]

const BY_PROF = Object.fromEntries(REGION_PROFESSIONS.map((p) => [p.slug, p]))
const BY_CITY = Object.fromEntries(REGION_CITIES.map((c) => [c.slug, c]))

export function regionProfession(slug: string | undefined): RegionProfession | undefined {
  return slug ? BY_PROF[slug] : undefined
}
export function regionCity(slug: string | undefined): RegionCity | undefined {
  return slug ? BY_CITY[slug] : undefined
}

/** SEO-Metadaten je Regionalseite (Basis fürs Prerendering + Sitemap). */
export const REGION_ROUTE_META: Record<string, { title: string; description: string }> = Object.fromEntries(
  REGION_PROFESSIONS.flatMap((p) =>
    REGION_CITIES.map((c) => [
      `/${p.slug}/${c.slug}`,
      {
        title: `${p.label} in ${c.name} finden – Fachpersonen & Orientierung | EchoB`,
        description: `${p.label} in ${c.name}: ${p.metaDesc} Finde passende Fachpersonen und bereite dein erstes Gespräch mit EchoB vor. Ohne Diagnose.`,
      },
    ]),
  ),
)
