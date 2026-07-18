import type { SelfTest } from '../types'

const freq: { min: number; max: number; labels: [string, string] } = { min: 0, max: 4, labels: ['Nie', 'Sehr oft'] }

/**
 * Mein eigener Anteil – selbstgerichteter Test: Nutze ICH manipulative/kontrollierende
 * Muster? Concern-Polarität. safety='self'. Kritische Angaben (Kindesentzug, Gewalt,
 * ungeklärte Trennungsdrohung) werden über Flags markiert – unabhängig vom Durchschnitt.
 * Nicht beschämend, aber ehrlich. Keine Diagnose.
 */
export const eigenerAnteil: SelfTest = {
  slug: 'eigener-anteil',
  category: 'manipulation',
  title: 'Mein Anteil: Bin ich selbst manchmal manipulativ?',
  teaser: 'Ein mutiger, ehrlicher Selbstcheck über dein eigenes Konfliktverhalten – Druck, emotionale Dominanz, Kälte, Gaslighting – und wie sehr du reparierst.',
  description:
    'Dieser selbstgerichtete Test hilft dir, ehrlich hinzuschauen: Setze ich in meiner Partnerschaft selbst manipulative oder kontrollierende Muster ein – von Trennungsdrohung über emotionale Dominanz bis Gaslighting? Und wie sehr bemühe ich mich um echte Reparatur? Ohne Diagnose, ohne Beschämung. Das Ergebnis kannst du mit Echo besprechen.',
  duration: '8–11 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  safety: true,
  safetyVariant: 'self',
  intro:
    'Diesen Test zu machen, braucht Mut. Es geht nicht darum, dich zu einem schlechten Menschen zu erklären – fast alle Menschen greifen unter Druck manchmal zu unfairen Mitteln. Es geht darum, ehrlich zu sehen, was du selbst in Konflikte einbringst, damit du es verändern kannst. Antworte so aufrichtig, wie du kannst. Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Beim ehrlichen Ausfüllen ist dir wahrscheinlich eine konkrete Situation eingefallen. Welche war das – und wie ging es der anderen Person darin?',
  },
  dimensions: [
    {
      key: 'drohungen',
      name: 'Drohungen & Druckmittel',
      description: 'Trennungs-/Extremdrohungen, Erpressung, Einschüchterung.',
      bands: [
        { min: 0, label: 'Kaum Druckmittel', tone: 'good', text: 'Du setzt in Konflikten kaum auf Drohungen oder Druck. Das ist eine gute Basis für fairen Streit.' },
        { min: 30, label: 'Vereinzelt Druck', tone: 'watch', text: 'Manchmal greifst du zu Drohungen oder Druck, um dich durchzusetzen. Achte darauf, was das bei deinem Gegenüber an Angst auslöst.' },
        { min: 55, label: 'Deutliche Druckmittel', tone: 'alert', text: 'Du setzt spürbar auf Drohungen, Erpressung oder Einschüchterung. Das erzeugt Angst statt Nähe – und kann echten Schaden anrichten. Bitte nimm den Hinweis am Ende ernst.' },
      ],
    },
    {
      key: 'dominanz',
      name: 'Emotionale Dominanz & Kontrolle',
      description: 'Konflikte über Intensität und Lautstärke steuern.',
      bands: [
        { min: 0, label: 'Ausgeglichen', tone: 'good', text: 'Du dominierst Konflikte nicht über Emotion oder Lautstärke. Beide Seiten kommen zu Wort.' },
        { min: 30, label: 'Tendenz zu dominieren', tone: 'watch', text: 'In Konflikten übernimmst du öfter die Kontrolle – über Intensität, Dauerreden oder indem du das Gegenüber stehen lässt. Das kann den/die andere verstummen lassen.' },
        { min: 55, label: 'Starke Kontrolle', tone: 'alert', text: 'Du steuerst Konflikte stark über emotionale Dominanz. Wer emotional dominiert, kontrolliert die Situation – dein Gegenüber gibt vermutlich nach oder verstummt, nicht aus Einsicht, sondern aus Überforderung.' },
      ],
    },
    {
      key: 'passiv_aggressiv',
      name: 'Kälte & indirekter Ärger',
      description: 'Strafen mit Rückzug, kaltem Ton, weggelassener Wärme.',
      bands: [
        { min: 0, label: 'Direkt', tone: 'good', text: 'Du sprichst Ärger eher offen an, statt indirekt zu strafen. Das macht Konflikte klärbar.' },
        { min: 30, label: 'Teils indirekt', tone: 'watch', text: 'Manchmal zeigst du Ärger indirekt – Kälte, weggelassene Wärme, Spitzen. Das lässt dein Gegenüber im Unklaren.' },
        { min: 55, label: 'Stark indirekt', tone: 'alert', text: 'Du strafst häufig mit Kälte, Schweigen oder Entzug von Wärme, statt zu sagen, was ist. Das hält dein Gegenüber in Anspannung und Rätselraten.' },
      ],
    },
    {
      key: 'gaslighting',
      name: 'Wahrnehmung infrage stellen',
      description: 'Realität verdrehen, abwerten, Schuld umkehren.',
      bands: [
        { min: 0, label: 'Anerkennend', tone: 'good', text: 'Du stellst die Wahrnehmung deines Gegenübers kaum infrage. Das schützt sein/ihr Vertrauen in sich selbst.' },
        { min: 30, label: 'Teils abwertend', tone: 'watch', text: 'Manchmal drehst du Wahrnehmung um oder wertest ab (auch als „Witz"). Das kann Selbstzweifel säen.' },
        { min: 55, label: 'Deutlich', tone: 'alert', text: 'Du stellst regelmäßig die Wahrnehmung des/der anderen infrage oder wertest ab. Sätze wie „Dir ist alles egal" oder „das bildest du dir ein" untergraben das Selbstvertrauen deines Gegenübers.' },
      ],
    },
    {
      key: 'reparatur',
      name: 'Reparatur & Verantwortung',
      description: 'Gehst du auf Klärung zu und entschuldigst dich aufrichtig?',
      bands: [
        { min: 0, label: 'Hohe Reparaturbereitschaft', tone: 'good', text: 'Du gehst auf dein Gegenüber zu, entschuldigst dich aufrichtig und übernimmst Verantwortung. Das ist das Wichtigste – es fängt vieles auf.' },
        { min: 30, label: 'Reparatur ausbaufähig', tone: 'watch', text: 'Reparatur gelingt dir mal mehr, mal weniger. Gerade nach härteren Konflikten lohnt es, aktiv Klärung und eine echte Entschuldigung zu suchen.' },
        { min: 55, label: 'Wenig Reparatur', tone: 'alert', text: 'Nach Konflikten suchst du selten aufrichtige Klärung oder Entschuldigung. Ohne Reparatur bleiben Verletzungen stehen – und wiegen doppelt schwer, wenn zuvor Drohungen oder Härte im Spiel waren.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Insgesamt fair', tone: 'good', text: 'Dein Konfliktverhalten wirkt überwiegend fair, und du reparierst. Dass du diesen Test überhaupt machst, spricht für ehrliche Selbstreflexion – behalte diesen Blick.' },
    { min: 30, label: 'Einzelne Muster', tone: 'watch', text: 'Es zeigen sich einzelne Muster, die deinem Gegenüber wehtun können. Das macht dich nicht zu einem schlechten Menschen – aber es lohnt, genau hinzuschauen und an Reparatur zu arbeiten.' },
    { min: 55, label: 'Deutliche Muster', tone: 'alert', text: 'Mehrere Antworten deuten auf kontrollierende oder verletzende Muster hin. Das ehrlich zu sehen, ist ein mutiger erster Schritt. Sprich mit Echo darüber – und zieh, wenn möglich, Unterstützung hinzu, um etwas zu verändern.' },
  ],
  questions: [
    // Drohungen & Druck (+ Reparatur-Follow-ups)
    { id: 'ea1', type: 'scale', section: 'Drohungen & Druck', dimension: 'drohungen', scale: freq, flag: 'trennungsdrohung-haeufig', flagMin: 3, text: 'Ich habe meinem Partner mit Trennung gedroht, um Druck aufzubauen oder etwas zu erreichen.' },
    {
      id: 'ea2', type: 'single', section: 'Drohungen & Druck', dimension: 'reparatur',
      text: 'Falls ja: Habe ich danach von mir aus Klärung gesucht und mich aufrichtig entschuldigt?',
      options: [
        { label: 'Ich habe nie mit Trennung gedroht', value: 0 },
        { label: 'Ja, ich habe aktiv geklärt und mich aufrichtig entschuldigt', value: 0 },
        { label: 'Nur oberflächlich / halbherzig', value: 2 },
        { label: 'Nein, ich habe es so stehen lassen', value: 4, flag: 'trennungsdrohung-ohne-reparatur' },
      ],
    },
    {
      id: 'ea3', type: 'single', section: 'Drohungen & Druck', dimension: 'drohungen',
      text: 'Ich habe (auch im Streit) gedroht, mein Partner würde die Kinder nicht mehr sehen – oder mit Jugendamt/Sorgerecht Druck gemacht.',
      help: 'Diese Frage wiegt schwer. Ehrlichkeit dir selbst gegenüber ist hier besonders wichtig.',
      options: [
        { label: 'Nein, nie', value: 0 },
        { label: 'Ja, einmal im Streit gesagt', value: 3, flag: 'kindesentzug' },
        { label: 'Ja, mehrmals / ernsthaft', value: 4, flag: 'kindesentzug' },
      ],
    },
    {
      id: 'ea4', type: 'single', section: 'Drohungen & Druck', dimension: 'reparatur',
      text: 'Falls ja: Habe ich diese extreme Drohung danach aktiv aufgelöst und Klärung gesucht?',
      options: [
        { label: 'Ich habe nie mit den Kindern gedroht', value: 0 },
        { label: 'Ja, ich habe es aktiv aufgelöst und mich entschuldigt', value: 0 },
        { label: 'Nur oberflächlich', value: 2 },
        { label: 'Nein, ich habe es so stehen lassen', value: 4, flag: 'kindesentzug-ohne-reparatur' },
      ],
    },
    { id: 'ea5', type: 'scale', section: 'Drohungen & Druck', dimension: 'drohungen', scale: freq, text: 'Ich setze emotionale Erpressung ein („Nach allem, was ich für dich getan habe …", „Wenn du gehst, bist du schuld, wenn es mir schlecht geht").' },
    {
      id: 'ea6', type: 'single', section: 'Drohungen & Druck', dimension: 'drohungen',
      text: 'Ist es von meiner Seite schon zu körperlicher Gewalt oder Einschüchterung gekommen (schlagen, festhalten, Gegenstände/Türen, auf den Tisch hauen, drohende Gesten)?',
      options: [
        { label: 'Nein, nie', value: 0 },
        { label: 'In Ausnahmen / einmal', value: 3, flag: 'gewalt' },
        { label: 'Ja, wiederholt', value: 4, flag: 'gewalt' },
      ],
    },
    // Wie ich streite (emotionale Dominanz)
    { id: 'ea7', type: 'scale', section: 'Wie ich streite', dimension: 'dominanz', text: 'In Konflikten bin ich die emotional lautere oder intensivere Person.' },
    { id: 'ea8', type: 'scale', section: 'Wie ich streite', dimension: 'dominanz', text: 'Ich merke, dass mein Gegenüber von meiner Heftigkeit überfordert ist – und nachgibt oder verstummt.' },
    { id: 'ea9', type: 'scale', section: 'Wie ich streite', dimension: 'dominanz', scale: freq, text: 'Tränen, Wut oder Eskalation von mir verändern, wie ein Streit ausgeht.' },
    { id: 'ea10', type: 'scale', section: 'Wie ich streite', dimension: 'dominanz', scale: freq, text: 'Ich sage sinngemäß „Du verstehst mich einfach nicht" – und lasse mein Gegenüber damit stehen (Gespräch beendet, weggegangen).' },
    { id: 'ea11', type: 'scale', section: 'Wie ich streite', dimension: 'dominanz', text: 'Ich stelle widersprüchliche Erwartungen, bei denen mein Gegenüber nur verlieren kann (z. B. „Sag ehrlich deine Meinung" – und dann Vorwürfe für die Meinung).' },
    { id: 'ea12', type: 'scale', section: 'Wie ich streite', dimension: 'dominanz', scale: freq, text: 'Ich rede so lange oder so laut, bis mein Gegenüber aufgibt.' },
    { id: 'ea13', type: 'scale', section: 'Wie ich streite', dimension: 'dominanz', reverse: true, text: 'Wenn mein Partner einsilbig wird oder „mauert" (Grey Rock), kann ich nachvollziehen, dass das auch Selbstschutz vor meiner Heftigkeit sein könnte.' },
    // Kälte & indirekter Ärger
    { id: 'ea14', type: 'scale', section: 'Kälte & indirekter Ärger', dimension: 'passiv_aggressiv', scale: freq, text: 'Ich lasse Begrüßung oder ein liebes Wort bewusst weg, wenn ich verärgert bin.' },
    { id: 'ea15', type: 'scale', section: 'Kälte & indirekter Ärger', dimension: 'passiv_aggressiv', scale: freq, text: 'Ich rede in kaltem Ton, obwohl Wärme möglich wäre – damit mein Gegenüber es spürt.' },
    { id: 'ea16', type: 'scale', section: 'Kälte & indirekter Ärger', dimension: 'passiv_aggressiv', scale: freq, text: '„Schon okay, mach was du willst" – obwohl nichts okay ist: solche Sätze kenne ich von mir.' },
    { id: 'ea17', type: 'scale', section: 'Kälte & indirekter Ärger', dimension: 'passiv_aggressiv', scale: freq, text: 'Ich strafe mit Schweigen oder Rückzug, bis mein Gegenüber sich entschuldigt.' },
    { id: 'ea18', type: 'scale', section: 'Kälte & indirekter Ärger', dimension: 'passiv_aggressiv', scale: freq, text: 'Ich mache spitze Bemerkungen oder erledige etwas absichtlich schlampig, statt klar zu sagen, was mich stört.' },
    // Wahrnehmung & Schuld (Gaslighting/DARVO)
    { id: 'ea19', type: 'scale', section: 'Wahrnehmung & Schuld', dimension: 'gaslighting', scale: freq, text: 'Ich habe schon „Dir ist alles egal" (oder Ähnliches) gesagt, um mein Gegenüber zu treffen.' },
    { id: 'ea20', type: 'scale', section: 'Wahrnehmung & Schuld', dimension: 'gaslighting', scale: freq, text: 'Ich stelle die Wahrnehmung meines Partners infrage („das bildest du dir ein", „das habe ich nie gesagt").' },
    { id: 'ea21', type: 'scale', section: 'Wahrnehmung & Schuld', dimension: 'gaslighting', scale: freq, text: 'Wenn ich kritisiert werde, drehe ich es um, bis am Ende der/die andere sich entschuldigt.' },
    { id: 'ea22', type: 'scale', section: 'Wahrnehmung & Schuld', dimension: 'gaslighting', scale: freq, text: 'Ich verpacke Kritik als „Witz" oder „nur ehrlich" und werte damit ab.' },
    // Reparatur & Verantwortung (reverse: hoch = gute Reparatur = wenig Belastung)
    { id: 'ea23', type: 'scale', section: 'Reparatur & Verantwortung', dimension: 'reparatur', reverse: true, text: 'Nach einem Streit gehe ich von mir aus auf mein Gegenüber zu und suche Versöhnung.' },
    { id: 'ea24', type: 'scale', section: 'Reparatur & Verantwortung', dimension: 'reparatur', reverse: true, text: 'Wenn ich jemanden verletzt habe, entschuldige ich mich aufrichtig – so, dass ich die Verletzung wirklich anerkenne (nicht „Tut mir leid, ABER …").' },
    { id: 'ea25', type: 'scale', section: 'Reparatur & Verantwortung', dimension: 'reparatur', reverse: true, text: 'Ich übernehme Verantwortung für meinen Anteil, auch wenn ich mich im Recht fühle.' },
    { id: 'ea26', type: 'scale', section: 'Reparatur & Verantwortung', dimension: 'reparatur', reverse: true, text: 'Ich kann eine Grenze meines Gegenübers akzeptieren, ohne sie zu bestrafen.' },
    // Freitext
    { id: 'ea_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Beschreibe eine Situation, in der du im Nachhinein denkst: Da war ich unfair oder verletzend. Was ist passiert?' },
    { id: 'ea_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was möchtest du in Konflikten künftig anders machen?' },
  ],
  disclaimer:
    'Dieser Test ist keine Diagnose und kein Urteil über dich als Person. Er unterstützt ehrliche Selbstreflexion. Wenn du merkst, dass du anderen ernsthaft schadest, ist das Aufsuchen von Beratung oder Therapie ein Zeichen von Stärke.',
}
