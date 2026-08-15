import type { SelfTest } from '../types'

/**
 * Beziehungstrauma & PTBS-Belastung – dimensionaler Test (concern: hoch = stärkere Belastung).
 * Fünf Bereiche in Anlehnung an die bekannten Belastungscluster: Übererregung,
 * Wiedererleben, Vermeidung, Taubheit/Rückzug, Schuld/Scham/Misstrauen.
 * Streng nicht-diagnostisch (keine PTBS-Diagnose). safety: true + Flag 'gewalt'.
 */
export const beziehungstrauma: SelfTest = {
  slug: 'beziehungstrauma',
  category: 'therapie',
  title: 'Beziehungstrauma & PTBS-Belastung',
  teaser:
    'Die Beziehung ist vorbei, aber der Körper hat nicht abgeschaltet? Fünf Bereiche helfen dir einzuordnen, wie sehr dich das Erlebte noch belastet. Ohne Diagnose.',
  description:
    'Dieser Selbsttest schaut in fünf Bereichen auf Belastungsreaktionen, wie sie nach schwierigen oder bedrohlichen Beziehungen auftreten können: ständige Wachsamkeit und Schreckhaftigkeit, ungewolltes Wiedererleben, Vermeidung, innere Taubheit sowie Schuld, Scham und Misstrauen. Er stellt keine Diagnose einer posttraumatischen Belastungsstörung – das kann nur eine qualifizierte Fachperson im persönlichen Kontakt. Er hilft dir, dein Erleben ernst zu nehmen und einzuordnen. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '10–12 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Manche Beziehungen hinterlassen Spuren, die bleiben, auch wenn längst Abstand da ist. Dieser Test hilft dir, diese Spuren einzuordnen – er bewertet nicht dein Gegenüber und stellt keine Diagnose. Antworte so ehrlich, wie es dir möglich ist, und beziehe dich auf die letzten Wochen. Wenn dir eine Frage zu nahegeht, darfst du jederzeit pausieren. Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, wo die Belastung gerade am größten ist. Welche einzelne Situation aus der letzten Zeit hat dich am stärksten aus der Bahn geworfen?',
  },
  dimensions: [
    {
      key: 'uebererregung',
      name: 'Übererregung & Schreckhaftigkeit',
      description: 'Wie sehr dein System dauernd unter Strom steht und wachsam bleibt.',
      bands: [
        { min: 0, label: 'Zur Ruhe kommen', tone: 'good', text: 'Du kannst dich weitgehend entspannen, schläfst überwiegend gut und fühlst dich nicht ständig auf der Hut. Anspannung gehört dazu, beherrscht dich aber nicht.' },
        { min: 40, label: 'Unter Strom', tone: 'watch', text: 'Du bist oft angespannt, schreckhaft oder schläfst schlecht. Dein System scheint schwer abzuschalten – ein verständliches Signal, das Aufmerksamkeit verdient.' },
        { min: 65, label: 'Daueralarm', tone: 'alert', text: 'Wachsamkeit, Schreckhaftigkeit und innere Unruhe bestimmen deinen Alltag spürbar. Dieser Dauerstress ist zermürbend und ernst zu nehmen – du musst das nicht allein aushalten.' },
      ],
    },
    {
      key: 'wiedererleben',
      name: 'Wiedererleben & Trigger',
      description: 'Wie sehr sich Erinnerungen ungefragt aufdrängen.',
      bands: [
        { min: 0, label: 'Vergangenheit bleibt Vergangenheit', tone: 'good', text: 'Du denkst an Belastendes, wenn du es willst – es überfällt dich aber nicht. Erinnerungen fühlen sich vergangen an, nicht wie jetzt.' },
        { min: 40, label: 'Es holt dich ein', tone: 'watch', text: 'Erinnerungen, Bilder oder Albträume drängen sich immer wieder auf, oft ausgelöst durch Kleinigkeiten. Das ist anstrengend und kein Zeichen von Schwäche.' },
        { min: 65, label: 'Wieder mittendrin', tone: 'alert', text: 'Das Erlebte kehrt mit voller Wucht zurück – als Flashback, Albtraum oder Welle, die dich überrollt. Solche Wiedererlebens-Symptome sind gut behandelbar; du solltest damit nicht allein bleiben.' },
      ],
    },
    {
      key: 'vermeidung',
      name: 'Vermeidung',
      description: 'Wie sehr du Orten, Menschen oder Gedanken ausweichst, die erinnern.',
      bands: [
        { min: 0, label: 'Offener Radius', tone: 'good', text: 'Du kannst dich weitgehend frei bewegen, ohne Orte, Menschen oder Themen meiden zu müssen. Erinnerungen halten dich nicht in Schach.' },
        { min: 40, label: 'Enger werdender Kreis', tone: 'watch', text: 'Du gehst manchen Orten, Menschen oder Gesprächen aus dem Weg, um nicht erinnert zu werden. Das schützt kurzfristig – und macht die Welt mit der Zeit kleiner.' },
        { min: 65, label: 'Deutlicher Rückzug', tone: 'alert', text: 'Vermeidung bestimmt viele deiner Entscheidungen; dein Leben hat sich merklich verengt. Das ist eine verständliche Schutzreaktion, hält die Belastung aber oft am Leben – Begleitung kann hier viel lösen.' },
      ],
    },
    {
      key: 'taubheit',
      name: 'Taubheit & Rückzug',
      description: 'Wie sehr du dich abgestumpft, fern oder „nicht richtig da" fühlst.',
      bands: [
        { min: 0, label: 'Lebendig dabei', tone: 'good', text: 'Du kannst Freude, Nähe und Interesse spüren und fühlst dich grundsätzlich präsent in deinem Leben.' },
        { min: 40, label: 'Wie hinter Glas', tone: 'watch', text: 'Manchmal fühlst du dich taub, fern oder abgeschnitten, Freude erreicht dich schwerer. Dieses Abkoppeln ist ein alter Schutz – nachvollziehbar, aber einsam.' },
        { min: 65, label: 'Abgeschnitten', tone: 'alert', text: 'Taubheit und Distanz zu dir selbst und anderen prägen deinen Alltag stark. Diese schützende Abwesenheit (Dissoziation) verdient behutsame, fachliche Begleitung.' },
      ],
    },
    {
      key: 'selbstbild',
      name: 'Schuld, Scham & Misstrauen',
      description: 'Wie sehr sich dein Blick auf dich und andere verdunkelt hat.',
      bands: [
        { min: 0, label: 'Fester Grund', tone: 'good', text: 'Du kannst grundsätzlich Vertrauen fassen und trägst keine dauerhafte Schuld oder Scham mit dir. Dein Blick auf dich ist überwiegend wohlwollend.' },
        { min: 40, label: 'Verdunkelter Blick', tone: 'watch', text: 'Schuld, Scham oder Misstrauen begleiten dich häufiger. Oft ist das ein Nachhall der Dynamik selbst – die Schuld, die du trägst, gehört selten dir.' },
        { min: 65, label: 'Schwere Last', tone: 'alert', text: 'Du gibst dir viel Schuld, schämst dich oder traust kaum noch jemandem – dich selbst eingeschlossen. Diese Last ist eine tiefe Spur der Belastung, kein Urteil über deinen Wert. Du darfst sie zurückgeben lernen.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Wenig Belastung', tone: 'good', text: 'Über die Bereiche hinweg zeigt sich keine durchgehende traumatische Belastung. Einzelne schwere Momente kann es trotzdem geben – nimm sie ernst und sorge gut für dich.' },
    { min: 38, label: 'Spürbare Belastung', tone: 'watch', text: 'In mehreren Bereichen zeigen sich Belastungsreaktionen, wie sie nach schwierigen Beziehungen auftreten können. Das ist kein Urteil und keine Diagnose – aber ein guter Grund, dir Situationen aufzuschreiben und mit jemandem zu sprechen, dem du vertraust.' },
    { min: 60, label: 'Deutliche Belastung', tone: 'alert', text: 'Vieles deutet auf eine ernstzunehmende Belastung hin. Das ist nichts, was du „einfach aushalten" musst: Traumafolgen sind gut behandelbar. Eine traumaerfahrene Fachperson kann dir helfen, wieder festen Boden zu finden.' },
  ],
  questions: [
    // Übererregung & Schreckhaftigkeit
    { id: 'bt_u1', type: 'scale', section: 'Anspannung & Wachsamkeit', dimension: 'uebererregung', text: 'Ich bin oft angespannt oder „auf der Hut", auch ohne konkreten Anlass.' },
    { id: 'bt_u2', type: 'scale', section: 'Anspannung & Wachsamkeit', dimension: 'uebererregung', text: 'Ich schrecke leicht zusammen – bei Geräuschen, schnellen Bewegungen oder wenn mich jemand überrascht.' },
    { id: 'bt_u3', type: 'scale', section: 'Anspannung & Wachsamkeit', dimension: 'uebererregung', text: 'Ich schlafe schlecht ein oder wache nachts auf und komme nicht zur Ruhe.' },
    { id: 'bt_u4', type: 'scale', section: 'Anspannung & Wachsamkeit', dimension: 'uebererregung', text: 'Ich bin schneller reizbar oder gereizt als früher.' },
    { id: 'bt_u5', type: 'scale', section: 'Anspannung & Wachsamkeit', dimension: 'uebererregung', text: 'Ich scanne unbewusst die Stimmung von Menschen um mich herum.' },
    { id: 'bt_u6', type: 'scale', section: 'Anspannung & Wachsamkeit', dimension: 'uebererregung', text: 'Ich kann mich gut entspannen und loslassen.', reverse: true },
    // Wiedererleben & Trigger
    { id: 'bt_w1', type: 'scale', section: 'Erinnerungen', dimension: 'wiedererleben', text: 'Erinnerungen an Belastendes drängen sich mir auf, ohne dass ich das will.' },
    { id: 'bt_w2', type: 'scale', section: 'Erinnerungen', dimension: 'wiedererleben', text: 'Kleinigkeiten – ein Geruch, ein Tonfall, ein Ort – lösen plötzlich starke Gefühle in mir aus.' },
    { id: 'bt_w3', type: 'scale', section: 'Erinnerungen', dimension: 'wiedererleben', text: 'Manchmal fühlt es sich an, als würde das Alte gerade wieder geschehen (Flashback).' },
    { id: 'bt_w4', type: 'scale', section: 'Erinnerungen', dimension: 'wiedererleben', text: 'Ich habe belastende Träume oder Albträume von dem, was war.' },
    { id: 'bt_w5', type: 'scale', section: 'Erinnerungen', dimension: 'wiedererleben', text: 'Wenn ich an die Zeit erinnert werde, reagiert mein Körper – Herzrasen, Enge, Zittern.' },
    // Vermeidung
    { id: 'bt_v1', type: 'scale', section: 'Ausweichen', dimension: 'vermeidung', text: 'Ich meide Orte, Menschen oder Situationen, die mich an die Beziehung erinnern.' },
    { id: 'bt_v2', type: 'scale', section: 'Ausweichen', dimension: 'vermeidung', text: 'Ich versuche, nicht an das Erlebte zu denken oder darüber zu sprechen.' },
    { id: 'bt_v3', type: 'scale', section: 'Ausweichen', dimension: 'vermeidung', text: 'Ich habe Dinge aufgegeben oder gemieden, die mir früher wichtig waren, um Erinnerungen aus dem Weg zu gehen.' },
    { id: 'bt_v4', type: 'scale', section: 'Ausweichen', dimension: 'vermeidung', text: 'Ich lenke mich stark ab, damit bestimmte Gefühle nicht hochkommen.' },
    {
      id: 'bt_v5', type: 'single', section: 'Ausweichen', dimension: 'vermeidung',
      text: 'Wenn ein Gespräch auf die belastende Zeit kommt …',
      options: [
        { label: 'kann ich darüber sprechen, wenn ich möchte.', value: 0 },
        { label: 'wird es unangenehm, aber ich halte es aus.', value: 1 },
        { label: 'wechsle ich möglichst schnell das Thema.', value: 3 },
        { label: 'verschließe ich mich ganz oder gehe.', value: 4 },
      ],
    },
    // Taubheit & Rückzug
    { id: 'bt_t1', type: 'scale', section: 'Nähe & Gefühl', dimension: 'taubheit', text: 'Ich fühle mich oft taub, fern oder „wie hinter Glas".' },
    { id: 'bt_t2', type: 'scale', section: 'Nähe & Gefühl', dimension: 'taubheit', text: 'Freude, Interesse oder Nähe erreichen mich schwerer als früher.' },
    { id: 'bt_t3', type: 'scale', section: 'Nähe & Gefühl', dimension: 'taubheit', text: 'In stressigen Momenten „schalte ich innerlich ab" oder bin wie neben mir.' },
    { id: 'bt_t4', type: 'scale', section: 'Nähe & Gefühl', dimension: 'taubheit', text: 'Ich ziehe mich von Menschen zurück, auch von denen, die mir guttun.' },
    { id: 'bt_t5', type: 'scale', section: 'Nähe & Gefühl', dimension: 'taubheit', text: 'Ich fühle mich lebendig und präsent in meinem Alltag.', reverse: true },
    // Schuld, Scham & Misstrauen
    { id: 'bt_s1', type: 'scale', section: 'Blick auf mich & andere', dimension: 'selbstbild', text: 'Ich gebe mir selbst die Schuld für das, was passiert ist.' },
    { id: 'bt_s2', type: 'scale', section: 'Blick auf mich & andere', dimension: 'selbstbild', text: 'Ich schäme mich für das, was war, oder für meine Reaktionen darauf.' },
    { id: 'bt_s3', type: 'scale', section: 'Blick auf mich & andere', dimension: 'selbstbild', text: 'Ich traue anderen Menschen schwerer als früher.' },
    { id: 'bt_s4', type: 'scale', section: 'Blick auf mich & andere', dimension: 'selbstbild', text: 'Ich habe das Gefühl, seit dieser Zeit ein anderer Mensch zu sein.' },
    { id: 'bt_s5', type: 'scale', section: 'Blick auf mich & andere', dimension: 'selbstbild', text: 'Die Welt fühlt sich für mich grundsätzlich gefährlich an.', flag: 'gewalt', flagMin: 4 },
    {
      id: 'bt_s6', type: 'single', section: 'Blick auf mich & andere', dimension: 'selbstbild',
      text: 'Wenn ich ehrlich in mich hineinhöre, fühle ich mich heute …',
      options: [
        { label: 'grundsätzlich sicher.', value: 0 },
        { label: 'meistens sicher, manchmal unruhig.', value: 1 },
        { label: 'oft angespannt und wachsam.', value: 2 },
        { label: 'häufig ängstlich, obwohl keine Gefahr da ist.', value: 3 },
        { label: 'oft, als drohe jederzeit etwas.', value: 4, flag: 'gewalt' },
      ],
    },
    // Freitext
    { id: 'bt_x1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Welche einzelne Situation oder Erinnerung geht dir gerade am meisten nach?' },
    { id: 'bt_x2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was hilft dir, wenn dich etwas überkommt – und wer oder was gibt dir Sicherheit?' },
    { id: 'bt_x3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was würdest du einem geliebten Menschen sagen, der dir dasselbe erzählt?' },
  ],
  safety: true,
  safetyVariant: 'victim',
  disclaimer:
    'Dieser Test stellt keine Diagnose – insbesondere keine posttraumatische Belastungsstörung. Ob eine solche vorliegt, kann nur eine qualifizierte Fachperson im persönlichen Kontakt feststellen. Traumafolgen sind gut behandelbar. Wenn dich Erinnerungen überschwemmen, du dich nicht mehr sicher fühlst oder Gedanken kommen, nicht mehr leben zu wollen, hol dir bitte Unterstützung: Telefonseelsorge 0800 111 0 111 oder 0800 111 0 222 (kostenlos, rund um die Uhr). Hilfetelefon Gewalt gegen Frauen 116 016, Hilfetelefon Gewalt an Männern 0800 123 9900. Bei akuter Gefahr: Notruf 110 / 112.',
}
