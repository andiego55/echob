import type { SelfTest } from '../types'

/**
 * Bindungsstil – Typologie-Test. Jede Frage lädt einen der drei Stile.
 * Ergebnis = dominanter Typ + Verteilung. Nicht-diagnostisch: Tendenz, kein Etikett.
 */
export const bindungsstil: SelfTest = {
  slug: 'bindungsstil',
  category: 'persoenlichkeit',
  title: 'Welcher Bindungsstil steckt in mir?',
  teaser: 'Sicher, ängstlich oder vermeidend? 15 Situationen zeigen dir deine Tendenz – und was sie über dich erzählt.',
  description:
    'Der Bindungsstil-Test ordnet anhand konkreter Situationen ein, wie du in Beziehungen mit Nähe, Abstand und Verlust umgehst – sicher, ängstlich oder vermeidend. Kein Etikett, sondern eine Tendenz, die du danach mit Echo vertiefen kannst.',
  duration: '5–7 Min',
  resultMode: 'typology',
  intro:
    'Dein Bindungsstil beschreibt, wie du – oft schon früh gelernt – mit Nähe und Abstand umgehst. Er ist kein fester Stempel: Er kann sich je nach Gegenüber zeigen und sich mit der Zeit wandeln. Wähle bei jeder Situation die Antwort, die dir am spontansten entspricht.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt eine Tendenz zu einem Bindungsstil. Woran erkennst du dieses Muster in deinen Beziehungen wieder?',
  },
  dimensions: [
    {
      key: 'sicher',
      name: 'Sicher gebunden',
      resultTagline: 'Nähe und Eigenständigkeit gehen bei dir zusammen.',
      resultText:
        'Du kannst dich auf andere einlassen, ohne dich selbst zu verlieren – und Abstand aushalten, ohne dich gleich verlassen zu fühlen. Konflikte bringen dich nicht sofort aus der Bahn; du vertraust darauf, dass sich Dinge klären lassen. Ein sicherer Bindungsstil ist keine Garantie – auch er gerät in belastenden Beziehungen ins Wanken. Aber er ist eine gute Grundlage. Achte darauf, dass du diese Sicherheit auch in schwierigen Dynamiken nicht kleinredest.',
    },
    {
      key: 'aengstlich',
      name: 'Ängstlich gebunden',
      resultTagline: 'Du sehnst dich nach Nähe – und fürchtest, sie zu verlieren.',
      resultText:
        'Nähe ist dir wichtig, fast lebenswichtig – und genau deshalb löst die Angst vor Verlust schnell großen Stress in dir aus. Du liest feine Signale, manchmal zu viele, und neigst dazu, dich anzupassen oder zu klammern, um die Verbindung zu sichern. Das ist keine Schwäche, sondern eine früh erlernte Schutzstrategie. In belastenden Beziehungen macht dich dieses Muster allerdings verletzlich für Menschen, die mit Nähe und Entzug spielen. Dir selbst zu vertrauen – dass du auch allein sicher bist – ist dein Wachstumsweg.',
    },
    {
      key: 'vermeidend',
      name: 'Vermeidend gebunden',
      resultTagline: 'Unabhängigkeit fühlt sich sicherer an als Nähe.',
      resultText:
        'Du kommst gut allein zurecht und schätzt deine Eigenständigkeit. Wird Nähe zu intensiv oder fordernd, spürst du den Drang, auf Abstand zu gehen – nicht aus Kälte, sondern weil zu viel Nähe sich unsicher anfühlt. Auch das ist eine früh erlernte Strategie: sich lieber auf sich selbst verlassen. In Beziehungen kann das dazu führen, dass dein Gegenüber sich ausgesperrt fühlt und du dich einsam fühlst, ohne es zu wollen. Dich in kleinen Schritten zu zeigen, ohne dich ausgeliefert zu fühlen, ist dein Wachstumsweg.',
    },
  ],
  questions: [
    {
      id: 'bs1', type: 'single', text: 'Wenn mein Gegenüber sich mal länger nicht meldet, denke ich zuerst …',
      options: [
        { label: 'Wahrscheinlich ist gerade viel los – ich mache mir keine großen Gedanken.', scores: { sicher: 2 } },
        { label: 'Habe ich etwas falsch gemacht? Ich werde unruhig.', scores: { aengstlich: 2 } },
        { label: 'Auch gut, dann habe ich meine Ruhe.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs2', type: 'single', text: 'Nähe in einer Beziehung …',
      options: [
        { label: 'genieße ich – ich kann sie zulassen und auch mal Abstand aushalten.', scores: { sicher: 2 } },
        { label: 'kann mir kaum genug sein; ich habe Angst, sie zu verlieren.', scores: { aengstlich: 2 } },
        { label: 'wird mir schnell zu viel; ich brauche dann Rückzug.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs3', type: 'single', text: 'Wenn es Streit gibt …',
      options: [
        { label: 'spreche ich es an und vertraue darauf, dass wir es klären.', scores: { sicher: 2 } },
        { label: 'gerate ich in Panik, dass alles vorbei sein könnte, und will sofort versöhnen.', scores: { aengstlich: 2 } },
        { label: 'ziehe ich mich zurück und mache dicht.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs4', type: 'single', text: 'Um Trost oder Hilfe zu bitten …',
      options: [
        { label: 'fällt mir leicht, wenn ich es brauche.', scores: { sicher: 2 } },
        { label: 'fällt mir schwer – ich will nicht zur Last fallen, sehne mich aber danach.', scores: { aengstlich: 2 } },
        { label: 'vermeide ich lieber; ich komme allein zurecht.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs5', type: 'single', text: 'Wenn eine Beziehung ernst und verbindlich wird …',
      options: [
        { label: 'freue ich mich auf die Verbindlichkeit.', scores: { sicher: 2 } },
        { label: 'klammere ich mich fester, aus Angst, sie könnte enden.', scores: { aengstlich: 2 } },
        { label: 'spüre ich den Drang, mir Freiraum zu sichern.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs6', type: 'single', text: 'Meine Bedürfnisse zeige ich …',
      options: [
        { label: 'offen und direkt.', scores: { sicher: 2 } },
        { label: 'mal überdeutlich, mal gar nicht – je nach Angst.', scores: { aengstlich: 2 } },
        { label: 'selten; ich behalte sie lieber für mich.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs7', type: 'single', text: 'Wenn mein Gegenüber Abstand braucht …',
      options: [
        { label: 'gönne ich ihm das und ruhe in mir.', scores: { sicher: 2 } },
        { label: 'fühle ich mich schnell zurückgewiesen und verlassen.', scores: { aengstlich: 2 } },
        { label: 'bin ich fast erleichtert.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs8', type: 'single', text: 'Über Gefühle reden …',
      options: [
        { label: 'tue ich, auch wenn es unangenehm ist.', scores: { sicher: 2 } },
        { label: 'tue ich viel – manchmal drehe ich mich im Kreis.', scores: { aengstlich: 2 } },
        { label: 'fällt mir schwer; ich weiß oft nicht, was ich fühle.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs9', type: 'single', text: 'Nach einer Trennung …',
      options: [
        { label: 'trauere ich, finde aber wieder Boden.', scores: { sicher: 2 } },
        { label: 'zerbreche ich fast und klammere mich an das, was war.', scores: { aengstlich: 2 } },
        { label: 'stürze ich mich in anderes und schaue nicht zurück.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs10', type: 'single', text: 'Auf die Verlässlichkeit meines Gegenübers …',
      options: [
        { label: 'vertraue ich grundsätzlich.', scores: { sicher: 2 } },
        { label: 'prüfe ich immer wieder, aus Sorge.', scores: { aengstlich: 2 } },
        { label: 'verlasse ich mich nicht unbedingt – lieber auf mich selbst.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs11', type: 'single', text: 'Wenn ich mich verletzlich zeige …',
      options: [
        { label: 'fühle ich mich meist sicher genug dafür.', scores: { sicher: 2 } },
        { label: 'habe ich danach oft Angst, zu viel gezeigt zu haben.', scores: { aengstlich: 2 } },
        { label: 'fühle ich mich schnell ausgeliefert.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs12', type: 'single', text: 'In der Kennenlernphase …',
      options: [
        { label: 'lasse ich es ruhig auf mich zukommen.', scores: { sicher: 2 } },
        { label: 'bin ich schnell sehr eingenommen und hänge an jeder Reaktion.', scores: { aengstlich: 2 } },
        { label: 'halte ich mir bewusst Optionen und Distanz offen.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs13', type: 'single', text: 'Der Gedanke, gebraucht zu werden …',
      options: [
        { label: 'ist schön und in Ordnung.', scores: { sicher: 2 } },
        { label: 'gibt mir Halt – fast zu sehr.', scores: { aengstlich: 2 } },
        { label: 'engt mich ein.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs14', type: 'single', text: 'Wenn mein Gegenüber mich kritisiert …',
      options: [
        { label: 'kann ich zuhören, ohne mich gleich bedroht zu fühlen.', scores: { sicher: 2 } },
        { label: 'bricht für mich kurz eine Welt zusammen.', scores: { aengstlich: 2 } },
        { label: 'mache ich innerlich zu und gehe auf Abstand.', scores: { vermeidend: 2 } },
      ],
    },
    {
      id: 'bs15', type: 'single', text: 'Alleinsein …',
      options: [
        { label: 'kann ich genießen und auch mal vermissen.', scores: { sicher: 2 } },
        { label: 'fällt mir schwer; ich fühle mich schnell einsam.', scores: { aengstlich: 2 } },
        { label: 'ist mein sicherer Hafen.', scores: { vermeidend: 2 } },
      ],
    },
    { id: 'bs_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Kennst du deine typischen Reaktionen auf Nähe und Abstand aus früheren Beziehungen oder aus deiner Kindheit? Was fällt dir dazu ein?' },
    { id: 'bs_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'In welcher Situation wünschst du dir, anders reagieren zu können?' },
  ],
  disclaimer:
    'Bindungsstile sind Modelle, keine Diagnosen. Die meisten Menschen tragen Anteile mehrerer Stile in sich – je nach Gegenüber und Lebensphase.',
}
