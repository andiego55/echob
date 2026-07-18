import type { SelfTest } from '../types'

/**
 * Belastende Muster erkennen – dimensionaler Test (concern-Polarität: hoch = mehr Anzeichen).
 * Streng nicht-diagnostisch: bewertet Muster/Erleben, NICHT die andere Person. safety=true.
 */
export const belastendeMuster: SelfTest = {
  slug: 'belastende-muster',
  category: 'manipulation',
  title: 'Belastende Muster erkennen',
  teaser: 'Gaslighting, Silent Treatment, Schuldumkehr, Kontrolle, Abwertung – ein behutsamer, ehrlicher Selbstcheck.',
  description:
    'Dieser Selbsttest hilft dir einzuordnen, ob und wie stark belastende Muster wie Gaslighting, Silent Treatment, Schuldumkehr, Kontrolle oder Abwertung in deiner Beziehung vorkommen – ohne Diagnose, mit Blick auf dein Erleben. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '7–9 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  safety: true,
  intro:
    'Es geht hier nicht darum, der anderen Person ein Etikett zu geben. Es geht um dein Erleben und um wiederkehrende Muster. Antworte ehrlich – niemand außer dir sieht deine Antworten. Wenn eine Frage zu nah geht, überspring sie. Dein Bauchgefühl zählt.',
  echo: {
    opening_question:
      'Einige dieser Muster kommen dir offenbar bekannt vor. Welche Situation ist dir beim Ausfüllen als Erstes in den Sinn gekommen?',
  },
  dimensions: [
    {
      key: 'gaslighting',
      name: 'Gaslighting',
      description: 'Deine Wahrnehmung wird infrage gestellt.',
      bands: [
        { min: 0, label: 'Kaum Anzeichen', tone: 'good', text: 'Für dieses Muster gibt es bei dir wenig Hinweise. Vertrau deiner Wahrnehmung.' },
        { min: 35, label: 'Einzelne Anzeichen', tone: 'watch', text: 'Einige Situationen lassen dich an dir zweifeln. Es lohnt, genauer hinzusehen, woher dieser Zweifel kommt.' },
        { min: 60, label: 'Deutliche Anzeichen', tone: 'alert', text: 'Vieles deutet darauf hin, dass deine Wahrnehmung systematisch infrage gestellt wird. Dass du an deinem Gedächtnis zweifelst, sagt oft mehr über die Dynamik als über dich.' },
      ],
    },
    {
      key: 'silent_treatment',
      name: 'Silent Treatment',
      description: 'Schweigen und Liebesentzug als Mittel.',
      bands: [
        { min: 0, label: 'Kaum Anzeichen', tone: 'good', text: 'Rückzug als Bestrafung scheint bei euch kaum ein Thema zu sein.' },
        { min: 35, label: 'Einzelne Anzeichen', tone: 'watch', text: 'Schweigen und Liebesentzug kommen vor. Achte darauf, ob du dein Verhalten danach ausrichtest.' },
        { min: 60, label: 'Deutliche Anzeichen', tone: 'alert', text: 'Liebesentzug wird als Mittel eingesetzt – und du passt dich an, um ihn zu vermeiden. Zuwendung sollte keine Belohnung für Wohlverhalten sein.' },
      ],
    },
    {
      key: 'schuldumkehr',
      name: 'Schuldumkehr',
      description: 'Am Ende trägst du die Schuld.',
      bands: [
        { min: 0, label: 'Kaum Anzeichen', tone: 'good', text: 'Verantwortung scheint bei euch fair verteilt.' },
        { min: 35, label: 'Einzelne Anzeichen', tone: 'watch', text: 'Manchmal drehst du dich am Ende zur Schuldigen. Beobachte, wie aus deinem Anliegen das Leid der anderen Person wird.' },
        { min: 60, label: 'Deutliche Anzeichen', tone: 'alert', text: 'Immer wieder trägst du am Ende die Schuld – auch für Dinge, die nicht deine sind. Dieses ständige schlechte Gewissen ist ein Muster, kein Charakterzug.' },
      ],
    },
    {
      key: 'kontrolle',
      name: 'Kontrolle & Coercive Control',
      description: 'Einengung, Überwachung, Angst vor Konsequenzen.',
      bands: [
        { min: 0, label: 'Kaum Anzeichen', tone: 'good', text: 'Für Kontrolle oder Einengung gibt es wenig Hinweise.' },
        { min: 35, label: 'Einzelne Anzeichen', tone: 'watch', text: 'Es gibt Anzeichen von Kontrolle. Dass dein Radius kleiner wird, ist ernst zu nehmen.' },
        { min: 60, label: 'Deutliche Anzeichen', tone: 'alert', text: 'Kontrolle, Einengung und Angst vor Konsequenzen prägen deinen Alltag stark. Das kann über eine „schwierige Beziehung" hinausgehen – bitte nimm den Hinweis am Ende ernst.' },
      ],
    },
    {
      key: 'abwertung',
      name: 'Abwertung',
      description: 'Herabsetzung, offen oder als „Scherz".',
      bands: [
        { min: 0, label: 'Kaum Anzeichen', tone: 'good', text: 'Herabsetzung scheint bei euch kaum vorzukommen.' },
        { min: 35, label: 'Einzelne Anzeichen', tone: 'watch', text: 'Abwertungen – offen oder als Scherz – kommen vor. Sie hinterlassen Spuren, auch wenn sie „nicht so gemeint" sind.' },
        { min: 60, label: 'Deutliche Anzeichen', tone: 'alert', text: 'Regelmäßige Herabsetzung lässt dich klein und wertlos fühlen. Dein Selbstwert leidet unter einem Muster – nicht unter dir.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Insgesamt wenige Anzeichen', tone: 'good', text: 'In deinen Antworten zeigen sich kaum belastende Muster. Vertrau deiner Wahrnehmung – und deinem Bauchgefühl, wenn es doch einmal anschlägt.' },
    { min: 30, label: 'Einige belastende Muster', tone: 'watch', text: 'Mehrere Bereiche zeigen Anzeichen, die dich Kraft kosten. Das ist keine Diagnose der anderen Person – aber ein Grund, genauer hinzuschauen und dich nicht kleinreden zu lassen.' },
    { min: 55, label: 'Deutliche Belastung', tone: 'alert', text: 'In mehreren Bereichen zeigen sich deutliche, wiederkehrende Muster. Bitte nimm das ernst: Du musst das nicht allein einordnen. Sprich mit Echo darüber – und zieh, wenn möglich, professionelle Unterstützung hinzu.' },
  ],
  questions: [
    // Gaslighting
    { id: 'bm1', type: 'scale', section: 'Wahrnehmung', dimension: 'gaslighting', text: 'Mir wird gesagt, Dinge seien nie passiert, an die ich mich klar erinnere.' },
    { id: 'bm2', type: 'scale', section: 'Wahrnehmung', dimension: 'gaslighting', text: 'Nach Gesprächen zweifle ich häufig an meiner eigenen Wahrnehmung oder meinem Gedächtnis.' },
    { id: 'bm3', type: 'scale', section: 'Wahrnehmung', dimension: 'gaslighting', text: 'Mir wird das Gefühl gegeben, ich sei zu empfindlich oder „überdreht", wenn ich etwas anspreche.' },
    { id: 'bm4', type: 'scale', section: 'Wahrnehmung', dimension: 'gaslighting', text: 'Ich schreibe mir Dinge auf, um mir meiner eigenen Erinnerung sicher zu sein.' },
    // Silent Treatment
    { id: 'bm5', type: 'scale', section: 'Rückzug & Nähe', dimension: 'silent_treatment', text: 'Nach Konflikten werde ich mit Schweigen oder Liebesentzug bestraft.' },
    { id: 'bm6', type: 'scale', section: 'Rückzug & Nähe', dimension: 'silent_treatment', text: 'Ich passe mein Verhalten an, um dieses Schweigen zu vermeiden.' },
    { id: 'bm7', type: 'scale', section: 'Rückzug & Nähe', dimension: 'silent_treatment', text: 'Zuwendung fühlt sich an wie etwas, das ich mir verdienen muss.' },
    { id: 'bm8', type: 'scale', section: 'Rückzug & Nähe', dimension: 'silent_treatment', text: 'Es kommt vor, dass ich tagelang ignoriert werde, ohne dass darüber gesprochen wird.' },
    // Schuldumkehr
    { id: 'bm9', type: 'scale', section: 'Verantwortung', dimension: 'schuldumkehr', text: 'Am Ende eines Streits entschuldige ich mich, obwohl ich mich verletzt gefühlt habe.' },
    { id: 'bm10', type: 'scale', section: 'Verantwortung', dimension: 'schuldumkehr', text: 'Wenn ich ein Problem anspreche, geht es kurz darauf um das Leid der anderen Person.' },
    { id: 'bm11', type: 'scale', section: 'Verantwortung', dimension: 'schuldumkehr', text: 'Mir wird Verantwortung für Dinge zugeschoben, die ich nicht zu verantworten habe.' },
    { id: 'bm12', type: 'scale', section: 'Verantwortung', dimension: 'schuldumkehr', text: 'Ich habe oft ein schlechtes Gewissen, ohne genau zu wissen, wofür.' },
    // Kontrolle
    { id: 'bm13', type: 'scale', section: 'Kontrolle & Freiraum', dimension: 'kontrolle', text: 'Ich werde gefragt oder überprüft, wo ich bin, mit wem und wie lange.' },
    { id: 'bm14', type: 'scale', section: 'Kontrolle & Freiraum', dimension: 'kontrolle', text: 'Mein Kontakt zu Freund:innen oder Familie ist weniger geworden – auch, um Ärger zu vermeiden.' },
    { id: 'bm15', type: 'scale', section: 'Kontrolle & Freiraum', dimension: 'kontrolle', text: 'Über Geld, Zeit oder Alltag wird bestimmt, ohne dass ich wirklich mitrede.' },
    {
      id: 'bm16', type: 'multi', section: 'Kontrolle & Freiraum', dimension: 'kontrolle',
      text: 'Kommt eines dieser Dinge vor? (Mehrfachauswahl – oder keins)',
      help: 'Diese Punkte wiegen schwer. Ehrlich zu dir selbst zu sein, ist hier besonders wichtig.',
      options: [
        { label: 'Drohungen (mit Trennung, Konsequenzen, den Kindern)', value: 2 },
        { label: 'Kontrolle über mein Geld oder meine Papiere', value: 2 },
        { label: 'Ich darf bestimmte Menschen nicht mehr sehen', value: 2 },
        { label: 'Angst vor Wutausbrüchen bestimmt mein Verhalten', value: 2 },
      ],
    },
    // Abwertung
    { id: 'bm17', type: 'scale', section: 'Wertschätzung', dimension: 'abwertung', text: 'Ich werde herabgesetzt – offen oder als „Scherz" getarnt.' },
    { id: 'bm18', type: 'scale', section: 'Wertschätzung', dimension: 'abwertung', text: 'Meine Erfolge oder Gefühle werden kleingeredet.' },
    { id: 'bm19', type: 'scale', section: 'Wertschätzung', dimension: 'abwertung', text: 'Vor anderen werde ich blamiert oder lächerlich gemacht.' },
    { id: 'bm20', type: 'scale', section: 'Wertschätzung', dimension: 'abwertung', text: 'Ich fühle mich in der Beziehung zunehmend wertlos oder klein.' },
    // Freitext
    { id: 'bm_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Gibt es eine Situation, die dir immer wieder durch den Kopf geht? Beschreibe sie in ein, zwei Sätzen.' },
    { id: 'bm_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was hält dich gerade – und was macht dir am meisten Sorge?' },
  ],
  disclaimer:
    'Dieser Test stellt keine Diagnose und bewertet nicht die andere Person. Er ordnet dein Erleben und wiederkehrende Muster ein. Nur eine qualifizierte Fachperson kann im persönlichen Kontakt mehr feststellen.',
}
