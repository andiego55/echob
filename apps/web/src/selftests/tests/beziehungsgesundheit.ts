import type { SelfTest } from '../types'

/**
 * Beziehungsgesundheit – dimensionaler Test (positive Polarität: hoch = stabil).
 * Fünf Dimensionen, gemischt positiv/umgekehrt gepolt, plus Freitext-Reflexion.
 */
export const beziehungsgesundheit: SelfTest = {
  slug: 'beziehungsgesundheit',
  category: 'beziehung',
  title: 'Wie gesund ist meine Beziehung?',
  teaser: 'Ein ehrlicher Rundum-Blick auf fünf Bereiche: Kommunikation, Vertrauen, Nähe, Respekt und Konflikt.',
  description:
    'Der Beziehungsgesundheit-Test zeigt dir in fünf Dimensionen, wo deine Beziehung trägt und wo sie dich Kraft kostet – verständlich, ohne Diagnose. Am Ende kannst du das Ergebnis mit Echo besprechen.',
  duration: '6–8 Min',
  resultMode: 'dimensional',
  polarity: 'positive',
  intro:
    'Dieser Test gibt dir einen strukturierten Überblick über fünf Bereiche, die für das Wohlbefinden in einer Beziehung zentral sind. Es gibt keine richtigen oder falschen Antworten – antworte so, wie es sich für dich gerade anfühlt. Das Ergebnis ist ein Anhaltspunkt, keine Bewertung deiner Beziehung.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt in manchen Bereichen mehr Belastung als in anderen. Welcher Wert überrascht dich – oder trifft dich am meisten?',
  },
  dimensions: [
    {
      key: 'kommunikation',
      name: 'Kommunikation',
      description: 'Wie offen und sicher ihr miteinander sprecht.',
      bands: [
        { min: 0, label: 'Belastet', tone: 'watch', text: 'Vieles bleibt ungesagt oder eskaliert. Dass echtes Gehörtwerden fehlt, zehrt an dir – das verdient Aufmerksamkeit.' },
        { min: 40, label: 'Ausbaufähig', tone: 'mid', text: 'Reden klappt in guten Momenten, unter Druck wird es eng. Ein bewusster Gesprächsrahmen könnte viel verändern.' },
        { min: 70, label: 'Tragfähig', tone: 'good', text: 'Ihr sprecht offen und fühlt euch gehört. Das ist eine echte Ressource – gerade in schwierigen Phasen.' },
      ],
    },
    {
      key: 'vertrauen',
      name: 'Vertrauen',
      description: 'Verlässlichkeit und Sicherheit statt Kontrolle.',
      bands: [
        { min: 0, label: 'Erschüttert', tone: 'watch', text: 'Misstrauen und Unsicherheit kosten dich viel Kraft. Das ist ein wichtiges Signal, nicht nur ein Gefühl.' },
        { min: 40, label: 'Angekratzt', tone: 'mid', text: 'Das Vertrauen ist da, aber nicht selbstverständlich. Es lohnt, hinzuschauen, was es nährt und was es untergräbt.' },
        { min: 70, label: 'Stabil', tone: 'good', text: 'Du kannst dich verlassen und musst nicht kontrollieren. Dieses Grundvertrauen trägt viel.' },
      ],
    },
    {
      key: 'naehe',
      name: 'Nähe',
      description: 'Emotionale Verbundenheit und gemeinsame Zeit.',
      bands: [
        { min: 0, label: 'Einsam', tone: 'watch', text: 'Du fühlst dich in der Beziehung oft allein. Diese Einsamkeit zu zweit ist ernst zu nehmen.' },
        { min: 40, label: 'Auf Abstand', tone: 'mid', text: 'Nähe ist da, aber Alltag oder alte Verletzungen schieben sich oft dazwischen.' },
        { min: 70, label: 'Verbunden', tone: 'good', text: 'Ihr seid einander nah und nehmt euch Zeit. Diese Verbundenheit ist ein Fundament.' },
      ],
    },
    {
      key: 'respekt',
      name: 'Respekt & Grenzen',
      description: 'Achtung deiner Person und deiner Grenzen.',
      bands: [
        { min: 0, label: 'Untergraben', tone: 'watch', text: 'Deine Grenzen und dein Wert kommen zu kurz. Dass du dich klein machst, um Ärger zu vermeiden, ist ein deutliches Zeichen.' },
        { min: 40, label: 'Uneindeutig', tone: 'mid', text: 'Mal Augenhöhe, mal nicht. Achte darauf, wann du dich klein machst – und warum.' },
        { min: 70, label: 'Auf Augenhöhe', tone: 'good', text: 'Deine Grenzen und deine Person werden geachtet. Das ist die Basis für Sicherheit.' },
      ],
    },
    {
      key: 'konflikt',
      name: 'Konfliktkultur',
      description: 'Wie ihr mit Streit umgeht und wieder zueinanderfindet.',
      bands: [
        { min: 0, label: 'Zermürbend', tone: 'watch', text: 'Dieselben Streits, keine Versöhnung, Verletzungen. Das zermürbt – hier lohnt Unterstützung.' },
        { min: 40, label: 'Festgefahren', tone: 'mid', text: 'Einige Konflikte drehen sich im Kreis. Wiederkehrende Muster zu erkennen wäre der nächste Schritt.' },
        { min: 70, label: 'Konstruktiv', tone: 'good', text: 'Ihr streitet fair und findet wieder zueinander. Konflikt ist bei euch kein Beziehungskiller.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Stark belastet', tone: 'watch', text: 'In mehreren Bereichen fühlst du dich zurzeit belastet. Das ist keine Diagnose deiner Beziehung – aber ein ernstzunehmendes Signal, genauer hinzuschauen und dir Unterstützung zu holen.' },
    { min: 45, label: 'Gemischtes Bild', tone: 'mid', text: 'Es gibt Licht und Schatten. Einige Bereiche tragen, andere kosten dich Kraft. Der genaue Blick auf die einzelnen Dimensionen lohnt sich.' },
    { min: 70, label: 'Insgesamt tragfähig', tone: 'good', text: 'Deine Beziehung hat spürbare Stärken. Das heißt nicht, dass alles leicht ist – aber es gibt ein Fundament, auf dem sich aufbauen lässt.' },
  ],
  questions: [
    // Kommunikation
    { id: 'bg1', type: 'scale', section: 'Kommunikation', dimension: 'kommunikation', text: 'Ich kann sagen, was mich beschäftigt, ohne Angst vor der Reaktion.' },
    { id: 'bg2', type: 'scale', section: 'Kommunikation', dimension: 'kommunikation', text: 'Wenn wir reden, habe ich das Gefühl, wirklich gehört zu werden.' },
    { id: 'bg3', type: 'scale', section: 'Kommunikation', dimension: 'kommunikation', reverse: true, text: 'Wichtige Gespräche enden bei uns oft in Streit oder Schweigen.' },
    { id: 'bg4', type: 'scale', section: 'Kommunikation', dimension: 'kommunikation', reverse: true, text: 'Ich verschweige lieber Dinge, um keinen Konflikt auszulösen.' },
    // Vertrauen
    { id: 'bg5', type: 'scale', section: 'Vertrauen', dimension: 'vertrauen', text: 'Ich kann mich darauf verlassen, dass mein Gegenüber zu dem steht, was es sagt.' },
    { id: 'bg6', type: 'scale', section: 'Vertrauen', dimension: 'vertrauen', text: 'Versprechen werden bei uns meistens gehalten.' },
    { id: 'bg7', type: 'scale', section: 'Vertrauen', dimension: 'vertrauen', reverse: true, text: 'Ich habe oft ein ungutes Gefühl, ob ich alles über wichtige Dinge erfahre.' },
    { id: 'bg8', type: 'scale', section: 'Vertrauen', dimension: 'vertrauen', reverse: true, text: 'Ich ertappe mich dabei, die andere Person zu kontrollieren oder zu überprüfen.' },
    // Nähe
    { id: 'bg9', type: 'scale', section: 'Nähe', dimension: 'naehe', text: 'Ich fühle mich emotional mit meinem Gegenüber verbunden.' },
    { id: 'bg10', type: 'scale', section: 'Nähe', dimension: 'naehe', text: 'Wir nehmen uns bewusst Zeit füreinander.' },
    { id: 'bg11', type: 'scale', section: 'Nähe', dimension: 'naehe', reverse: true, text: 'Ich fühle mich in der Beziehung oft allein.' },
    {
      id: 'bg12', type: 'single', section: 'Nähe', dimension: 'naehe',
      text: 'Wenn es mir schlecht geht – wie erlebe ich die Reaktion meines Gegenübers meistens?',
      options: [
        { label: 'Ich behalte es lieber gleich für mich.', value: 0 },
        { label: 'Eher abwehrend oder genervt.', value: 1 },
        { label: 'Mal so, mal so.', value: 2 },
        { label: 'Ich werde aufgefangen und ernst genommen.', value: 4 },
      ],
    },
    // Respekt & Grenzen
    { id: 'bg13', type: 'scale', section: 'Respekt & Grenzen', dimension: 'respekt', text: 'Meine Grenzen werden respektiert, auch wenn sie unbequem sind.' },
    { id: 'bg14', type: 'scale', section: 'Respekt & Grenzen', dimension: 'respekt', text: 'Entscheidungen, die uns beide betreffen, treffen wir auf Augenhöhe.' },
    { id: 'bg15', type: 'scale', section: 'Respekt & Grenzen', dimension: 'respekt', reverse: true, text: 'Ich werde für meine Meinung oder meine Gefühle abgewertet.' },
    { id: 'bg16', type: 'scale', section: 'Respekt & Grenzen', dimension: 'respekt', reverse: true, text: 'Ich mache mich klein, um Ärger zu vermeiden.' },
    // Konfliktkultur
    { id: 'bg17', type: 'scale', section: 'Konfliktkultur', dimension: 'konflikt', text: 'Nach einem Streit finden wir wieder zueinander.' },
    { id: 'bg18', type: 'scale', section: 'Konfliktkultur', dimension: 'konflikt', text: 'Konflikte werden bei uns fair ausgetragen – ohne Verletzungen unter der Gürtellinie.' },
    { id: 'bg19', type: 'scale', section: 'Konfliktkultur', dimension: 'konflikt', reverse: true, text: 'Bei Streit fällt es einer Person schwer, jemals nachzugeben oder sich zu entschuldigen.' },
    { id: 'bg20', type: 'scale', section: 'Konfliktkultur', dimension: 'konflikt', reverse: true, text: 'Dieselben Themen führen bei uns immer wieder zum selben Streit.' },
    // Freitext
    { id: 'bg_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was funktioniert in deiner Beziehung gut – woran merkst du das?' },
    { id: 'bg_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wenn du eine Sache verändern könntest, welche wäre das?' },
  ],
  disclaimer:
    'Dieser Test ersetzt keine Paar- oder Einzelberatung. Er bildet deine momentane Sicht ab – nicht „die Wahrheit" über deine Beziehung.',
}
