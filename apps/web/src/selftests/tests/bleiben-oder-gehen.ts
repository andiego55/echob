import type { SelfTest } from '../types'

/**
 * Bleiben oder gehen? – dimensionaler Test (concern-Polarität: hoch = mehr Signale,
 * dass eine echte Entscheidung ansteht). Entscheidet bewusst NICHTS für die Person:
 * bildet das eigene Erleben in fünf Bereichen ab. safety=true (kann Gewalt/Angst
 * sichtbar machen). Streng nicht-diagnostisch.
 */
export const bleibenOderGehen: SelfTest = {
  slug: 'bleiben-oder-gehen',
  category: 'trennung',
  title: 'Bleiben oder gehen? Eine ehrliche Standortbestimmung',
  teaser:
    'Wenn du zwischen „ich kann nicht mehr" und „vielleicht wird es besser" hin- und hergerissen bist: fünf Bereiche, die dir helfen, klarer zu sehen.',
  description:
    'Dieser Selbsttest ist keine Entscheidung für dich – er sortiert dein Erleben in fünf Bereichen: Belastung, fehlende Grundlagen, Stillstand, dein Zukunftsbild und was dich eigentlich hält. So siehst du klarer, ob eine echte Klärung ansteht – ob das Veränderung, Grenzen oder ein Abschied bedeutet, bleibt bei dir. Das Ergebnis kannst du anschließend mit Echo besprechen. Ohne Diagnose.',
  duration: '10–14 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  safety: true,
  intro:
    'Fast niemand macht diesen Test aus Neugier. Wahrscheinlich trägst du die Frage schon länger mit dir. Wichtig vorweg: Dieser Test entscheidet nichts für dich und sagt dir nicht, was „richtig" ist. Er hilft dir nur, dein eigenes Erleben zu ordnen – ehrlich, ohne Beschönigung und ohne Drama. Antworte so, wie es sich gerade anfühlt, nicht wie es sein „sollte". Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, wo es dich gerade am meisten zieht. Was war beim Ausfüllen der Moment, an dem du innerlich am deutlichsten „ja, genau das" gedacht hast?',
  },
  dimensions: [
    {
      key: 'belastung',
      name: 'Belastung & Erschöpfung',
      description: 'Wie viel Kraft dich die Beziehung kostet – und wie wenig zurückkommt.',
      bands: [
        { min: 0, label: 'Tragbar', tone: 'good', text: 'Die Beziehung kostet dich mal Kraft, gibt dir aber spürbar auch etwas zurück. Anstrengung gehört dazu – zermürbend ist es (noch) nicht.' },
        { min: 40, label: 'Auszehrend', tone: 'watch', text: 'Du gibst deutlich mehr, als zurückkommt, und trägst die Beziehung oft allein. Diese Schieflage auf Dauer auszuhalten, zehrt an deiner Substanz – das ist ein ernstes Signal, kein Zeichen von Schwäche.' },
        { min: 65, label: 'Zermürbend', tone: 'alert', text: 'Die Beziehung erschöpft dich bis in den Alltag hinein – Schlaf, Körper, Lebensfreude. Wenn eine Verbindung dauerhaft mehr nimmt, als sie gibt, ist das ein sehr lauter Hinweis, dass sich etwas ändern muss.' },
      ],
    },
    {
      key: 'grundlagen',
      name: 'Fehlende Grundlagen',
      description: 'Sicherheit, Respekt und Verlässlichkeit – das Fundament, auf dem alles steht.',
      bands: [
        { min: 0, label: 'Fundament trägt', tone: 'good', text: 'Trotz aller Probleme sind die Grundlagen da: Du fühlst dich im Kern sicher, geachtet und kannst dich verlassen. Auf diesem Boden lässt sich vieles reparieren.' },
        { min: 40, label: 'Brüchig', tone: 'watch', text: 'Das Fundament hat Risse – mal Respekt, mal Abwertung; mal verlässlich, mal nicht. Diese Unsicherheit kostet dich Kraft und macht echtes Vertrauen schwer.' },
        { min: 65, label: 'Untergraben', tone: 'alert', text: 'Sicherheit, Respekt oder Verlässlichkeit fehlen im Kern. Wenn das Fundament fehlt, hilft auch Liebe nicht darüber hinweg – hier geht es um deine Grundbedürfnisse, nicht um Kleinigkeiten. Bitte hol dir dafür Unterstützung.' },
      ],
    },
    {
      key: 'stillstand',
      name: 'Stillstand trotz Bemühens',
      description: 'Ob sich etwas bewegt – oder sich alles im Kreis dreht.',
      bands: [
        { min: 0, label: 'In Bewegung', tone: 'good', text: 'Ihr entwickelt euch – Gespräche führen zu echten Veränderungen, auch wenn es dauert. Bewegung ist da, und das nährt Hoffnung, die auf etwas Realem steht.' },
        { min: 40, label: 'Zäh', tone: 'watch', text: 'Vieles dreht sich im Kreis: dieselben Gespräche, kurze Besserung, dann wieder von vorn. Zu prüfen, ob echte Veränderung möglich ist oder nur versprochen wird, wäre der nächste ehrliche Schritt.' },
        { min: 65, label: 'Festgefahren', tone: 'alert', text: 'Du versuchst es seit Langem, und im Kern ändert sich nichts. Wenn Hoffnung nur noch aus Versprechen besteht, die nicht eingelöst werden, klammerst du dich womöglich an ein „Könnte", nicht an ein „Ist".' },
      ],
    },
    {
      key: 'zukunft',
      name: 'Zukunftsbild',
      description: 'Ob du dir eine gute gemeinsame Zukunft noch vorstellen kannst.',
      bands: [
        { min: 0, label: 'Ein Bild ist da', tone: 'good', text: 'Du kannst dir eine gemeinsame Zukunft vorstellen, die sich gut anfühlt – nicht perfekt, aber lebendig. Dieses Bild ist eine wichtige Ressource.' },
        { min: 40, label: 'Verblassend', tone: 'watch', text: 'Das Bild einer gemeinsamen Zukunft wird blasser, oder du malst es dir nur noch aus, wenn sich alles ändern würde. Achte darauf, ob du an der Person hängst – oder an der Hoffnung, wer sie werden könnte.' },
        { min: 65, label: 'Erloschen', tone: 'alert', text: 'Du kannst dir eine gute gemeinsame Zukunft kaum noch vorstellen, oder der Gedanke daran macht dich eng. Wenn dein Herz in die Zukunft schaut und dort niemanden mehr sieht, sagt das viel.' },
      ],
    },
    {
      key: 'antrieb',
      name: 'Was dich hält: Angst oder Verbindung',
      description: 'Ob du aus echter Verbindung bleibst – oder eher aus Angst, Schuld oder Zwang.',
      bands: [
        { min: 0, label: 'Aus Verbindung', tone: 'good', text: 'Du bleibst vor allem, weil du diese Person willst – nicht, weil du dich vor dem Danach fürchtest. Das ist ein guter Grund; er trägt.' },
        { min: 40, label: 'Gemischt', tone: 'watch', text: 'Neben echter Verbindung ziehen auch Angst, Schuld oder praktische Zwänge (Geld, Wohnung, Kinder) mit. Diese Fäden zu entwirren – was ist Liebe, was ist Furcht? – ist wichtig, um frei zu entscheiden.' },
        { min: 65, label: 'Aus Angst', tone: 'alert', text: 'Vor allem Angst hält dich: vor dem Alleinsein, den Folgen, der Reaktion des Gegenübers. Aus Angst zu bleiben ist zutiefst menschlich – aber es ist kein Fundament, sondern eine Falle. Genau hier verdienst du Unterstützung.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Vieles trägt noch', tone: 'good', text: 'Die Signale, dass eine grundlegende Entscheidung ansteht, sind begrenzt. Das heißt nicht, dass alles leicht ist – aber es gibt Substanz, an der sich arbeiten lässt. Schau dir die einzelnen Bereiche an, in denen es hakt.' },
    { min: 40, label: 'Echter Klärungsbedarf', tone: 'watch', text: 'In mehreren Bereichen kostet dich die Beziehung viel. Das bedeutet nicht automatisch „Trennung" – aber es bedeutet, dass eine ehrliche, vielleicht begleitete Klärung ansteht: Was muss sich ändern, damit du bleiben kannst? Und was, wenn es sich nicht ändert?' },
    { min: 62, label: 'Laute Signale', tone: 'alert', text: 'Sehr vieles spricht dafür, dass diese Beziehung dich in ihrer jetzigen Form mehr kostet, als sie dir gibt. Das ist keine Aufforderung zu gehen – aber ein dringender Anlass, dich ernst zu nehmen und dir Unterstützung zu holen. Du musst diese Frage nicht allein tragen.' },
  ],
  questions: [
    // Belastung & Erschöpfung
    { id: 'bg1', type: 'scale', section: 'Wie geht es dir mit der Beziehung?', dimension: 'belastung', text: 'Die Beziehung kostet mich mehr Kraft, als sie mir gibt.' },
    { id: 'bg2', type: 'scale', section: 'Wie geht es dir mit der Beziehung?', dimension: 'belastung', text: 'Ich fühle mich durch die Beziehung oft leer, müde oder ausgebrannt.' },
    { id: 'bg3', type: 'scale', section: 'Wie geht es dir mit der Beziehung?', dimension: 'belastung', text: 'Die Anspannung wirkt sich auf meinen Alltag aus (Schlaf, Körper, Konzentration, Freude).' },
    { id: 'bg4', type: 'scale', section: 'Wie geht es dir mit der Beziehung?', dimension: 'belastung', text: 'Ich trage das Emotionale in der Beziehung fast allein.' },
    {
      id: 'bg5', type: 'single', section: 'Wie geht es dir mit der Beziehung?', dimension: 'belastung',
      text: 'Wenn ich an einen ganz normalen gemeinsamen Abend denke, ist mein erstes Gefühl …',
      options: [
        { label: 'Vorfreude oder Ruhe.', value: 0 },
        { label: 'Neutral – mal so, mal so.', value: 1 },
        { label: 'Eine leise Anspannung.', value: 3 },
        { label: 'Beklommenheit – ich bin auf der Hut.', value: 4 },
      ],
    },
    // Fehlende Grundlagen (Sicherheit, Respekt, Verlässlichkeit)
    { id: 'bg6', type: 'scale', section: 'Das Fundament', dimension: 'grundlagen', text: 'Ich werde abgewertet, lächerlich gemacht oder respektlos behandelt.' },
    { id: 'bg7', type: 'scale', section: 'Das Fundament', dimension: 'grundlagen', text: 'Ich kann mich nicht wirklich auf mein Gegenüber verlassen.' },
    { id: 'bg8', type: 'scale', section: 'Das Fundament', dimension: 'grundlagen', text: 'Ich passe mein Verhalten an, um die Stimmung oder Ausbrüche meines Gegenübers zu vermeiden.' },
    { id: 'bg9', type: 'scale', section: 'Das Fundament', dimension: 'grundlagen', text: 'Meine Grenzen werden übergangen, egal wie klar ich sie mache.' },
    {
      id: 'bg10', type: 'scale', section: 'Das Fundament', dimension: 'grundlagen',
      text: 'Ich habe Angst vor meinem Gegenüber – vor Worten, Wut oder körperlicher Gewalt.',
      help: 'Wenn körperliche Gewalt, Drohungen oder Angst im Spiel sind, geht Sicherheit vor jeder Beziehungsfrage.',
      flag: 'gewalt', flagMin: 2,
    },
    // Stillstand trotz Bemühens
    { id: 'bg11', type: 'scale', section: 'Bewegt sich etwas?', dimension: 'stillstand', text: 'Wir führen immer wieder dieselben Gespräche, ohne dass sich etwas ändert.' },
    { id: 'bg12', type: 'scale', section: 'Bewegt sich etwas?', dimension: 'stillstand', text: 'Auf Besserung folgt bei uns zuverlässig der Rückfall ins alte Muster.' },
    { id: 'bg13', type: 'scale', section: 'Bewegt sich etwas?', dimension: 'stillstand', text: 'Ich habe schon oft gedacht „wenn sich X ändert, wird es gut" – und X ändert sich nicht.' },
    {
      id: 'bg14', type: 'single', section: 'Bewegt sich etwas?', dimension: 'stillstand',
      text: 'Meine Hoffnung, dass es besser wird, speist sich vor allem aus …',
      options: [
        { label: 'echten, sichtbaren Veränderungen in letzter Zeit.', value: 0 },
        { label: 'guten Phasen, die immer wieder kommen.', value: 2 },
        { label: 'Versprechen und Vorsätzen meines Gegenübers.', value: 3 },
        { label: 'der Erinnerung, wie es früher einmal war.', value: 4 },
      ],
    },
    // Zukunftsbild
    { id: 'bg15', type: 'scale', section: 'Der Blick nach vorn', dimension: 'zukunft', text: 'Ich kann mir eine gemeinsame Zukunft vorstellen, die sich gut anfühlt.', reverse: true },
    { id: 'bg16', type: 'scale', section: 'Der Blick nach vorn', dimension: 'zukunft', text: 'Wir entwickeln uns eher auseinander als aufeinander zu.' },
    { id: 'bg17', type: 'scale', section: 'Der Blick nach vorn', dimension: 'zukunft', text: 'Wenn ich ehrlich bin, hänge ich mehr an dem, wer mein Gegenüber sein könnte, als an dem, wer es ist.' },
    {
      id: 'bg18', type: 'single', section: 'Der Blick nach vorn', dimension: 'zukunft',
      text: 'Wenn ich mir vorstelle, dass alles genau so bleibt wie jetzt – für die nächsten fünf Jahre …',
      options: [
        { label: 'wäre das okay bis schön.', value: 0 },
        { label: 'wäre das anstrengend, aber machbar.', value: 2 },
        { label: 'macht mir dieser Gedanke Angst.', value: 3 },
        { label: 'weiß ich, dass ich das nicht durchhalten würde.', value: 4 },
      ],
    },
    // Was dich hält
    { id: 'bg19', type: 'scale', section: 'Was hält dich?', dimension: 'antrieb', text: 'Ich bleibe eher aus Angst vor dem Alleinsein als aus echter Verbundenheit.' },
    { id: 'bg20', type: 'scale', section: 'Was hält dich?', dimension: 'antrieb', text: 'Der Gedanke zu gehen macht mir vor allem wegen der Folgen Angst (Geld, Wohnung, Kinder, Reaktionen).' },
    { id: 'bg21', type: 'scale', section: 'Was hält dich?', dimension: 'antrieb', text: 'Ich habe Schuldgefühle bei dem Gedanken, mein Gegenüber zu verlassen – als würde ich etwas Schlimmes tun.' },
    { id: 'bg22', type: 'scale', section: 'Was hält dich?', dimension: 'antrieb', text: 'Ich bleibe auch, weil mir gesagt wird oder ich fürchte, ohne die Beziehung nicht zurechtzukommen.' },
    {
      id: 'bg23', type: 'single', section: 'Was hält dich?', dimension: 'antrieb',
      text: 'Wenn eine gute Freundin dir deine Beziehung genau so schildern würde, wie du sie erlebst – was würdest du ihr raten?',
      help: 'Manchmal sehen wir bei anderen klarer als bei uns selbst.',
      options: [
        { label: 'Bleib dran, das lohnt sich.', value: 0 },
        { label: 'Schau genau hin, aber gib nicht auf.', value: 1 },
        { label: 'Setz dir klare Bedingungen und eine Frist.', value: 3 },
        { label: 'Pass auf dich auf – so tut dir das nicht gut.', value: 4 },
      ],
    },
    // Freitext
    { id: 'bg_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was ist trotz allem gut an dieser Beziehung – und was würdest du am meisten vermissen?' },
    { id: 'bg_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was hast du bereits versucht, um etwas zu verändern – und was ist dabei passiert?' },
    { id: 'bg_t3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wovor hast du mehr Angst: dass es so bleibt, wie es ist – oder zu gehen? Schreib einfach drauflos.' },
  ],
  disclaimer:
    'Dieser Test trifft keine Entscheidung und ist keine Beratung. Er spiegelt deine momentane Sicht – nicht „die Wahrheit". Eine so wichtige Frage verdient Zeit und, wenn möglich, Begleitung. Bei Gewalt oder Angst um deine Sicherheit gilt Schutz vor allem anderen.',
}
