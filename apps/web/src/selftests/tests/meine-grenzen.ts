import type { SelfTest } from '../types'

/**
 * Wo verlaufen meine Grenzen? – dimensionaler Test (concern: hoch = mehr Übergriffe).
 *
 * Der Test beantwortet bewusst NICHT die Frage „war das schlimm genug". Er misst, ob ein
 * erkennbares Nein übergangen wurde — und, in der fünften Dimension, was sich seither an
 * der schreibenden Person verändert hat. Das ist der belastbarere Anhaltspunkt: Die Schwere
 * eines Vorfalls verschiebt den Maßstab (was letztes Jahr undenkbar war, ist dieses Jahr der
 * Vergleichspunkt), das eigene Rechnen tut das nicht.
 *
 * Die körperlichen Items sind `single` mit ausdrücklichem „nie vorgekommen"-Zweig, nicht
 * `scale` mit `flagMin`. Grund wie bei `nach-dem-vertrauensbruch`: Auf einer Skala würde
 * jemand ohne jeden Vorfall der Aussage „danach kam nie eine Entschuldigung" zustimmen —
 * es gab ja nichts — und bekäme fälschlich den roten Sicherheitskasten.
 *
 * `gewalt` wird ab dem ersten Vorkommen gesetzt, nicht ab einer Häufigkeit. Ein einziges
 * Festhalten kann jahrelang wirken, ohne sich zu wiederholen.
 *
 * Deshalb liegen die Bänder von `koerperlich` ungewöhnlich tief (15 statt 40). Die Dimension
 * ist kein Spektrum, sondern eine Ja/Nein-Frage mit Abstufung: Ein Vorfall bei vier Items
 * ergibt rechnerisch 19 % — bei üblichen Schwellen stünde dort das Band »Nichts vorgefallen«
 * direkt neben einem roten Sicherheitskasten. Im Browserlauf ist genau das passiert.
 * Das Gesamtband braucht dafür keine Sonderbehandlung: Die Ergebnisseite ersetzt es
 * bereits selbst, sobald ein kritisches Flag gesetzt ist.
 */
export const meineGrenzen: SelfTest = {
  slug: 'meine-grenzen',
  category: 'beziehung',
  title: 'Wo verlaufen meine Grenzen?',
  teaser:
    'Räumlich, digital, sexuell, körperlich – vier Bereiche, in denen Grenzen übergangen werden können. Ohne die Frage, ob es schlimm genug war.',
  description:
    'Die häufigste Frage in diesem Bereich lautet: War das schon etwas? Sie führt in die Irre, weil sie nach der Schwere fragt statt nach dem Übergehen. Dieser Selbsttest schaut auf vier Bereiche – räumliche, digitale, sexuelle und körperliche Grenzen – und auf einen fünften: was sich seitdem an dir verändert hat. Er entscheidet nichts und benennt nichts für dich. Er ordnet, damit du weniger allein damit bist. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '8–12 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  safety: true,
  safetyVariant: 'victim',
  intro:
    'Ein Hinweis vorweg, weil er hier wichtiger ist als bei jedem anderen Test: Du musst nicht entscheiden, ob es schlimm genug war. Diese Frage stellen fast alle, und sie ist die falsche – sie misst den Schaden statt das Übergehen. Antworte einfach danach, was passiert ist. Ein zweiter Hinweis: Nicht zu widersprechen ist keine Zustimmung. Wenn du bei einer Frage denkst „aber ich habe ja nichts gesagt" – das ändert die Antwort nicht. Niemand außer dir sieht, was du hier einträgst.',
  echo: {
    opening_question:
      'Du musst nichts benennen und nichts einordnen. Fällt dir eine Situation ein, an die du seitdem oft denkst? Erzähl einfach, so genau oder so ungenau, wie es geht.',
  },
  disclaimer:
    'Dieser Test stellt keine Diagnose und trifft keine rechtliche Einordnung. Wenn du unsicher bist, ob das, was du erlebt hast, „zählt“ – genau diese Frage ist die häufigste an Beratungsstellen, und du musst dafür nichts wissen. Hilfetelefon Gewalt gegen Frauen: 116 016. Hilfetelefon Gewalt an Männern: 0800 1239900. Bei akuter Gefahr: 110.',
  dimensions: [
    {
      key: 'raum',
      name: 'Räumliche Grenzen',
      description: 'Ob dein Nein zu Nähe, Besuch und Rückzug respektiert wird.',
      explain:
        'Der Bereich, in dem es meistens anfängt — und der am leichtesten wegzuerklären ist, weil ja nichts passiert ist.',
      bands: [
        { min: 0, label: 'Werden gewahrt', tone: 'good', text: 'Dein Nein zu Nähe, Besuch und Alleinsein wird respektiert. Das ist keine Selbstverständlichkeit.' },
        { min: 40, label: 'Werden gedehnt', tone: 'watch', text: 'Deine Grenzen werden nicht respektiert, sondern verhandelt. Jede einzelne Situation ist erklärbar — die Reihe ist es weniger.' },
        { min: 65, label: 'Werden übergangen', tone: 'alert', text: 'Wo du bist und wann du allein sein darfst, entscheidest du nicht mehr allein. Das ist unabhängig davon, wie freundlich es abläuft.' },
      ],
    },
    {
      key: 'digital',
      name: 'Digitale Grenzen',
      description: 'Nachrichten, Standort, Zugänge – und ob du sie zurücknehmen könntest.',
      explain:
        'Hinterlässt keine Spuren und wird deshalb am spätesten erkannt. Die schärfste Frage ist nicht, was geteilt wird, sondern was passieren würde, wenn du es beendest.',
      bands: [
        { min: 0, label: 'Eigener Bereich', tone: 'good', text: 'Du hast einen digitalen Raum, der dir gehört. Was ihr teilt, habt ihr gemeinsam entschieden.' },
        { min: 40, label: 'Durchlässig', tone: 'watch', text: 'Einiges ist offen, ohne dass es je verabredet wurde. Prüf einmal die entscheidende Frage: Könntest du es zurücknehmen — und was käme dann?' },
        { min: 65, label: 'Unter Aufsicht', tone: 'alert', text: 'Dein digitaler Bereich steht offen, und du könntest ihn nicht schließen, ohne dass es etwas kostet. Was einmal Vereinbarung war, ist damit eine Bedingung geworden.' },
      ],
    },
    {
      key: 'sexuell',
      name: 'Sexuelle Grenzen',
      description: 'Ob ein Nein möglich ist – und ob es nichts kostet.',
      explain:
        'Zustimmung braucht vier Dinge: freiwillig, widerruflich, situationsbezogen, erkennbar. Eine Beziehung erzeugt keine dauerhafte Zustimmung.',
      bands: [
        { min: 0, label: 'Ein Nein ist möglich', tone: 'good', text: 'Du kannst nein sagen, und es kostet dich nichts. Das ist die Grundlage.' },
        { min: 40, label: 'Ein Nein kostet', tone: 'watch', text: 'Du kannst nein sagen, aber es hat Folgen — Kühle, Vorwürfe, Stimmung. Ein Ja, das ein Nein vermeidet, ist keine freie Entscheidung.' },
        { min: 65, label: 'Ein Nein kommt kaum vor', tone: 'alert', text: 'Du gibst nach, weichst aus oder erstarrst. Wenn du dich fragst, warum du nichts sagst: Erstarren ist keine Entscheidung, sondern eine unwillkürliche Schutzreaktion. Diese Frage ist nichts, wofür du dich verantworten musst — aber sie ist ein Grund, mit jemandem zu sprechen.' },
      ],
    },
    {
      key: 'koerperlich',
      name: 'Körperliche Grenzen',
      description: 'Festhalten, den Weg versperren, Gegenstände – auch wenn nichts passiert ist.',
      explain:
        'Hier misst der Test bewusst nicht die Schwere. Die Frage ist, ob körperliche Kraft eingesetzt wurde, um deinen Willen zu übergehen — und ob sich danach etwas an deinem Verhalten geändert hat.',
      bands: [
        { min: 0, label: 'Nichts vorgefallen', tone: 'good', text: 'In diesem Bereich ist nichts vorgekommen.' },
        { min: 15, label: 'Es gab etwas', tone: 'alert', text: 'Es hat etwas gegeben. Wenn du jetzt anfängst zu rechnen — es war ja nicht fest, es gab keinen blauen Fleck, andere erleben Schlimmeres —, dann ist genau das das Bemerkenswerte an deiner Antwort. Du musst es nicht benennen. Aber du darfst darüber sprechen, ohne sicher zu sein, dass es zählt.' },
        { min: 40, label: 'Mehrfach', tone: 'alert', text: 'Es ist nicht bei einem Mal geblieben. Ob die Abstände kürzer werden, ist dabei die wichtigere Frage als die Schwere der einzelnen Vorfälle. Bitte sprich mit einer Beratungsstelle — du musst dafür nichts entschieden haben.' },
      ],
    },
    {
      key: 'veraenderung',
      name: 'Was sich an dir verändert hat',
      description: 'Das Rechnen, das Vorsichtigwerden, das Wegerklären.',
      explain:
        'Der belastbarste Bereich dieses Tests. Die Schwere eines Vorfalls verschiebt den Maßstab; was sich an dir verändert hat, tut das nicht.',
      bands: [
        { min: 0, label: 'Du bist noch du', tone: 'good', text: 'Du rechnest nicht und musst dir nichts wegerklären.' },
        { min: 40, label: 'Vorsichtiger geworden', tone: 'watch', text: 'Du wägst ab, prüfst die Stimmung, erklärst dir Dinge. Das ist ein leiser Schaden, den viele erst spät bemerken — und er sagt oft mehr aus als der Vorfall, der ihn ausgelöst hat.' },
        { min: 65, label: 'Deutlich verändert', tone: 'alert', text: 'Du rechnest, du wägst vor jedem Satz ab, und du hast Sätze parat, die alles kleiner machen. Diese Sätze sind keine Feigheit — sie sind der Versuch, mit jemandem weiterleben zu können. Sie haben nur einen Preis: Sie verschieben den Maßstab jedes Mal ein Stück.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Weitgehend gewahrt', tone: 'good', text: 'Über die Bereiche hinweg werden deine Grenzen weitgehend gewahrt. Einzelne höhere Werte kannst du trotzdem ernst nehmen — schau, welcher Bereich heraussticht.' },
    { min: 30, label: 'Etwas gerät in Bewegung', tone: 'watch', text: 'In mindestens einem Bereich werden deine Grenzen gedehnt. Das muss nichts Großes bedeuten und ist ein guter Zeitpunkt, es anzusprechen — solange es noch um eine einzelne Sache geht und nicht um ein Muster.' },
    { min: 55, label: 'Ernst zu nehmen', tone: 'alert', text: 'Mehrere Bereiche zeigen, dass deine Grenzen übergangen werden. Der wichtigste Blick geht jetzt auf den letzten Bereich: Wenn sich dein eigenes Verhalten deutlich verändert hat, ist das die belastbarste Auskunft in diesem ganzen Test — unabhängig davon, wie klein die einzelnen Vorfälle wirken. Du musst nicht sicher sein, dass es schlimm genug ist, um mit einer Beratungsstelle zu sprechen. Genau diese Unsicherheit ist der häufigste Grund, dort anzurufen.' },
  ],
  questions: [
    // ── Räumliche Grenzen ──────────────────────────────────────────────────
    { id: 'gr_r1', type: 'scale', section: 'Raum und Nähe', dimension: 'raum', text: 'Mein Wunsch, allein zu sein, wird respektiert.', reverse: true },
    { id: 'gr_r2', type: 'scale', section: 'Raum und Nähe', dimension: 'raum', text: 'Es ist schon vorgekommen, dass jemand da war, obwohl ich gesagt hatte, ich möchte das nicht.' },
    { id: 'gr_r3', type: 'scale', section: 'Raum und Nähe', dimension: 'raum', text: 'Wenn ich einen Raum verlassen will, kann ich das.', reverse: true },
    { id: 'gr_r4', type: 'scale', section: 'Raum und Nähe', dimension: 'raum', text: 'Ich sage inzwischen lieber, dass ich nicht da bin, als dass ich Zeit für mich brauche.' },
    { id: 'gr_r5', type: 'scale', section: 'Raum und Nähe', dimension: 'raum', text: 'Körperliche Nähe kommt auch dann, wenn ich mich abwende.' },
    // ── Digitale Grenzen ───────────────────────────────────────────────────
    { id: 'gr_d1', type: 'scale', section: 'Digitales', dimension: 'digital', text: 'Meine Nachrichten sind für mich allein.', reverse: true },
    { id: 'gr_d2', type: 'scale', section: 'Digitales', dimension: 'digital', text: 'Es kommen Fragen zu Dingen, die man nur über Standort oder Verläufe wissen kann.' },
    {
      id: 'gr_d3', type: 'scale', section: 'Digitales', dimension: 'digital',
      text: 'Ich könnte eine digitale Absprache zurücknehmen, ohne dass es Ärger gäbe.', reverse: true,
      intent: 'Die schärfste Frage des Bereichs: Was sich nicht zurücknehmen lässt, war keine Vereinbarung, sondern eine Bedingung.',
    },
    { id: 'gr_d4', type: 'scale', section: 'Digitales', dimension: 'digital', text: 'Ich überlege mir, wie etwas aussehen könnte, bevor ich es tue.' },
    { id: 'gr_d5', type: 'scale', section: 'Digitales', dimension: 'digital', text: 'Passwörter oder Entsperrcodes sind bei uns selbstverständlich geteilt — auch wenn ich es lieber anders hätte.' },
    // ── Sexuelle Grenzen ───────────────────────────────────────────────────
    { id: 'gr_s1', type: 'scale', section: 'Sexuelle Grenzen', dimension: 'sexuell', text: 'Ich kann nein sagen, ohne dass es Folgen hat.', reverse: true },
    { id: 'gr_s2', type: 'scale', section: 'Sexuelle Grenzen', dimension: 'sexuell', text: 'Es ist vorgekommen, dass ich zugestimmt habe, obwohl ich nicht wollte.' },
    { id: 'gr_s3', type: 'scale', section: 'Sexuelle Grenzen', dimension: 'sexuell', text: 'Es wird nachgefasst, bis ich nachgebe.' },
    { id: 'gr_s4', type: 'scale', section: 'Sexuelle Grenzen', dimension: 'sexuell', text: 'Es ist vorgekommen, dass ich mich nicht bewegen oder nichts sagen konnte, obwohl ich wollte.' },
    { id: 'gr_s5', type: 'scale', section: 'Sexuelle Grenzen', dimension: 'sexuell', text: 'Wenn ich mittendrin nicht mehr will, kann ich das sagen.', reverse: true },
    // ── Körperliche Grenzen ────────────────────────────────────────────────
    // Einfachauswahl mit „nie"-Zweig statt Skala: Sonst bekäme jemand ohne jeden Vorfall
    // den roten Sicherheitskasten, weil er einer Verneinung zustimmt.
    {
      id: 'gr_k1', type: 'single', section: 'Körperliche Grenzen', dimension: 'koerperlich',
      text: 'Ist es vorgekommen, dass du festgehalten wurdest, am Weggehen gehindert oder in eine Ecke gedrängt?',
      help: 'Auch dann, wenn es kurz war, nicht wehgetan hat und danach eine Entschuldigung kam.',
      options: [
        { label: 'Nein, nie', value: 0 },
        { label: 'Einmal', value: 3, flag: 'gewalt' },
        { label: 'Mehrmals', value: 4, flag: 'gewalt' },
      ],
      intent: 'Wird ab dem ersten Mal ernst genommen — nicht ab einer Häufigkeit. Ein einziges Festhalten kann jahrelang wirken.',
    },
    {
      id: 'gr_k2', type: 'single', section: 'Körperliche Grenzen', dimension: 'koerperlich',
      text: 'Ist es vorgekommen, dass in deiner Nähe etwas geworfen, zerschlagen oder mit Wucht getroffen wurde?',
      help: 'Auch wenn es nicht gegen dich gerichtet war — gegen eine Wand, eine Tür, einen Gegenstand.',
      options: [
        { label: 'Nein, nie', value: 0 },
        { label: 'Einmal', value: 3, flag: 'gewalt' },
        { label: 'Mehrmals', value: 4, flag: 'gewalt' },
      ],
    },
    {
      id: 'gr_k3', type: 'single', section: 'Körperliche Grenzen', dimension: 'koerperlich',
      text: 'Falls etwas vorgekommen ist: Hat es sich wiederholt, und wurden die Abstände kürzer?',
      options: [
        { label: 'Es ist nichts vorgekommen', value: 0 },
        { label: 'Es blieb bei einem Mal', value: 1 },
        { label: 'Es hat sich wiederholt, aber selten', value: 3 },
        { label: 'Die Abstände werden kürzer', value: 4, flag: 'gewalt' },
      ],
      intent: 'Die Entwicklung sagt mehr aus als die Schwere des einzelnen Vorfalls.',
    },
    {
      id: 'gr_k4', type: 'single', section: 'Körperliche Grenzen', dimension: 'koerperlich',
      text: 'Falls etwas vorgekommen ist: Hat sich danach etwas an deinem Verhalten geändert?',
      help: 'Zum Beispiel: leiser reden, den Raum wechseln, Themen meiden, die Tür abschließen.',
      options: [
        { label: 'Es ist nichts vorgekommen', value: 0 },
        { label: 'Nein, nichts', value: 1 },
        { label: 'Ein wenig', value: 3 },
        { label: 'Ja, deutlich', value: 4 },
      ],
    },
    // ── Was sich an dir verändert hat ──────────────────────────────────────
    { id: 'gr_v1', type: 'scale', section: 'Du selbst', dimension: 'veraenderung', text: 'Ich habe Sätze parat, die das Vorgefallene kleiner machen.' },
    { id: 'gr_v2', type: 'scale', section: 'Du selbst', dimension: 'veraenderung', text: 'Ich vergleiche mit dem, was anderen passiert, und komme zu dem Schluss, dass es bei mir nicht schlimm ist.' },
    { id: 'gr_v3', type: 'scale', section: 'Du selbst', dimension: 'veraenderung', text: 'Ich prüfe die Stimmung, bevor ich etwas anspreche.' },
    { id: 'gr_v4', type: 'scale', section: 'Du selbst', dimension: 'veraenderung', text: 'Ich habe angefangen, etwas nicht mehr zu tun, ohne dass jemand es verlangt hätte.' },
    { id: 'gr_v5', type: 'scale', section: 'Du selbst', dimension: 'veraenderung', text: 'Ich habe jemandem davon erzählt und bin mittendrin abgebogen.' },
    { id: 'gr_v6', type: 'scale', section: 'Du selbst', dimension: 'veraenderung', text: 'Ich fühle mich in meiner eigenen Wohnung entspannt.', reverse: true },
    // ── Zum Nachdenken (nicht gewertet) ────────────────────────────────────
    {
      id: 'gr_x1', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was würdest du einer Freundin sagen, die dir genau das erzählt, was du hier eingetragen hast?',
      help: 'Diese Frage beantworten fast alle sofort — und anders als für sich selbst.',
    },
    {
      id: 'gr_x2', type: 'text', section: 'Zum Nachdenken', optional: true,
      text: 'Was machst du heute anders als vor einem Jahr?',
      help: 'Nicht was du fühlst. Was du tust oder lässt.',
    },
  ],
}
