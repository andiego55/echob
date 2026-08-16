import type { SelfTest } from '../types'

/**
 * Erlebe ich Gaslighting? – dimensionaler Test (concern-Polarität: hoch = stärkere Belastung).
 * Fünf Bereiche: Zweifel an der eigenen Wahrnehmung, Bagatellisieren/Gefühls-Abwertung,
 * Schuldumkehr, Isolation & Dritte, verinnerlichter Selbstzweifel (Selbst-Gaslighting).
 * Streng nicht-diagnostisch, geschlechtsoffen. safety: true + Flags (coercive-control, gewalt).
 */
export const erlebeIchGaslighting: SelfTest = {
  slug: 'erlebe-ich-gaslighting',
  category: 'manipulation',
  title: 'Erlebe ich Gaslighting?',
  teaser:
    'Du verlässt Gespräche verwirrter, als du reingegangen bist, und zweifelst an deiner eigenen Erinnerung? Fünf Bereiche helfen dir, das einzuordnen. Ohne Urteil über dein Gegenüber.',
  description:
    'Dieser Selbsttest schaut in fünf Bereichen auf das, was Gaslighting so schwer greifbar macht: den Zweifel an der eigenen Wahrnehmung und Erinnerung, das Bagatellisieren deiner Gefühle, die Schuldumkehr, das Einspannen Dritter und den verinnerlichten Selbstzweifel. Er stellt keine Diagnose und verurteilt dein Gegenüber nicht – er hilft dir, dein Erleben ernst zu nehmen und deiner Wahrnehmung wieder zu vertrauen. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '10–12 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Gaslighting erkennt man selten an einem einzelnen Satz, sondern an einem Muster, das über die Zeit die eigene Sicherheit aushöhlt. Dieser Test hilft dir, vom diffusen „Stimmt was nicht mit mir?" zu einer klareren Einordnung zu kommen. Er bewertet nicht dein Gegenüber und stellt keine Diagnose. Antworte so ehrlich, wie es dir möglich ist; niemand außer dir sieht deine Antworten. Wenn dir eine Frage zu nahegeht, darfst du jederzeit pausieren.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, wo die Verunsicherung am größten ist. Welche einzelne Situation, nach der du an dir selbst gezweifelt hast, geht dir gerade am meisten nach?',
  },
  dimensions: [
    {
      key: 'realitaetszweifel',
      name: 'Zweifel an der eigenen Wahrnehmung',
      description: 'Wie sehr du an deiner Erinnerung und deinem Urteil zu zweifeln beginnst.',
      bands: [
        { min: 0, label: 'Fester Boden', tone: 'good', text: 'Du vertraust grundsätzlich deiner Erinnerung und deiner Wahrnehmung. Meinungsverschiedenheiten bringen dich nicht ins Wanken.' },
        { min: 40, label: 'Ins Wanken geraten', tone: 'watch', text: 'Nach Gesprächen fragst du dich öfter, ob du dich falsch erinnerst oder übertreibst. Dieser Zweifel ist eine verstehbare Wirkung von Widersprüchlichkeit – kein Beweis, dass mit dir etwas nicht stimmt.' },
        { min: 65, label: 'Verlorener Halt', tone: 'alert', text: 'Du traust deinem eigenen Urteil kaum noch und weißt oft nicht mehr, was wirklich vorgefallen ist. Genau das ist die tiefe Wirkung von Gaslighting. Deine Wahrnehmung ist ein ernstzunehmender Anfang – du darfst ihr wieder Gewicht geben.' },
      ],
    },
    {
      key: 'entwertung',
      name: 'Bagatellisieren & Gefühls-Abwertung',
      description: 'Wie oft dein Erleben kleingeredet oder zu deinem Problem erklärt wird.',
      bands: [
        { min: 0, label: 'Ernst genommen', tone: 'good', text: 'Wenn du etwas ansprichst, wird dein Gefühl gehört, auch wenn ihr uneinig seid. Es wird nicht gegen dich verwendet.' },
        { min: 40, label: 'Kleingeredet', tone: 'watch', text: 'Immer wieder wird aus „Das hat mich verletzt" ein „Du bist zu empfindlich". Dein Gefühl wird zum eigentlichen Problem gemacht – das nagt, auch wenn jeder Moment „klein" wirkt.' },
        { min: 65, label: 'Systematisch entwertet', tone: 'alert', text: 'Dein Erleben wird regelmäßig ins Lächerliche gezogen oder zu deinem Fehler erklärt. So lernst du, deinen eigenen Gefühlen zu misstrauen – ein zentrales Werkzeug von Gaslighting.' },
      ],
    },
    {
      key: 'schuldumkehr',
      name: 'Schuldumkehr',
      description: 'Wie oft du am Ende als der Schuldige dastehst, obwohl du verletzt wurdest.',
      bands: [
        { min: 0, label: 'Auf Augenhöhe', tone: 'good', text: 'Nach Konflikten könnt ihr beide Verantwortung tragen. Du musst dich nicht für Dinge entschuldigen, die dir angetan wurden.' },
        { min: 40, label: 'Wiederkehrende Umkehr', tone: 'watch', text: 'Häufig drehst am Ende du dich um und entschuldigst dich, obwohl du das Thema hattest. Das verschiebt die Wirklichkeit Stück für Stück zu deinen Lasten.' },
        { min: 65, label: 'Ständig der Schuldige', tone: 'alert', text: 'Was du ansprichst, endet fast immer damit, dass du der Schuldige bist. Diese Täter-Opfer-Umkehr verunsichert tief und verdient einen ehrlichen, geschützten Blick.' },
      ],
    },
    {
      key: 'isolation',
      name: 'Isolation & Dritte',
      description: 'Wie sehr andere gegen dich in Stellung gebracht werden und dein Rückhalt schwindet.',
      bands: [
        { min: 0, label: 'Rückhalt da', tone: 'good', text: 'Du hast Menschen, die dir Realität zurückspiegeln, und dein Gegenüber stellt sie nicht gegen dich. Dein Kreis bleibt intakt.' },
        { min: 40, label: 'Schwindender Rückhalt', tone: 'watch', text: 'Immer wieder heißt es, „alle" sähen dich kritisch, oder du ziehst Kontakte zurück, um Ärger zu vermeiden. Das schwächt deinen letzten festen Boden – die Außensicht.' },
        { min: 65, label: 'Isoliert', tone: 'alert', text: 'Du fühlst dich zunehmend allein und gegen scheinbar „alle" gestellt. Isolation ist ein Kernbaustein von Coercive Control – du musst das nicht allein tragen.' },
      ],
    },
    {
      key: 'selbstgaslighting',
      name: 'Verinnerlichter Selbstzweifel',
      description: 'Wie sehr du dein Erleben selbst kleinredest, bevor es jemand tut.',
      bands: [
        { min: 0, label: 'Bei dir', tone: 'good', text: 'Du kannst deine Wahrnehmung stehen lassen, ohne sie sofort zu widerrufen. Deine Gefühle dürfen gelten.' },
        { min: 40, label: 'Selbst-Kleinreden', tone: 'watch', text: 'Du ertappst dich oft bei „Ich übertreibe bestimmt" oder „So schlimm war es nicht" – noch bevor jemand widerspricht. Die fremde, zweifelnde Stimme klingt schon fast wie deine.' },
        { min: 65, label: 'Fremde Stimme als eigene', tone: 'alert', text: 'Du misstraust deinem Erleben grundsätzlich und redest dir fast alles klein. Dieses Selbst-Gaslighting ist die tiefste Spur – und genau hier beginnt die Rückkehr: dir wieder zu glauben.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Grundsätzlich tragfähig', tone: 'good', text: 'Über die Bereiche hinweg zeigt sich keine durchgehende Verunsicherung. Einzelne schwierige Momente kann es trotzdem geben – nimm sie ernst und behalte im Blick, wie du dich fühlst.' },
    { min: 40, label: 'Ernstzunehmende Verunsicherung', tone: 'watch', text: 'In mehreren Bereichen zieht es an deiner Sicherheit. Das macht dein Gegenüber nicht automatisch zum „Täter" – aber es lohnt sich, Situationen aufzuschreiben und mit jemandem zu sprechen, dem du vertraust.' },
    { min: 62, label: 'Deutliche Belastung', tone: 'alert', text: 'Vieles deutet auf ein Muster hin, das deine Wahrnehmung systematisch untergräbt. Das ernst zu nehmen ist kein Urteil über den anderen Menschen, sondern Fürsorge für dich. Du musst das nicht allein einordnen – eine Vertrauensperson oder Fachstelle kann helfen.' },
  ],
  questions: [
    // Zweifel an der eigenen Wahrnehmung
    { id: 'gl_r1', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'realitaetszweifel', text: 'Nach Gesprächen mit meinem Gegenüber zweifle ich an meiner eigenen Erinnerung.' },
    { id: 'gl_r2', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'realitaetszweifel', text: 'Mein Gegenüber bestreitet Dinge, bei denen ich mir eigentlich sicher war („Das habe ich nie gesagt").' },
    { id: 'gl_r3', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'realitaetszweifel', text: 'Ich verlasse Gespräche verwirrter, als ich hineingegangen bin.' },
    { id: 'gl_r4', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'realitaetszweifel', text: 'Ich habe angefangen, Dinge zu dokumentieren (Nachrichten, Notizen), um meiner eigenen Erinnerung zu glauben.' },
    { id: 'gl_r5', type: 'scale', section: 'Deine Wahrnehmung', dimension: 'realitaetszweifel', text: 'Ich vertraue darauf, dass meine Erinnerung mich nicht täuscht.', reverse: true },
    // Bagatellisieren & Gefühls-Abwertung
    { id: 'gl_e1', type: 'scale', section: 'Deine Gefühle', dimension: 'entwertung', text: 'Wenn ich etwas anspreche, das mich verletzt hat, heißt es, ich sei zu empfindlich.' },
    { id: 'gl_e2', type: 'scale', section: 'Deine Gefühle', dimension: 'entwertung', text: 'Meine Gefühle werden ins Lächerliche gezogen oder als Übertreibung abgetan.' },
    { id: 'gl_e3', type: 'scale', section: 'Deine Gefühle', dimension: 'entwertung', text: 'Am Ende geht es nicht mehr um das, was passiert ist, sondern darum, dass ich „ein Drama mache".' },
    { id: 'gl_e4', type: 'scale', section: 'Deine Gefühle', dimension: 'entwertung', text: 'Ich traue mich immer seltener zu sagen, dass mich etwas verletzt hat.' },
    { id: 'gl_e5', type: 'scale', section: 'Deine Gefühle', dimension: 'entwertung', text: 'Wenn ich sage, dass mich etwas trifft, wird das ernst genommen.', reverse: true },
    // Schuldumkehr
    { id: 'gl_s1', type: 'scale', section: 'Wer am Ende schuld ist', dimension: 'schuldumkehr', text: 'Wenn ich ein Problem anspreche, stehe am Ende ich als schuldig da.' },
    { id: 'gl_s2', type: 'scale', section: 'Wer am Ende schuld ist', dimension: 'schuldumkehr', text: 'Ich entschuldige mich für Dinge, die eigentlich mir angetan wurden.' },
    { id: 'gl_s3', type: 'scale', section: 'Wer am Ende schuld ist', dimension: 'schuldumkehr', text: 'Aus „Du hast mich verletzt" wird schnell „Du willst nur Streit".' },
    {
      id: 'gl_s4', type: 'single', section: 'Wer am Ende schuld ist', dimension: 'schuldumkehr',
      text: 'Wenn ich sage, dass mich etwas verletzt hat …',
      options: [
        { label: 'wird es gehört, und wir schauen es uns gemeinsam an.', value: 0 },
        { label: 'kommt es an, auch wenn es manchmal dauert.', value: 1 },
        { label: 'wird es abgetan oder umgedreht.', value: 3 },
        { label: 'drehe am Ende ich mich um und entschuldige mich.', value: 4 },
      ],
    },
    // Isolation & Dritte
    { id: 'gl_i1', type: 'scale', section: 'Rückhalt & Dritte', dimension: 'isolation', text: 'Mir wird gesagt, dass „alle" mich anstrengend oder schwierig finden.' },
    { id: 'gl_i2', type: 'scale', section: 'Rückhalt & Dritte', dimension: 'isolation', text: 'Andere Menschen werden gegen mich in Stellung gebracht („Sogar X findet, dass …").', flag: 'coercive-control', flagMin: 3 },
    { id: 'gl_i3', type: 'scale', section: 'Rückhalt & Dritte', dimension: 'isolation', text: 'Ich habe Kontakte zu Freund:innen oder Familie zurückgefahren, weil es sonst Ärger gibt.', flag: 'coercive-control', flagMin: 3 },
    { id: 'gl_i4', type: 'scale', section: 'Rückhalt & Dritte', dimension: 'isolation', text: 'Ich fühle mich mit meiner Sicht der Dinge zunehmend allein.' },
    { id: 'gl_i5', type: 'scale', section: 'Rückhalt & Dritte', dimension: 'isolation', text: 'Ich habe Menschen um mich, die mir ehrlich Realität zurückspiegeln.', reverse: true },
    // Verinnerlichter Selbstzweifel
    { id: 'gl_g1', type: 'scale', section: 'Deine innere Stimme', dimension: 'selbstgaslighting', text: 'Ich rede mir mein eigenes Erleben klein, bevor es jemand anderes tut.' },
    { id: 'gl_g2', type: 'scale', section: 'Deine innere Stimme', dimension: 'selbstgaslighting', text: 'Ich denke oft „Ich übertreibe bestimmt" oder „So schlimm war es nicht".' },
    { id: 'gl_g3', type: 'scale', section: 'Deine innere Stimme', dimension: 'selbstgaslighting', text: 'Bevor ich etwas fühle, frage ich mich, ob ich es überhaupt fühlen darf.' },
    { id: 'gl_g4', type: 'scale', section: 'Deine innere Stimme', dimension: 'selbstgaslighting', text: 'Ich kann eine Wahrnehmung stehen lassen, ohne sie sofort zu widerrufen.', reverse: true },
    {
      id: 'gl_g5', type: 'single', section: 'Deine innere Stimme', dimension: 'selbstgaslighting',
      text: 'Wenn ich ehrlich in mich hineinhöre, fühle ich mich in dieser Beziehung …',
      options: [
        { label: 'sicher und mir selbst nah.', value: 0 },
        { label: 'meistens sicher.', value: 1 },
        { label: 'oft verunsichert.', value: 2 },
        { label: 'häufig, als wüsste ich nicht mehr, was stimmt.', value: 3 },
        { label: 'immer wieder richtig ängstlich.', value: 4, flag: 'gewalt' },
      ],
    },
    // Freitext
    { id: 'gl_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Welche einzelne Situation, nach der du an dir gezweifelt hast, geht dir gerade nicht aus dem Kopf?' },
    { id: 'gl_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was würdest du einer guten Freundin oder einem guten Freund glauben, die oder der dir dasselbe erzählt?' },
    { id: 'gl_t3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wann und mit wem fühlst du dich deiner Wahrnehmung sicher?' },
  ],
  safety: true,
  safetyVariant: 'victim',
  disclaimer:
    'Dieser Test stellt keine Diagnose und bewertet dein Gegenüber nicht. Er hilft dir, dein eigenes Erleben einzuordnen. Anhaltendes Gaslighting ist eine Form psychischer Gewalt und trifft Menschen jeden Geschlechts. Wenn du dich nicht mehr sicher fühlst, wende dich an Menschen, die verbindlich helfen: Hilfetelefon Gewalt gegen Frauen 116 016, Hilfetelefon Gewalt an Männern 0800 123 9900, Telefonseelsorge 0800 111 0 111. Bei akuter Gefahr: Notruf 110 / 112.',
}
