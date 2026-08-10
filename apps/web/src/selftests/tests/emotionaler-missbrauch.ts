import type { SelfTest } from '../types'

/**
 * Emotionaler Missbrauch – dimensionaler Test (concern-Polarität: hoch = stärkere Belastung).
 * Fünf Bereiche: Kontrolle, Abwertung & Schuldumkehr, Vernachlässigung, Selbstverlust,
 * Zweifel an der eigenen Wahrnehmung. Streng nicht-diagnostisch, geschlechtsoffen.
 * safety: true + Flags (coercive-control, gewalt) für ernstzunehmende Angaben.
 */
export const emotionalerMissbrauch: SelfTest = {
  slug: 'emotionaler-missbrauch',
  category: 'manipulation',
  title: 'Emotionaler Missbrauch: einordnen, was du erlebst',
  teaser:
    'Es ist nie „etwas passiert" – und trotzdem geht es dir schlechter. Fünf Bereiche helfen dir, dein Erleben ehrlich einzuordnen. Ohne Urteil über dein Gegenüber.',
  description:
    'Dieser umfassende Selbsttest schaut in fünf Bereichen auf das, was sich in einer belastenden Beziehung oft nur diffus anfühlt: Kontrolle und Kleinhalten, Abwertung und Schuldumkehr, emotionale Vernachlässigung, den eigenen Selbstverlust und den Zweifel an der eigenen Wahrnehmung. Er stellt keine Diagnose und verurteilt dein Gegenüber nicht – er hilft dir, dein eigenes Erleben wieder ernst zu nehmen. Das Ergebnis kannst du anschließend mit Echo besprechen. Emotionale Gewalt trifft Menschen jeden Geschlechts.',
  duration: '10–15 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Manche Beziehungen tun weh, ohne dass man auf einen einzelnen Vorfall zeigen kann. Dieser Test hilft dir, vom diffusen Gefühl zu einer klareren Einordnung zu kommen. Er bewertet nicht dein Gegenüber und stellt keine Diagnose – er schaut auf deine Erfahrung und dein Erleben. Antworte so ehrlich, wie es dir möglich ist; niemand außer dir sieht deine Antworten. Wenn dir eine Frage zu nahegeht, darfst du jederzeit pausieren.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, in welchen Bereichen die Belastung am größten ist. Welche einzelne Situation aus der letzten Zeit geht dir dazu gerade am meisten nach?',
  },
  dimensions: [
    {
      key: 'kontrolle',
      name: 'Kontrolle & Kleinhalten',
      description: 'Wie sehr dein Spielraum eingeschränkt wird und du dich anpassen musst.',
      bands: [
        { min: 0, label: 'Freier Raum', tone: 'good', text: 'Du kannst weitgehend frei über dein Leben, deine Zeit und deine Kontakte bestimmen. Anpassung aus Angst vor Reaktionen spielt kaum eine Rolle.' },
        { min: 40, label: 'Enger werdender Radius', tone: 'watch', text: 'Immer wieder richtest du dich danach aus, Ärger zu vermeiden – bei Zeit, Kontakten oder Entscheidungen. Es lohnt sich, ehrlich hinzusehen, wie viel Raum dir wirklich bleibt.' },
        { min: 65, label: 'Deutliche Einschränkung', tone: 'alert', text: 'Dein Spielraum ist spürbar eng geworden: Rechtfertigung, Anpassung, reduzierte Kontakte. Das ist zermürbend und ernst zu nehmen. Ein solches Muster nennt man Coercive Control – du musst das nicht allein tragen.' },
      ],
    },
    {
      key: 'abwertung',
      name: 'Abwertung & Schuldumkehr',
      description: 'Wie oft du entwertet wirst oder am Ende als schuldig dastehst.',
      bands: [
        { min: 0, label: 'Auf Augenhöhe', tone: 'good', text: 'Ihr könnt streiten, ohne dass einer den anderen entwertet. Nach Konflikten findet ihr grundsätzlich wieder als gleichwertige Partner zueinander.' },
        { min: 40, label: 'Wiederkehrende Abwertung', tone: 'watch', text: 'Spitze Bemerkungen, das Gefühl, es nie richtig zu machen, oder am Ende schuld zu sein, kommen immer wieder vor. Das nagt am Selbstwert – auch wenn jeder einzelne Moment „klein" wirkt.' },
        { min: 65, label: 'Systematische Entwertung', tone: 'alert', text: 'Abwertung und Schuldumkehr prägen euren Alltag: Was du ansprichst, wird umgedreht, bis du dich entschuldigst. Dieses Muster (oft DARVO genannt) verunsichert tief und verdient einen ehrlichen, geschützten Blick.' },
      ],
    },
    {
      key: 'vernachlaessigung',
      name: 'Emotionale Vernachlässigung',
      description: 'Wie sehr dir Resonanz, Interesse und Fürsorge fehlen.',
      bands: [
        { min: 0, label: 'Resonanz da', tone: 'good', text: 'Du fühlst dich grundsätzlich gesehen und beantwortet. Interesse, Fürsorge und geteilte Freude sind Teil eurer Beziehung.' },
        { min: 40, label: 'Spürbarer Mangel', tone: 'watch', text: 'Immer wieder fühlst du dich allein, obwohl ihr zusammen seid. Das Bedürfnis nach Resonanz ist berechtigt – dass es zu oft ins Leere läuft, ist ein ernstzunehmendes Signal.' },
        { min: 65, label: 'Tiefe Einsamkeit zu zweit', tone: 'alert', text: 'Interesse, Fürsorge und Mitfreude fehlen weitgehend; du hältst die Verbindung im Grunde allein. Diese stille Form von Mangel zehrt oft mehr, als offener Streit es täte, und ist keine Kleinigkeit.' },
      ],
    },
    {
      key: 'selbstverlust',
      name: 'Selbstverlust & Beschwichtigung',
      description: 'Wie sehr du dich selbst aufgibst, um Frieden zu halten.',
      bands: [
        { min: 0, label: 'Bei dir', tone: 'good', text: 'Du kannst in der Beziehung du selbst sein, deine Bedürfnisse zeigen und auch mal Nein sagen, ohne dich dafür zu fürchten.' },
        { min: 40, label: 'Häufiges Nachgeben', tone: 'watch', text: 'Du beschwichtigst, gibst nach und denkst viel voraus, um Ärger zu vermeiden. Das kostet Kraft – und Stück für Stück ein wenig von dir selbst.' },
        { min: 65, label: 'Ausgeprägter Selbstverlust', tone: 'alert', text: 'Du machst dich klein, sagst Ja statt Nein und funktionierst, um Zuwendung oder Ruhe zu bekommen. Dass kluge, starke Menschen so reagieren, ist kein Makel, sondern Schutz – und ein deutliches Zeichen, gut für dich zu sorgen.' },
      ],
    },
    {
      key: 'wahrnehmungszweifel',
      name: 'Zweifel an der eigenen Wahrnehmung',
      description: 'Wie sehr du deinem eigenen Urteil nicht mehr traust.',
      bands: [
        { min: 0, label: 'Fester Boden', tone: 'good', text: 'Du vertraust grundsätzlich deiner Wahrnehmung und deinen Gefühlen. Sie geben dir Orientierung.' },
        { min: 40, label: 'Ins Wanken geraten', tone: 'watch', text: 'Nach Gesprächen zweifelst du öfter an dir: War es wirklich so, übertreibe ich? Dieser Zweifel ist eine verstehbare Wirkung von Widersprüchlichkeit – kein Beweis, dass mit dir etwas nicht stimmt.' },
        { min: 65, label: 'Verlorener Halt', tone: 'alert', text: 'Du traust deinem eigenen Urteil kaum noch und redest dir vieles klein. Genau das ist die tiefe Wirkung von Gaslighting und Double Binds. Deine Wahrnehmung ist ein ernstzunehmender Anfang – du darfst ihr wieder Gewicht geben.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Grundsätzlich tragfähig', tone: 'good', text: 'Über die Bereiche hinweg zeigt sich keine durchgehende Belastung. Konflikte und Durststrecken gehören zu jeder Beziehung – behalte im Blick, was dir guttut, und nimm einzelne Signale trotzdem ernst.' },
    { min: 40, label: 'Ernstzunehmende Belastung', tone: 'watch', text: 'In mehreren Bereichen zieht es spürbar an dir. Das macht dein Gegenüber nicht automatisch zum „Täter" – aber es lohnt sich, genauer hinzusehen, dir Situationen aufzuschreiben und mit jemandem zu sprechen, dem du vertraust.' },
    { min: 62, label: 'Deutliche Belastung', tone: 'alert', text: 'Vieles deutet auf ein belastendes Muster hin, das dir nicht guttut. Das ernst zu nehmen ist kein Urteil über den anderen Menschen, sondern Fürsorge für dich. Du musst das nicht allein einordnen – eine Vertrauensperson oder Fachstelle kann dir helfen.' },
  ],
  questions: [
    // Kontrolle & Kleinhalten
    { id: 'em_k1', type: 'scale', section: 'Kontrolle & Kleinhalten', dimension: 'kontrolle', text: 'Ich passe mein Verhalten an, damit die Stimmung meines Gegenübers nicht kippt.', flag: 'coercive-control', flagMin: 3 },
    { id: 'em_k2', type: 'scale', section: 'Kontrolle & Kleinhalten', dimension: 'kontrolle', text: 'Ich muss mich dafür rechtfertigen, wo ich war, mit wem oder wie lange.' },
    { id: 'em_k3', type: 'scale', section: 'Kontrolle & Kleinhalten', dimension: 'kontrolle', text: 'Mein Gegenüber bestimmt mit, wen ich treffe oder wie ich meine Zeit verbringe.' },
    { id: 'em_k4', type: 'scale', section: 'Kontrolle & Kleinhalten', dimension: 'kontrolle', text: 'Ich habe Kontakte zu Freund:innen oder Familie zurückgefahren, weil es sonst Ärger gibt.', flag: 'coercive-control', flagMin: 3 },
    { id: 'em_k5', type: 'scale', section: 'Kontrolle & Kleinhalten', dimension: 'kontrolle', text: 'Über Geld, Ausgaben oder eigene Entscheidungen muss ich Rechenschaft ablegen.' },
    { id: 'em_k6', type: 'scale', section: 'Kontrolle & Kleinhalten', dimension: 'kontrolle', text: 'In dieser Beziehung habe ich das Gefühl, frei über mein eigenes Leben zu bestimmen.', reverse: true },
    {
      id: 'em_k7', type: 'single', section: 'Kontrolle & Kleinhalten', dimension: 'kontrolle',
      text: 'Wenn ich abends etwas ohne mein Gegenüber unternehmen möchte …',
      options: [
        { label: 'ist das selbstverständlich, wir haben beide eigene Leben.', value: 0 },
        { label: 'geht das meistens, ich sage kurz Bescheid.', value: 1 },
        { label: 'überlege ich mir gut, wie ich es „verkaufe".', value: 3 },
        { label: 'lasse ich es oft lieber, um Ärger zu vermeiden.', value: 4 },
      ],
    },
    // Abwertung & Schuldumkehr
    { id: 'em_a1', type: 'scale', section: 'Abwertung & Schuldumkehr', dimension: 'abwertung', text: 'Nach Streits stehe am Ende ich als schuldig da – auch wenn ich verletzt wurde.' },
    { id: 'em_a2', type: 'scale', section: 'Abwertung & Schuldumkehr', dimension: 'abwertung', text: 'Mein Gegenüber macht abfällige Bemerkungen über mich, manchmal auch vor anderen.' },
    { id: 'em_a3', type: 'scale', section: 'Abwertung & Schuldumkehr', dimension: 'abwertung', text: 'Worte und Ton meines Gegenübers passen oft nicht zusammen – ich kann es kaum richtig machen.' },
    { id: 'em_a4', type: 'scale', section: 'Abwertung & Schuldumkehr', dimension: 'abwertung', text: 'Wenn ich etwas anspreche, geht es am Ende darum, was mit mir nicht stimmt.' },
    { id: 'em_a5', type: 'scale', section: 'Abwertung & Schuldumkehr', dimension: 'abwertung', text: 'Ich werde als zu empfindlich, zu kompliziert oder undankbar hingestellt.' },
    { id: 'em_a6', type: 'scale', section: 'Abwertung & Schuldumkehr', dimension: 'abwertung', text: 'Nach einem Streit fühlen wir uns wieder als gleichwertige Partner.', reverse: true },
    {
      id: 'em_a7', type: 'single', section: 'Abwertung & Schuldumkehr', dimension: 'abwertung',
      text: 'Wenn ich sage, dass mich etwas verletzt hat …',
      options: [
        { label: 'wird es gehört, und wir schauen es uns gemeinsam an.', value: 0 },
        { label: 'kommt es an, auch wenn es manchmal dauert.', value: 1 },
        { label: 'wird es abgetan oder ins Lächerliche gezogen.', value: 3 },
        { label: 'drehe am Ende ich mich um und entschuldige mich.', value: 4 },
      ],
    },
    // Emotionale Vernachlässigung
    { id: 'em_v1', type: 'scale', section: 'Emotionale Vernachlässigung', dimension: 'vernachlaessigung', text: 'Ich fühle mich in meiner Beziehung oft allein, obwohl wir zusammen sind.' },
    { id: 'em_v2', type: 'scale', section: 'Emotionale Vernachlässigung', dimension: 'vernachlaessigung', text: 'Mein Gegenüber zeigt wenig Interesse an dem, was mich innerlich bewegt.' },
    { id: 'em_v3', type: 'scale', section: 'Emotionale Vernachlässigung', dimension: 'vernachlaessigung', text: 'Wenn es mir schlecht geht, bin ich mit meinen Gefühlen im Grunde allein.' },
    { id: 'em_v4', type: 'scale', section: 'Emotionale Vernachlässigung', dimension: 'vernachlaessigung', text: 'Gute Nachrichten von mir werden kaum geteilt oder erwidert.' },
    { id: 'em_v5', type: 'scale', section: 'Emotionale Vernachlässigung', dimension: 'vernachlaessigung', text: 'Unsere Gespräche halte eher ich allein aufrecht.' },
    { id: 'em_v6', type: 'scale', section: 'Emotionale Vernachlässigung', dimension: 'vernachlaessigung', text: 'Ich fühle mich von meinem Gegenüber gesehen und ernst genommen.', reverse: true },
    // Selbstverlust & Beschwichtigung
    { id: 'em_s1', type: 'scale', section: 'Selbstverlust & Beschwichtigung', dimension: 'selbstverlust', text: 'Ich entschuldige mich, damit ein Konflikt aufhört – auch wenn ich nichts falsch gemacht habe.' },
    { id: 'em_s2', type: 'scale', section: 'Selbstverlust & Beschwichtigung', dimension: 'selbstverlust', text: 'Ich sage Ja, obwohl ich Nein meine, um keinen Ärger zu riskieren.' },
    { id: 'em_s3', type: 'scale', section: 'Selbstverlust & Beschwichtigung', dimension: 'selbstverlust', text: 'Ich habe Interessen, Freundschaften oder Seiten von mir aufgegeben, seit ich in dieser Beziehung bin.' },
    { id: 'em_s4', type: 'scale', section: 'Selbstverlust & Beschwichtigung', dimension: 'selbstverlust', text: 'Wärme bekomme ich vor allem dann, wenn ich funktioniere oder etwas leiste.' },
    { id: 'em_s5', type: 'scale', section: 'Selbstverlust & Beschwichtigung', dimension: 'selbstverlust', text: 'Ich denke ständig voraus, um möglichen Ärger schon vorher zu entschärfen.' },
    { id: 'em_s6', type: 'scale', section: 'Selbstverlust & Beschwichtigung', dimension: 'selbstverlust', text: 'Ich kann in dieser Beziehung ich selbst sein und meine Bedürfnisse zeigen.', reverse: true },
    // Zweifel an der eigenen Wahrnehmung
    { id: 'em_w1', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'wahrnehmungszweifel', text: 'Nach Gesprächen mit meinem Gegenüber zweifle ich an meiner eigenen Wahrnehmung.' },
    { id: 'em_w2', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'wahrnehmungszweifel', text: 'Ich frage mich oft, ob ich mir Dinge nur einbilde oder übertreibe.' },
    { id: 'em_w3', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'wahrnehmungszweifel', text: 'Ich rede mir ein, dass es „gar nicht so schlimm" ist.' },
    { id: 'em_w4', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'wahrnehmungszweifel', text: 'Manchmal weiß ich selbst nicht mehr, was eigentlich vorgefallen ist.' },
    { id: 'em_w5', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'wahrnehmungszweifel', text: 'Ich traue meinem eigenen Urteil weniger als früher.' },
    { id: 'em_w6', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'wahrnehmungszweifel', text: 'Ich vertraue darauf, dass meine Gefühle mir etwas Richtiges sagen.', reverse: true },
    {
      id: 'em_w7', type: 'single', section: 'Deine Wahrnehmung', dimension: 'wahrnehmungszweifel',
      text: 'Wenn ich ehrlich in mich hineinhöre, fühle ich mich in dieser Beziehung …',
      options: [
        { label: 'sicher und geborgen.', value: 0 },
        { label: 'meistens sicher.', value: 1 },
        { label: 'oft angespannt.', value: 2 },
        { label: 'häufig unsicher oder ängstlich.', value: 3 },
        { label: 'immer wieder richtig ängstlich.', value: 4, flag: 'gewalt' },
      ],
    },
    // Freitext
    { id: 'em_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Welche einzelne Situation geht dir gerade nicht aus dem Kopf?' },
    { id: 'em_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was würdest du einer guten Freundin oder einem guten Freund raten, die oder der dir dasselbe erzählt?' },
    { id: 'em_t3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wann und mit wem fühlst du dich frei und ganz du selbst?' },
    { id: 'em_t4', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was hält dich gerade – und was würdest du brauchen, um dich sicherer zu fühlen?' },
  ],
  safety: true,
  safetyVariant: 'victim',
  disclaimer:
    'Dieser Test stellt keine Diagnose und bewertet dein Gegenüber nicht. Er hilft dir, dein eigenes Erleben einzuordnen. Emotionale Gewalt trifft Menschen jeden Geschlechts. Wenn du dich nicht mehr sicher fühlst, wende dich an Menschen, die verbindlich helfen: Hilfetelefon Gewalt gegen Frauen 116 016, Hilfetelefon Gewalt an Männern 0800 123 9900, Telefonseelsorge 0800 111 0 111. Bei akuter Gefahr: Notruf 110 / 112.',
}
