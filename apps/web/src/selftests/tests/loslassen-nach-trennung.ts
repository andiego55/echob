import type { SelfTest } from '../types'

/**
 * Loslassen nach der Trennung – dimensionaler Test (concern-Polarität: hoch = hält noch stark fest).
 * Fünf Bereiche: Sehnsucht/Idealisierung, Kontakt/Klammern, Grübeln/Hoffnung, Selbstwert, Neuorientierung.
 * Warm, ohne Zeitdruck, ohne Diagnose. Trauer darf sein; sanfte Krisen-Hinweise im Disclaimer.
 */
export const loslassenNachTrennung: SelfTest = {
  slug: 'loslassen-nach-trennung',
  category: 'trennung',
  title: 'Loslassen nach der Trennung: Wo stehst du?',
  teaser:
    'Sehnsucht, das Handy in der Hand, Gedanken im Kreis. Fünf Bereiche zeigen, woran dich die Trennung noch festhält – und wo du schon weitergehst.',
  description:
    'Dieser umfassende Selbsttest schaut in fünf Bereichen darauf, wie sehr eine Trennung dich noch festhält: Sehnsucht und Idealisierung, das Nicht-loslassen-Können von Kontakt, das Grübeln und Hoffen, den Selbstwert und die Neuorientierung. Kein Urteil, kein Zeitplan – ein warmer, ehrlicher Blick darauf, wo du gerade stehst. Das Ergebnis kannst du anschließend mit Echo besprechen. Ohne Diagnose.',
  duration: '10–14 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Eine Trennung ist ein Abschied – und Abschiede tun weh, egal wer gegangen ist. Es gibt kein „zu langsam" und kein „stell dich nicht so an". Dieser Test bewertet dich nicht und drängt dich zu nichts. Er hilft dir zu sehen, woran du noch festhältst und wo du schon weitergehst – damit du dir das geben kannst, was gerade dran ist. Antworte ehrlich; niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, woran dich die Trennung noch festhält. Was davon fühlt sich für dich gerade am schwersten an, loszulassen?',
  },
  dimensions: [
    {
      key: 'sehnsucht',
      name: 'Sehnsucht & Idealisierung',
      description: 'Wie sehr du dich zurücksehnst und vor allem das Gute erinnerst.',
      bands: [
        { min: 0, label: 'Wehmut ohne Sog', tone: 'good', text: 'Du vermisst manches, aber die Sehnsucht reißt dich nicht mehr weg. Du siehst die Beziehung realistisch – das Schöne und das Schwere.' },
        { min: 40, label: 'Die Sehnsucht zieht', tone: 'watch', text: 'Du sehnst dich oft zurück und erinnerst vor allem das Gute. Diese Verklärung ist menschlich – und sie macht das Loslassen schwerer, weil sie nur die halbe Wahrheit zeigt.' },
        { min: 65, label: 'Verklärt und vermisst', tone: 'alert', text: 'Du vermisst die Beziehung fast schmerzhaft und siehst sie durch einen goldenen Filter. Die Erinnerung zeigt das Gute überlebensgroß und blendet das Schwere aus. Das hält dich fest – an einem Bild, nicht an der Wirklichkeit.' },
      ],
    },
    {
      key: 'klammern',
      name: 'Kontakt & Nähe',
      description: 'Wie sehr du Kontakt suchst oder das Leben der anderen Person verfolgst.',
      bands: [
        { min: 0, label: 'Klarer Abstand', tone: 'good', text: 'Du hältst den Abstand, der dir guttut. Du musst nicht ständig wissen, wie es der anderen Person geht.' },
        { min: 40, label: 'Der Faden hält', tone: 'watch', text: 'Du suchst noch Kontakt oder verfolgst das Leben der anderen Person – ein Blick aufs Profil, eine Nachricht „aus Versehen". Jeder Kontakt öffnet die Wunde ein Stück neu.' },
        { min: 65, label: 'Nicht loslassen können', tone: 'alert', text: 'Du klammerst dich an jeden Kontakt, schaust immer wieder auf Social Media, suchst Nähe, obwohl es weh tut. Dieser Faden hält dich in der Vergangenheit. Abstand tut kurzfristig weh – und ist langfristig genau das, was heilt.' },
      ],
    },
    {
      key: 'gruebeln',
      name: 'Grübeln & Hoffnung',
      description: 'Wie sehr deine Gedanken kreisen – Schuld, Was-wäre-wenn, ein Zurück.',
      bands: [
        { min: 0, label: 'Die Gedanken beruhigen sich', tone: 'good', text: 'Du denkst zurück, aber die Gedanken drehen sich nicht mehr endlos. Du suchst nicht mehr nach dem einen Fehler, der alles erklärt.' },
        { min: 40, label: 'Das Karussell dreht', tone: 'watch', text: 'Du spielst Szenen immer wieder durch – „was, wenn ich anders …", „vielleicht doch noch mal". Dieses Grübeln fühlt sich nach Lösung an, führt aber im Kreis.' },
        { min: 65, label: 'Gefangen im Kreis', tone: 'alert', text: 'Deine Gedanken kreisen fast ununterbrochen: Schuld, Was-wäre-wenn, die Hoffnung auf ein Zurück. Grübeln ist kein Nachdenken, sondern eine Endlosschleife – sie hält die Wunde offen. Es lohnt, den Kreis bewusst zu unterbrechen.' },
      ],
    },
    {
      key: 'selbstwert',
      name: 'Selbstwert & Identität',
      description: 'Wie sehr die Trennung an deinem Wert und deinem Ich gerüttelt hat.',
      bands: [
        { min: 0, label: 'In dir verankert', tone: 'good', text: 'Die Trennung hat weh getan, aber sie hat deinen Wert nicht erschüttert. Du weißt, wer du bist – auch allein.' },
        { min: 40, label: 'Der Boden wackelt', tone: 'watch', text: 'Seit der Trennung zweifelst du mehr an dir; ein Teil von dir fragt, ob du liebenswert bist. Diese Zweifel gehören zur Wunde – sie sind nicht die Wahrheit über dich.' },
        { min: 65, label: 'Selbstwert im Einbruch', tone: 'alert', text: 'Die Trennung hat deinen Selbstwert tief getroffen – du fühlst dich wertlos, ersetzbar oder allein kaum lebensfähig. Das ist der Schmerz, der spricht, nicht die Realität. Du bist nicht weniger wert, weil eine Beziehung geendet hat.' },
      ],
    },
    {
      key: 'neuorientierung',
      name: 'Neuorientierung',
      description: 'Wie sehr du wieder nach vorn schaust und dir ein eigenes Leben aufbaust.',
      bands: [
        { min: 0, label: 'Du gehst weiter', tone: 'good', text: 'Du richtest dich neu aus – Alltag, Pläne, kleine Freuden gehören wieder dir. Der Blick geht, bei aller Wehmut, nach vorn.' },
        { min: 40, label: 'Der Blick hängt zurück', tone: 'watch', text: 'Nach vorn zu schauen fällt dir schwer; vieles erinnert noch an die Beziehung. Dir Stück für Stück ein eigenes Leben zurückzuholen, wäre der Weg – in kleinen, machbaren Schritten.' },
        { min: 65, label: 'Alles steht still', tone: 'alert', text: 'Dein Leben scheint pausiert, seit die Beziehung endete. Dieser Stillstand ist Teil der Trauer – und doch darfst du wieder anfangen zu leben, in winzigen Schritten, bevor du dich „bereit" fühlst.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Du bist auf dem Weg', tone: 'good', text: 'Die Trennung tut weh, aber du findest langsam zurück ins eigene Leben. Trauer und Weitergehen dürfen nebeneinander bestehen. Sei geduldig und freundlich mit dir.' },
    { min: 40, label: 'Du steckst noch fest', tone: 'watch', text: 'In mehreren Bereichen hält dich die Trennung noch fest – in Sehnsucht, Kontakt oder im Grübeln. Das ist nach einer Trennung normal und kein Rückschritt. Erlaube dir bewusst kleine Schritte nach vorn.' },
    { min: 62, label: 'Die Trennung hält dich fest', tone: 'alert', text: 'Die Trennung bestimmt gerade fast alles in dir. Dieser Schmerz ist echt und schwer – und du musst ihn nicht allein tragen. Wenn er dich lähmt oder du keinen Ausweg siehst, hol dir bitte Unterstützung.' },
  ],
  questions: [
    // Sehnsucht & Idealisierung
    { id: 'lt1', type: 'scale', section: 'Sehnsucht', dimension: 'sehnsucht', text: 'Ich sehne mich oft nach der Beziehung oder der Person zurück.' },
    { id: 'lt2', type: 'scale', section: 'Sehnsucht', dimension: 'sehnsucht', text: 'Wenn ich zurückdenke, fallen mir vor allem die schönen Momente ein.' },
    { id: 'lt3', type: 'scale', section: 'Sehnsucht', dimension: 'sehnsucht', text: 'Ich glaube, so etwas Gutes finde ich nicht wieder.' },
    { id: 'lt4', type: 'scale', section: 'Sehnsucht', dimension: 'sehnsucht', text: 'Lieder, Orte oder Gerüche lösen sofort schmerzhafte Sehnsucht aus.' },
    { id: 'lt5', type: 'scale', section: 'Sehnsucht', dimension: 'sehnsucht', text: 'Ich sehe die Beziehung heute realistisch – mit dem Schönen und dem Schweren.', reverse: true },
    // Kontakt & Nähe
    { id: 'lt6', type: 'scale', section: 'Kontakt & Nähe', dimension: 'klammern', text: 'Ich schaue auf Social Media, was die andere Person gerade macht.' },
    { id: 'lt7', type: 'scale', section: 'Kontakt & Nähe', dimension: 'klammern', text: 'Ich suche Gründe, um Kontakt aufzunehmen (Sachen abholen, „kurze Frage", …).' },
    { id: 'lt8', type: 'scale', section: 'Kontakt & Nähe', dimension: 'klammern', text: 'Ich habe Nachrichten oder Fotos aus der Beziehung immer wieder angeschaut.' },
    { id: 'lt9', type: 'scale', section: 'Kontakt & Nähe', dimension: 'klammern', text: 'Ich frage Gemeinsame nach der anderen Person aus.' },
    { id: 'lt10', type: 'scale', section: 'Kontakt & Nähe', dimension: 'klammern', text: 'Ich habe den Abstand gefunden, der mir guttut.', reverse: true },
    {
      id: 'lt11', type: 'single', section: 'Kontakt & Nähe', dimension: 'klammern',
      text: 'Wenn mein Daumen über dem Profil der anderen Person schwebt …',
      options: [
        { label: 'scrolle ich weiter, es zieht mich nicht.', value: 0 },
        { label: 'schaue ich selten, danach geht es mir okay.', value: 2 },
        { label: 'schaue ich oft und fühle mich danach schlechter.', value: 3 },
        { label: 'kann ich fast nicht widerstehen, mehrmals am Tag.', value: 4 },
      ],
    },
    // Grübeln & Hoffnung
    { id: 'lt12', type: 'scale', section: 'Deine Gedanken', dimension: 'gruebeln', text: 'Ich spiele die Trennung und was ich hätte anders machen können, immer wieder durch.' },
    { id: 'lt13', type: 'scale', section: 'Deine Gedanken', dimension: 'gruebeln', text: 'Ich suche nach dem einen Fehler oder Grund, der alles erklärt.' },
    { id: 'lt14', type: 'scale', section: 'Deine Gedanken', dimension: 'gruebeln', text: 'Ich hoffe insgeheim, dass wir wieder zusammenkommen.' },
    { id: 'lt15', type: 'scale', section: 'Deine Gedanken', dimension: 'gruebeln', text: 'Meine Gedanken kreisen so stark, dass ich schlecht schlafe oder mich schwer konzentriere.' },
    { id: 'lt16', type: 'scale', section: 'Deine Gedanken', dimension: 'gruebeln', text: 'Ich kann die Trennung als Tatsache annehmen, auch wenn sie weh tut.', reverse: true },
    {
      id: 'lt17', type: 'single', section: 'Deine Gedanken', dimension: 'gruebeln',
      text: 'Der Gedanke „vielleicht doch noch einmal" …',
      options: [
        { label: 'kommt mir kaum noch.', value: 0 },
        { label: 'taucht mal auf, ich lasse ihn ziehen.', value: 2 },
        { label: 'beschäftigt mich immer wieder.', value: 3 },
        { label: 'bestimmt einen großen Teil meines Tages.', value: 4 },
      ],
    },
    // Selbstwert & Identität
    { id: 'lt18', type: 'scale', section: 'Dein Selbstwert', dimension: 'selbstwert', text: 'Seit der Trennung zweifle ich stärker an meinem Wert.' },
    { id: 'lt19', type: 'scale', section: 'Dein Selbstwert', dimension: 'selbstwert', text: 'Ich fühle mich ersetzbar oder nicht liebenswert.' },
    { id: 'lt20', type: 'scale', section: 'Dein Selbstwert', dimension: 'selbstwert', text: 'Ohne die Beziehung weiß ich kaum, wer ich bin.' },
    { id: 'lt21', type: 'scale', section: 'Dein Selbstwert', dimension: 'selbstwert', text: 'Ich fühle mich allein kaum lebensfähig oder ständig einsam.' },
    { id: 'lt22', type: 'scale', section: 'Dein Selbstwert', dimension: 'selbstwert', text: 'Ich weiß, wer ich bin und was ich wert bin – auch ohne diese Beziehung.', reverse: true },
    // Neuorientierung (reverse: wenig Neuorientierung = hoher Wert = concern)
    { id: 'lt23', type: 'scale', section: 'Nach vorn', dimension: 'neuorientierung', text: 'Ich baue mir wieder einen Alltag auf, der mir gehört.', reverse: true },
    { id: 'lt24', type: 'scale', section: 'Nach vorn', dimension: 'neuorientierung', text: 'Ich unternehme wieder Dinge, die mir Freude machen.', reverse: true },
    { id: 'lt25', type: 'scale', section: 'Nach vorn', dimension: 'neuorientierung', text: 'Ich habe Menschen um mich, mit denen ich reden kann.', reverse: true },
    { id: 'lt26', type: 'scale', section: 'Nach vorn', dimension: 'neuorientierung', text: 'Ich kann mir eine gute Zukunft ohne diese Person vorstellen.', reverse: true },
    { id: 'lt27', type: 'scale', section: 'Nach vorn', dimension: 'neuorientierung', text: 'Mein Leben fühlt sich pausiert an, seit die Beziehung endete.' },
    {
      id: 'lt28', type: 'single', section: 'Nach vorn', dimension: 'neuorientierung',
      text: 'Wenn ich an die nächsten Monate denke …',
      options: [
        { label: 'sehe ich Dinge, auf die ich mich freue.', value: 0 },
        { label: 'ist da Unsicherheit, aber auch etwas Offenheit.', value: 2 },
        { label: 'sehe ich vor allem Leere.', value: 3 },
        { label: 'kann ich mir kaum vorstellen, dass es besser wird.', value: 4 },
      ],
    },
    { id: 'lt29', type: 'scale', section: 'Nach vorn', dimension: 'neuorientierung', text: 'Ich erlaube mir, neue Erfahrungen zu machen (Menschen, Orte, Interessen).', reverse: true },
    { id: 'lt30', type: 'scale', section: 'Nach vorn', dimension: 'selbstwert', text: 'Ich behandle mich in dieser Zeit freundlich und nachsichtig.', reverse: true },
    // Freitext
    { id: 'lt_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was vermisst du am meisten – und was davon war wirklich so, wie du es erinnerst?' },
    { id: 'lt_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was hat dir in dieser Beziehung nicht gutgetan? (Auch das gehört zur Wahrheit.)' },
    { id: 'lt_t3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was wäre ein kleiner Schritt, der wieder dir gehört – etwas nur für dich, diese Woche?' },
  ],
  disclaimer:
    'Trauer nach einer Trennung braucht Zeit – es gibt keinen „richtigen" Zeitplan und kein „zu langsam". Dieser Test bewertet dich nicht; er zeigt, woran du noch festhältst. Wenn der Schmerz dich lähmt oder du das Gefühl hast, nicht mehr weiterzuwissen, ist das ein Grund, Unterstützung zu holen – bei einer Fachperson oder, wenn es dir sehr schlecht geht, bei der Telefonseelsorge (0800 111 0 111, kostenlos, rund um die Uhr).',
}
